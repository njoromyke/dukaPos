namespace DukaPoS.Domain.Payments;

public class MpesaCallbackRoute
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Guid SaleId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class MpesaCallbackLog
{
    public Guid Id { get; set; }
    public string? TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public string? CheckoutRequestId { get; set; }
    public string? MerchantRequestId { get; set; }
    public int? ResultCode { get; set; }
    public string ResultDescription { get; set; } = string.Empty;
    public string? MpesaReceiptNumber { get; set; }
    public string ProcessingStatus { get; set; } = "Received";
    public string? Error { get; set; }
    public string RawPayload { get; set; } = string.Empty;
    public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ProcessedAt { get; set; }
}
