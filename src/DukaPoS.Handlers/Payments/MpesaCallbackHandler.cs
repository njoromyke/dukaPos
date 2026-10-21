using DukaPoS.Domain;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
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

        if (payment.Status == PaymentStatus.Confirmed)
            return [];
        if (payment.Status == PaymentStatus.Failed && callback.ResultCode != 0)
            return [];
        if (!string.IsNullOrWhiteSpace(payment.MpesaMerchantRequestId) &&
            !string.Equals(payment.MpesaMerchantRequestId, callback.MerchantRequestId, StringComparison.Ordinal))
            throw new InvalidOperationException("M-Pesa callback merchant request ID does not match the STK request.");

        if (callback.ResultCode == 0)
        {
            if (callback.Amount.HasValue && callback.Amount.Value != payment.Amount)
                throw new InvalidOperationException("M-Pesa callback amount does not match the requested payment.");
            if (callback.PhoneNumber is not null && payment.MpesaPhone is not null &&
                NormalizePhone(callback.PhoneNumber) != NormalizePhone(payment.MpesaPhone))
                throw new InvalidOperationException("M-Pesa callback phone number does not match the STK request.");

            payment.Status = PaymentStatus.Confirmed;
            payment.MpesaResultCode = callback.ResultCode;
            payment.MpesaResultDescription = callback.ResultDesc;
            payment.MpesaCallbackReceivedAt = DateTimeOffset.UtcNow;
            payment.MpesaReceiptNumber = callback.MpesaReceiptNumber;
            payment.MpesaTransactionId = callback.MerchantRequestId;
            payment.ConfirmedAt = DateTimeOffset.UtcNow;
            session.Store(payment);

            var sale = await session.LoadAsync<Sale>(payment.SaleId)
                ?? throw new InvalidOperationException("Sale not found for this payment.");
            var confirmedPayments = await session.Query<Payment>()
                .Where(p => p.SaleId == payment.SaleId && p.Status == PaymentStatus.Confirmed && p.Id != payment.Id)
                .ToListAsync();
            var fullyPaid = confirmedPayments.Sum(p => p.Amount) + payment.Amount >= sale.GrandTotal;

            return fullyPaid
                ? [
                    new PaymentConfirmedEvent(payment.Id, payment.SaleId, "Mpesa", payment.Amount),
                    new CompleteSaleCommand(payment.SaleId),
                ]
                : [new PaymentConfirmedEvent(payment.Id, payment.SaleId, "Mpesa", payment.Amount)];
        }

        payment.Status = PaymentStatus.Failed;
        payment.MpesaResultCode = callback.ResultCode;
        payment.MpesaResultDescription = callback.ResultDesc;
        payment.MpesaCallbackReceivedAt = DateTimeOffset.UtcNow;
        session.Store(payment);

        return [new PaymentFailedEvent(payment.Id, payment.SaleId, callback.ResultDesc)];
    }

    private static string NormalizePhone(string phone)
    {
        var value = new string(phone.Where(char.IsDigit).ToArray());
        return value.StartsWith("0", StringComparison.Ordinal) ? "254" + value[1..] : value;
    }
}
