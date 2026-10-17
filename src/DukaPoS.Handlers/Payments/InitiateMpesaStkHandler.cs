using DukaPoS.Domain;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Infrastructure.Mpesa;
using DukaPoS.Messages.Payments;
using Marten;

namespace DukaPoS.Handlers.Payments;

public static class InitiateMpesaStkHandler
{
    public static async Task<MpesaStkResult> Handle(
        InitiateMpesaStkCommand command,
        IDocumentSession session,
        IMpesaService mpesaService)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        sale.Status = SaleStatus.AwaitingPayment;
        session.Store(sale);

        var stkResponse = await mpesaService.InitiateStkPushAsync(
            command.PhoneNumber,
            command.Amount,
            sale.SaleNumber);

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            SaleId = command.SaleId,
            Method = PaymentMethod.Mpesa,
            Amount = command.Amount,
            MpesaPhone = command.PhoneNumber,
            CheckoutRequestId = stkResponse.CheckoutRequestId,
            Status = PaymentStatus.Pending,
        };

        session.Store(payment);

        return new MpesaStkResult(
            stkResponse.CheckoutRequestId,
            stkResponse.MerchantRequestId,
            stkResponse.ResponseDescription);
    }
}
