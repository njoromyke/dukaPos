using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class UpdateLineItemQuantityHandler
{
    public static async Task<Sale> Handle(UpdateLineItemQuantityCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status != SaleStatus.Active)
            throw new InvalidOperationException("Sale is not active");

        sale.UpdateLineItemQuantity(command.LineItemId, command.NewQuantity);
        session.Store(sale);
        return sale;
    }
}
