using DukaPoS.Domain.Enumerations;

namespace DukaPoS.Domain.Fiscal;

public class FiscalInvoice
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public string? ScuNumber { get; set; }
    public string? CuSerial { get; set; }
    public string? QrCodeData { get; set; }
    public FiscalSubmissionStatus SubmissionStatus { get; set; } = FiscalSubmissionStatus.Pending;
    public DateTimeOffset? SubmittedAt { get; set; }
    public string? KraResponse { get; set; }
    public int RetryCount { get; set; }
    public byte[]? ReceiptData { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

