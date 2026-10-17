namespace DukaPoS.Messages.Payments;

public record RecordCashPaymentCommand(Guid SaleId, decimal AmountTendered);
public record CashPaymentResult(Guid PaymentId, decimal Change, string Status);
public record InitiateMpesaStkCommand(Guid SaleId, string PhoneNumber, decimal Amount);
public record MpesaStkResult(string CheckoutRequestId, string MerchantRequestId, string ResponseDescription);
public record MpesaCallbackEvent(string CheckoutRequestId, string MerchantRequestId, int ResultCode, string ResultDesc, string? MpesaReceiptNumber, decimal? Amount, string? PhoneNumber, DateTimeOffset? TransactionDate);
