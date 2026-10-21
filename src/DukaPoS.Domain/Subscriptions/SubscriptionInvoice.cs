namespace DukaPoS.Domain.Subscriptions;

public class SubscriptionInvoice
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SubscriptionId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTimeOffset IssuedAt { get; set; }
    public DateTimeOffset DueAt { get; set; }
    public DateTimeOffset PeriodStart { get; set; }
    public DateTimeOffset? PeriodEnd { get; set; }
    public decimal Amount { get; set; }
    public SubscriptionInvoiceStatus Status { get; set; } = SubscriptionInvoiceStatus.Unpaid;
    public DateTimeOffset? PaidAt { get; set; }
    public string? PaymentMethod { get; set; }
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
}
