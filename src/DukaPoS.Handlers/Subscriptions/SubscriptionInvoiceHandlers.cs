using DukaPoS.Domain;
using DukaPoS.Domain.Subscriptions;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Subscriptions;
using Marten;

namespace DukaPoS.Handlers.Subscriptions;

public static class SubscriptionInvoiceFactory
{
    public static SubscriptionInvoice Create(Subscription subscription, DateTimeOffset periodStart, DateTimeOffset issuedAt)
    {
        DateTimeOffset? periodEnd = subscription.BillingCycle == BillingCycle.Lifetime
            ? null
            : subscription.AdvancePeriodEnd(periodStart);

        return new SubscriptionInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = subscription.TenantId,
            SubscriptionId = subscription.Id,
            InvoiceNumber = $"INV-{periodStart:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant(),
            IssuedAt = issuedAt,
            DueAt = periodStart.AddDays(1).AddTicks(-1),
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            Amount = subscription.PricePerCycle,
            Status = SubscriptionInvoiceStatus.Unpaid,
        };
    }
}

public static class GetSubscriptionInvoicesHandler
{
    public static async Task<IReadOnlyList<SubscriptionInvoiceDto>> Handle(GetSubscriptionInvoicesQuery query, IDocumentStore store)
    {
        await using var session = store.LightweightSession();
        var invoices = await session.Query<SubscriptionInvoice>()
            .OrderByDescending(invoice => invoice.IssuedAt)
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        foreach (var invoice in invoices.Where(invoice => invoice.Status == SubscriptionInvoiceStatus.Unpaid && invoice.DueAt < now))
        {
            invoice.Status = SubscriptionInvoiceStatus.Overdue;
            session.Store(invoice);
        }

        if (invoices.Any(invoice => invoice.Status == SubscriptionInvoiceStatus.Overdue && invoice.DueAt < now))
            await session.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(query.Status)
            && Enum.TryParse<SubscriptionInvoiceStatus>(query.Status, true, out var status))
            invoices = invoices.Where(invoice => invoice.Status == status).ToList();

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);
        var pageInvoices = invoices.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var tenants = new Dictionary<Guid, Tenant?>();
        foreach (var tenantId in pageInvoices.Select(invoice => invoice.TenantId).Distinct())
            tenants[tenantId] = await session.LoadAsync<Tenant>(tenantId);

        return pageInvoices.Select(invoice => new SubscriptionInvoiceDto(
            invoice.Id,
            invoice.TenantId,
            tenants[invoice.TenantId]?.Name ?? "Unknown tenant",
            invoice.SubscriptionId,
            invoice.InvoiceNumber,
            invoice.IssuedAt,
            invoice.DueAt,
            invoice.PeriodStart,
            invoice.PeriodEnd,
            invoice.Amount,
            invoice.Status,
            invoice.PaidAt,
            invoice.PaymentMethod,
            invoice.TransactionReference,
            invoice.Notes)).ToList();
    }
}

public static class GetAdminSubscriptionsHandler
{
    public static async Task<IReadOnlyList<AdminSubscriptionDto>> Handle(GetAdminSubscriptionsQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();
        var subscriptions = await session.Query<Subscription>()
            .OrderByDescending(item => item.StartDate)
            .ToListAsync();
        var tenantIds = subscriptions.Select(item => item.TenantId).Distinct().ToList();
        var tenants = new Dictionary<Guid, Tenant?>();
        foreach (var tenantId in tenantIds)
            tenants[tenantId] = await session.LoadAsync<Tenant>(tenantId);

        var result = new List<AdminSubscriptionDto>();
        foreach (var subscription in subscriptions)
        {
            var package = await session.LoadAsync<Package>(subscription.PackageId);
            var tenant = tenants[subscription.TenantId];
            result.Add(new AdminSubscriptionDto(
                subscription.Id,
                subscription.TenantId,
                tenant?.Name ?? "Unknown tenant",
                tenant?.Slug ?? string.Empty,
                subscription.PackageId,
                package?.Name ?? "Unknown package",
                subscription.BillingCycle,
                subscription.Status,
                subscription.PricePerCycle,
                subscription.StartDate,
                subscription.CurrentPeriodEnd,
                subscription.ExpiresAt));
        }
        return result;
    }
}

public static class MarkSubscriptionInvoicePaidHandler
{
    public static async Task<SubscriptionInvoiceDto> Handle(
        MarkSubscriptionInvoicePaidCommand command,
        IDocumentStore store)
    {
        if (string.IsNullOrWhiteSpace(command.PaymentMethod))
            throw new InvalidOperationException("Payment method is required.");

        await using var session = store.LightweightSession();
        var invoice = await session.LoadAsync<SubscriptionInvoice>(command.InvoiceId)
            ?? throw new InvalidOperationException("Invoice not found.");
        if (invoice.Status == SubscriptionInvoiceStatus.Paid)
            throw new InvalidOperationException("Invoice is already paid.");
        if (invoice.Status == SubscriptionInvoiceStatus.Void)
            throw new InvalidOperationException("A void invoice cannot be paid.");

        var subscription = await session.LoadAsync<Subscription>(invoice.SubscriptionId)
            ?? throw new InvalidOperationException("Subscription not found.");
        var tenant = await session.LoadAsync<Tenant>(invoice.TenantId);
        var now = DateTimeOffset.UtcNow;

        invoice.Status = SubscriptionInvoiceStatus.Paid;
        invoice.PaidAt = now;
        invoice.PaymentMethod = command.PaymentMethod.Trim();
        invoice.TransactionReference = command.TransactionReference?.Trim();
        invoice.Notes = command.Notes?.Trim();
        subscription.LastPaymentAt = now;
        subscription.LastPaymentReference = invoice.TransactionReference;
        subscription.Status = subscription.BillingCycle == BillingCycle.Lifetime
            ? SubscriptionStatus.LifetimeActive
            : SubscriptionStatus.Active;
        subscription.CurrentPeriodStart = invoice.PeriodStart;
        subscription.CurrentPeriodEnd = invoice.PeriodEnd;
        subscription.ExpiresAt = invoice.PeriodEnd;
        subscription.UpdatedAt = now;

        session.Store(invoice);
        session.Store(subscription);
        session.Store(new SubscriptionPayment
        {
            Id = Guid.NewGuid(),
            SubscriptionId = subscription.Id,
            TenantId = subscription.TenantId,
            Amount = invoice.Amount,
            PaymentMethod = invoice.PaymentMethod,
            TransactionReference = invoice.TransactionReference,
            PeriodStart = invoice.PeriodStart,
            PeriodEnd = invoice.PeriodEnd ?? invoice.PeriodStart,
            PaidAt = now,
            Notes = invoice.Notes,
        });

        if (invoice.PeriodEnd.HasValue && subscription.BillingCycle != BillingCycle.Lifetime)
        {
            var nextInvoiceExists = await session.Query<SubscriptionInvoice>()
                .AnyAsync(item => item.SubscriptionId == subscription.Id && item.PeriodStart == invoice.PeriodEnd.Value);
            if (!nextInvoiceExists)
                session.Store(SubscriptionInvoiceFactory.Create(subscription, invoice.PeriodEnd.Value, now));
        }

        await session.SaveChangesAsync();
        return new SubscriptionInvoiceDto(
            invoice.Id,
            invoice.TenantId,
            tenant?.Name ?? "Unknown tenant",
            invoice.SubscriptionId,
            invoice.InvoiceNumber,
            invoice.IssuedAt,
            invoice.DueAt,
            invoice.PeriodStart,
            invoice.PeriodEnd,
            invoice.Amount,
            invoice.Status,
            invoice.PaidAt,
            invoice.PaymentMethod,
            invoice.TransactionReference,
            invoice.Notes);
    }
}
