using DukaPoS.Domain;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Inventory;
using DukaPoS.Messages.Sales;
using Marten;
using Wolverine;

namespace DukaPoS.Handlers.Inventory;

public static class DeductStockOnSaleHandler
{
    public static async Task Handle(SaleCompletedEvent @event, IDocumentSession session, IMessageBus bus)
    {
        var sale = await session.LoadAsync<Sale>(@event.SaleId);
        if (sale == null) return;

        foreach (var lineItem in sale.LineItems)
        {
            var stockLevel = await session.Query<StockLevel>()
                .FirstOrDefaultAsync(sl => sl.ProductId == lineItem.ProductId && sl.BranchId == @event.BranchId);

            if (stockLevel != null)
            {
                stockLevel.Quantity -= lineItem.Quantity;
                stockLevel.UpdatedAt = DateTimeOffset.UtcNow;
                session.Store(stockLevel);

                if (stockLevel.Quantity <= stockLevel.ReorderLevel)
                {
                    var product = await session.LoadAsync<Product>(lineItem.ProductId);
                    await bus.PublishAsync(new StockDepletedEvent(
                        lineItem.ProductId, @event.BranchId,
                        product?.Name ?? lineItem.ProductName,
                        stockLevel.Quantity, stockLevel.ReorderLevel));
                }
            }

            var movement = new StockMovement
            {
                Id = Guid.NewGuid(),
                ProductId = lineItem.ProductId,
                BranchId = @event.BranchId,
                QuantityChange = -lineItem.Quantity,
                Reason = StockMovementReason.Sale,
                ReferenceId = sale.Id,
                ReferenceType = "Sale",
                CreatedBy = @event.CashierId,
            };
            session.Store(movement);
        }
    }
}
