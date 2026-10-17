using DukaPoS.Domain.Enumerations;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Payments;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Payments;

public static class RecordCashPaymentHandler
{
    public static async Task<(CashPaymentResult, CompleteSaleCommand)> Handle(
        RecordCashPaymentCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (command.AmountTendered < sale.GrandTotal)
            throw new InvalidOperationException("Insufficient amount tendered");

        var change = command.AmountTendered - sale.GrandTotal;

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            SaleId = command.SaleId,
            Method = PaymentMethod.Cash,
            Amount = sale.GrandTotal,
            AmountTendered = command.AmountTendered,
            ChangeGiven = change,
            Status = PaymentStatus.Confirmed,
            ConfirmedAt = DateTimeOffset.UtcNow,
        };

        session.Store(payment);

        var result = new CashPaymentResult(payment.Id, change, "Confirmed");
        var completeSale = new CompleteSaleCommand(command.SaleId);

        return (result, completeSale);
    }
}
