using DukaPoS.Domain.Enumerations;

namespace DukaPoS.Domain.Payments;

public class Payment
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public decimal? AmountTendered { get; set; }
    public decimal? ChangeGiven { get; set; }
    public string? MpesaReceiptNumber { get; set; }
    public string? MpesaPhone { get; set; }
    public string? MpesaTransactionId { get; set; }
    public string? CheckoutRequestId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ConfirmedAt { get; set; }
}
