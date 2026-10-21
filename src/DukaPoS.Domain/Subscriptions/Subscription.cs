namespace DukaPoS.Domain.Subscriptions;

public class Subscription
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid PackageId { get; set; }
    public PackageTier Tier { get; set; }
    public BillingCycle BillingCycle { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;
    public decimal PricePerCycle { get; set; }
    public DateTimeOffset StartDate { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CurrentPeriodStart { get; set; }
    public DateTimeOffset? CurrentPeriodEnd { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int GracePeriodDays { get; set; } = 3;
    public DateTimeOffset? CancelledAt { get; set; }
    public DateTimeOffset? LastPaymentAt { get; set; }
    public string? LastPaymentReference { get; set; }
    public List<string> Features { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset AdvancePeriodEnd(DateTimeOffset from)
    {
        return BillingCycle switch
        {
            BillingCycle.Monthly => from.AddMonths(1),
            BillingCycle.BiMonthly => from.AddMonths(2),
            BillingCycle.Quarterly => from.AddMonths(3),
            BillingCycle.SemiAnnual => from.AddMonths(6),
            BillingCycle.Annual => from.AddMonths(12),
            _ => from,
        };
    }
}
