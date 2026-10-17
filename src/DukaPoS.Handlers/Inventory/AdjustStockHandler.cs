using DukaPoS.Domain.Enumerations;
using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class AdjustStockHandler
{
    public static async Task<StockDepletedEvent?> Handle(AdjustStockCommand command, IDocumentSession session)
    {
        var stockLevel = await session.Query<StockLevel>()
            .FirstOrDefaultAsync(sl => sl.ProductId == command.ProductId && sl.BranchId == command.BranchId);

        if (stockLevel == null)
        {
            stockLevel = new StockLevel
            {
                Id = Guid.NewGuid(),
                ProductId = command.ProductId,
                BranchId = command.BranchId,
                Quantity = 0,
                ReorderLevel = 10,
            };
        }

        stockLevel.Quantity += command.QuantityChange;
        stockLevel.UpdatedAt = DateTimeOffset.UtcNow;
        session.Store(stockLevel);

        var movement = new StockMovement
        {
            Id = Guid.NewGuid(),
            ProductId = command.ProductId,
            BranchId = command.BranchId,
            QuantityChange = command.QuantityChange,
            Reason = StockMovementReason.Adjustment,
            Notes = command.Notes,
            CreatedBy = command.AdjustedBy,
        };
        session.Store(movement);

        if (stockLevel.Quantity <= stockLevel.ReorderLevel)
        {
            var product = await session.LoadAsync<Product>(command.ProductId);
            return new StockDepletedEvent(command.ProductId, command.BranchId,
                product?.Name ?? "Unknown", stockLevel.Quantity, stockLevel.ReorderLevel);
        }

        return null;
    }
}
