using DukaPoS.Domain;
using DukaPoS.Domain.Subscriptions;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Subscriptions;
using Marten;
using Wolverine;

namespace DukaPoS.Handlers.Subscriptions;

public static class CheckExpiredSubscriptionsHandler
{
    public static async Task Handle(CheckExpiredSubscriptionsCommand command, IDocumentStore store, IMessageBus bus)
    {
        await using var session = store.LightweightSession();
        var now = DateTimeOffset.UtcNow;

        var activeSubscriptions = await session.Query<Subscription>()
            .Where(s => s.Status == SubscriptionStatus.Active
                || s.Status == SubscriptionStatus.Trial
                || s.Status == SubscriptionStatus.PastDue)
            .ToListAsync();

        foreach (var sub in activeSubscriptions)
        {
            if (sub.ExpiresAt == null) continue;

            var tenant = await session.LoadAsync<Tenant>(sub.TenantId);
            if (tenant == null) continue;

            var daysRemaining = (sub.ExpiresAt.Value - now).Days;

            if (daysRemaining <= 0 - sub.GracePeriodDays)
            {
                sub.Status = SubscriptionStatus.Expired;
                sub.UpdatedAt = now;
                session.Store(sub);

                await bus.PublishAsync(new SubscriptionExpiredEvent(
                    sub.TenantId, sub.Id, tenant.Name, tenant.Email));
            }
            else if (daysRemaining <= 0)
            {
                if (sub.Status != SubscriptionStatus.PastDue)
                {
                    sub.Status = SubscriptionStatus.PastDue;
                    sub.UpdatedAt = now;
                    session.Store(sub);
                }
            }
            else if (daysRemaining is <= 7 and > 0)
            {
                await bus.PublishAsync(new SubscriptionExpiringSoonEvent(
                    sub.TenantId, sub.Id, tenant.Name, tenant.Email,
                    sub.ExpiresAt.Value, daysRemaining));
            }
        }

        await session.SaveChangesAsync();
    }
}
