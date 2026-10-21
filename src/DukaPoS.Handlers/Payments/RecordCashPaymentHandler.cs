using DukaPoS.Domain;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Payments;
using Marten;

namespace DukaPoS.Handlers.Payments;

public static class RecordCashPaymentHandler
{
    public static async Task<CashPaymentResult> Handle(
        RecordCashPaymentCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status is not (SaleStatus.Active or SaleStatus.AwaitingPayment))
            throw new InvalidOperationException($"Cannot accept payment for a sale in {sale.Status} status.");
        if (command.AmountTendered <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");

        var confirmedPayments = await session.Query<Payment>()
            .Where(p => p.SaleId == sale.Id && p.Status == PaymentStatus.Confirmed)
            .ToListAsync();
        var previouslyPaid = confirmedPayments.Sum(p => p.Amount);
        var balance = Math.Max(0, sale.GrandTotal - previouslyPaid);
        if (balance == 0)
            throw new InvalidOperationException("This sale is already fully paid.");

        var applied = Math.Min(command.AmountTendered, balance);
        var change = command.AmountTendered - applied;
        var remaining = balance - applied;

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            SaleId = command.SaleId,
            Method = PaymentMethod.Cash,
            Amount = applied,
            AmountTendered = command.AmountTendered,
            ChangeGiven = change,
            Status = PaymentStatus.Confirmed,
            ConfirmedAt = DateTimeOffset.UtcNow,
        };

        session.Store(payment);
        if (remaining > 0)
        {
            sale.Status = SaleStatus.AwaitingPayment;
            session.Store(sale);
        }

        return new CashPaymentResult(payment.Id, change, remaining == 0 ? "Confirmed" : "PartiallyPaid", applied, remaining, remaining == 0);
    }
}
