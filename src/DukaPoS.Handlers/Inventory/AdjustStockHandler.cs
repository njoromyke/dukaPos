using DukaPoS.Domain;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class AdjustStockHandler
{
    public static async Task<StockDepletedEvent?> Handle(AdjustStockCommand command, IDocumentSession session)
    {
        var actor = await session.LoadAsync<User>(command.AdjustedBy);
        if (actor == null || !actor.IsActive || actor.IsLocked)
            throw new UnauthorizedAccessException("An active signed-in user is required to adjust stock.");
        if (actor.Role is not (UserRole.Admin or UserRole.SuperAdmin) && !actor.Permissions.Contains("stock.adjust", StringComparer.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("You do not have permission to adjust stock.");
        if (!Enum.TryParse<StockMovementReason>(command.Reason, true, out var reason))
            throw new InvalidOperationException("Select a valid stock adjustment reason.");

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
            Reason = reason,
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
