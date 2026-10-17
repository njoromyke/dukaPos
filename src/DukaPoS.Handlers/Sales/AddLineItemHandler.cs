using DukaPoS.Domain;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class AddLineItemHandler
{
    public static async Task<Sale> Handle(AddLineItemCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status != SaleStatus.Active)
            throw new InvalidOperationException("Sale is not active");

        var lineItem = new SaleLineItem
        {
            Id = Guid.NewGuid(),
            ProductId = command.ProductId,
            ProductName = command.ProductName,
            Sku = command.Sku,
            Quantity = command.Quantity,
            Unit = command.Unit,
            UnitPrice = command.UnitPrice,
            VatRatePercent = command.VatRatePercent,
        };

        sale.AddLineItem(lineItem);
        session.Store(sale);
        return sale;
    }
}
