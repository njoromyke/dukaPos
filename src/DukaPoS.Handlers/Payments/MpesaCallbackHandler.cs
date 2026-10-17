using DukaPoS.Domain.Payments;
using DukaPoS.Messages.Payments;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Payments;

public static class MpesaCallbackHandler
{
    public static async Task<object[]> Handle(MpesaCallbackEvent callback, IDocumentSession session)
    {
        var payment = await session.Query<Payment>()
            .FirstOrDefaultAsync(p => p.CheckoutRequestId == callback.CheckoutRequestId)
            ?? throw new InvalidOperationException("Payment not found for this callback");

        if (callback.ResultCode == 0)
        {
            payment.Status = PaymentStatus.Confirmed;
            payment.MpesaReceiptNumber = callback.MpesaReceiptNumber;
            payment.MpesaTransactionId = callback.MerchantRequestId;
            payment.ConfirmedAt = DateTimeOffset.UtcNow;
            session.Store(payment);

            return
            [
                new PaymentConfirmedEvent(payment.Id, payment.SaleId, "Mpesa", payment.Amount),
                new CompleteSaleCommand(payment.SaleId),
            ];
        }

        payment.Status = PaymentStatus.Failed;
        session.Store(payment);

        return [new PaymentFailedEvent(payment.Id, payment.SaleId, callback.ResultDesc)];
    }
}
