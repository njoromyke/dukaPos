using DukaPoS.Domain;
using DukaPoS.Domain.Inventory;
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

        var stockLevel = await session.Query<StockLevel>()
            .FirstOrDefaultAsync(s => s.ProductId == command.ProductId && s.BranchId == sale.BranchId);

        var existingQty = sale.LineItems
            .Where(li => li.ProductId == command.ProductId)
            .Sum(li => li.Quantity);

        var requestedTotal = existingQty + command.Quantity;

        if (stockLevel == null || stockLevel.Quantity < requestedTotal)
        {
            var available = stockLevel?.Quantity ?? 0;
            throw new InvalidOperationException(
                $"Insufficient stock. Available: {available}, requested: {requestedTotal}");
        }

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
