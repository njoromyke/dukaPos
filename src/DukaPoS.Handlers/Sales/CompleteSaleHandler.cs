using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;
using Wolverine;

namespace DukaPoS.Handlers.Sales;

public static class CompleteSaleHandler
{
    public static async Task<SaleCompletedEvent> Handle(CompleteSaleCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status is not (SaleStatus.Active or SaleStatus.AwaitingPayment))
            throw new InvalidOperationException($"Cannot complete sale in {sale.Status} status");

        sale.Status = SaleStatus.Completed;
        sale.CompletedAt = DateTimeOffset.UtcNow;
        session.Store(sale);

        return new SaleCompletedEvent(sale.Id, sale.BranchId, sale.CashierId, sale.GrandTotal, sale.CompletedAt.Value);
    }
}
