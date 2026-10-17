using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Payments;
using Marten;

namespace DukaPoS.Handlers.Payments;

public static class InitiateMpesaStkHandler
{
    public static async Task<MpesaStkResult> Handle(InitiateMpesaStkCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        sale.Status = Domain.Sales.SaleStatus.AwaitingPayment;
        session.Store(sale);

        var checkoutRequestId = $"ws_{Guid.NewGuid():N}";
        var merchantRequestId = $"mr_{Guid.NewGuid():N}";

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            SaleId = command.SaleId,
            Method = PaymentMethod.Mpesa,
            Amount = command.Amount,
            MpesaPhone = command.PhoneNumber,
            CheckoutRequestId = checkoutRequestId,
            Status = PaymentStatus.Pending,
        };

        session.Store(payment);

        return new MpesaStkResult(checkoutRequestId, merchantRequestId, "STK push sent successfully");
    }
}
