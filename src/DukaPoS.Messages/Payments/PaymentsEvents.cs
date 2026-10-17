namespace DukaPoS.Messages.Payments;

public record PaymentConfirmedEvent(Guid PaymentId, Guid SaleId, string Method, decimal Amount);
public record PaymentFailedEvent(Guid PaymentId, Guid SaleId, string Reason);
