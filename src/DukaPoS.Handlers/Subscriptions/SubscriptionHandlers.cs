using DukaPoS.Domain;
using DukaPoS.Domain.Subscriptions;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Subscriptions;
using Marten;

namespace DukaPoS.Handlers.Subscriptions;

public static class CreateSubscriptionHandler
{
    public static async Task<SubscriptionDto> Handle(CreateSubscriptionCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var package = await session.LoadAsync<Package>(command.PackageId)
            ?? throw new InvalidOperationException("Package not found.");

        if (!package.IsActive)
            throw new InvalidOperationException("Package is no longer available.");

        if (await session.LoadAsync<Tenant>(command.TenantId) is null)
            throw new InvalidOperationException("Tenant not found.");

        var existing = await session.Query<Subscription>()
            .FirstOrDefaultAsync(s => s.TenantId == command.TenantId
                && s.Status != SubscriptionStatus.Expired
                && s.Status != SubscriptionStatus.Cancelled);

        if (existing != null)
            throw new InvalidOperationException("Tenant already has an active subscription. Cancel or let it expire first.");

        var startDate = command.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var now = new DateTimeOffset(startDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var isLifetime = command.BillingCycle == BillingCycle.Lifetime;
        var pricePerCycle = isLifetime
            ? package.LifetimePrice ?? package.MonthlyPrice
            : package.MonthlyPrice * (int)command.BillingCycle;

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            TenantId = command.TenantId,
            PackageId = package.Id,
            Tier = package.Tier,
            BillingCycle = command.BillingCycle,
            Status = isLifetime ? SubscriptionStatus.LifetimeActive : SubscriptionStatus.Active,
            PricePerCycle = pricePerCycle,
            StartDate = now,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = isLifetime ? null : subscription_PeriodEnd(command.BillingCycle, now),
            ExpiresAt = isLifetime ? null : subscription_PeriodEnd(command.BillingCycle, now),
            Features = package.Features,
        };

        session.Store(subscription);
        session.Store(SubscriptionInvoiceFactory.Create(subscription, now, now));
        await session.SaveChangesAsync();

        return ToDto(subscription, package.Name);
    }

    private static DateTimeOffset subscription_PeriodEnd(BillingCycle cycle, DateTimeOffset from) =>
        cycle switch
        {
            BillingCycle.Monthly => from.AddMonths(1),
            BillingCycle.BiMonthly => from.AddMonths(2),
            BillingCycle.Quarterly => from.AddMonths(3),
            BillingCycle.SemiAnnual => from.AddMonths(6),
            BillingCycle.Annual => from.AddMonths(12),
            _ => from,
        };

    internal static SubscriptionDto ToDto(Subscription s, string packageName, List<string>? features = null) =>
        new(s.Id, s.TenantId, s.PackageId, packageName, s.Tier, s.BillingCycle,
            s.Status, s.PricePerCycle, s.StartDate, s.CurrentPeriodStart,
            s.CurrentPeriodEnd, s.ExpiresAt, features ?? s.Features, s.LastPaymentAt);
}

public static class CreateTrialSubscriptionHandler
{
    public static async Task<SubscriptionDto> Handle(CreateTrialSubscriptionCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var beginnerPackage = await session.Query<Package>()
            .FirstOrDefaultAsync(p => p.Tier == PackageTier.Beginner && p.IsActive);

        if (beginnerPackage == null)
            throw new InvalidOperationException("No active Beginner package found for trial.");

        var now = DateTimeOffset.UtcNow;
        var trialEnd = now.AddDays(command.TrialDays);

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            TenantId = command.TenantId,
            PackageId = beginnerPackage.Id,
            Tier = beginnerPackage.Tier,
            BillingCycle = BillingCycle.Monthly,
            Status = SubscriptionStatus.Trial,
            PricePerCycle = 0,
            StartDate = now,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = trialEnd,
            ExpiresAt = trialEnd,
            Features = beginnerPackage.Features,
        };

        session.Store(subscription);
        await session.SaveChangesAsync();

        return CreateSubscriptionHandler.ToDto(subscription, beginnerPackage.Name);
    }
}

public static class RenewSubscriptionHandler
{
    public static async Task<SubscriptionDto> Handle(RenewSubscriptionCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var subscription = await session.LoadAsync<Subscription>(command.SubscriptionId)
            ?? throw new InvalidOperationException("Subscription not found.");

        if (subscription.BillingCycle == BillingCycle.Lifetime)
            throw new InvalidOperationException("Lifetime subscriptions do not need renewal.");

        var package = await session.LoadAsync<Package>(subscription.PackageId)
            ?? throw new InvalidOperationException("Package not found.");

        var now = DateTimeOffset.UtcNow;
        var periodStart = subscription.CurrentPeriodEnd ?? now;
        var periodEnd = subscription.AdvancePeriodEnd(periodStart);

        subscription.CurrentPeriodStart = periodStart;
        subscription.CurrentPeriodEnd = periodEnd;
        subscription.ExpiresAt = periodEnd;
        subscription.Status = SubscriptionStatus.Active;
        subscription.LastPaymentAt = now;
        subscription.LastPaymentReference = command.TransactionReference;
        subscription.UpdatedAt = now;

        var payment = new SubscriptionPayment
        {
            Id = Guid.NewGuid(),
            SubscriptionId = subscription.Id,
            TenantId = subscription.TenantId,
            Amount = command.Amount,
            PaymentMethod = command.PaymentMethod,
            TransactionReference = command.TransactionReference,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            PaidAt = now,
        };

        session.Store(subscription);
        session.Store(payment);
        await session.SaveChangesAsync();

        return CreateSubscriptionHandler.ToDto(subscription, package.Name);
    }
}

public static class CancelSubscriptionHandler
{
    public static async Task<SubscriptionDto> Handle(CancelSubscriptionCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var subscription = await session.LoadAsync<Subscription>(command.SubscriptionId)
            ?? throw new InvalidOperationException("Subscription not found.");

        var package = await session.LoadAsync<Package>(subscription.PackageId);

        subscription.Status = SubscriptionStatus.Cancelled;
        subscription.CancelledAt = DateTimeOffset.UtcNow;
        subscription.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(subscription);
        await session.SaveChangesAsync();

        return CreateSubscriptionHandler.ToDto(subscription, package?.Name ?? "Unknown", package?.Features);
    }
}

public static class ChangePackageHandler
{
    public static async Task<SubscriptionDto> Handle(ChangePackageCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var subscription = await session.LoadAsync<Subscription>(command.SubscriptionId)
            ?? throw new InvalidOperationException("Subscription not found.");

        var newPackage = await session.LoadAsync<Package>(command.NewPackageId)
            ?? throw new InvalidOperationException("New package not found.");

        if (!newPackage.IsActive)
            throw new InvalidOperationException("Target package is not available.");

        var isLifetime = command.NewBillingCycle == BillingCycle.Lifetime;
        var pricePerCycle = isLifetime
            ? newPackage.LifetimePrice ?? newPackage.MonthlyPrice
            : newPackage.MonthlyPrice * (int)command.NewBillingCycle;

        subscription.PackageId = newPackage.Id;
        subscription.Tier = newPackage.Tier;
        subscription.BillingCycle = command.NewBillingCycle;
        subscription.PricePerCycle = pricePerCycle;
        subscription.Features = newPackage.Features;
        subscription.Status = isLifetime ? SubscriptionStatus.LifetimeActive : subscription.Status;
        subscription.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(subscription);
        await session.SaveChangesAsync();

        return CreateSubscriptionHandler.ToDto(subscription, newPackage.Name);
    }
}

public static class GetSubscriptionHandler
{
    public static async Task<SubscriptionDto?> Handle(GetSubscriptionQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();

        var subscription = await session.Query<Subscription>()
            .FirstOrDefaultAsync(s => s.TenantId == query.TenantId
                && s.Status != SubscriptionStatus.Cancelled);

        if (subscription == null)
            return null;

        var package = await session.LoadAsync<Package>(subscription.PackageId);

        return CreateSubscriptionHandler.ToDto(subscription, package?.Name ?? "Unknown");
    }
}

public static class GetSubscriptionPaymentsHandler
{
    public static async Task<IReadOnlyList<SubscriptionPaymentDto>> Handle(
        GetSubscriptionPaymentsQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();

        var payments = await session.Query<SubscriptionPayment>()
            .Where(p => p.TenantId == query.TenantId)
            .OrderByDescending(p => p.PaidAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return payments.Select(p => new SubscriptionPaymentDto(
            p.Id, p.Amount, p.PaymentMethod, p.TransactionReference,
            p.PeriodStart, p.PeriodEnd, p.PaidAt, p.Notes)).ToList();
    }
}
