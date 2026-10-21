namespace DukaPoS.Domain.Subscriptions;

public class SubscriptionPayment
{
    public Guid Id { get; set; }
    public Guid SubscriptionId { get; set; }
    public Guid TenantId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = default!;
    public string? TransactionReference { get; set; }
    public DateTimeOffset PeriodStart { get; set; }
    public DateTimeOffset PeriodEnd { get; set; }
    public DateTimeOffset PaidAt { get; set; } = DateTimeOffset.UtcNow;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
