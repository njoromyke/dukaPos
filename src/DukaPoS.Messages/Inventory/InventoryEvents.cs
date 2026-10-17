namespace DukaPoS.Messages.Inventory;

public record StockDepletedEvent(Guid ProductId, Guid BranchId, string ProductName, decimal CurrentQuantity, decimal ReorderLevel);
public record StockReceivedEvent(Guid ProductId, Guid BranchId, decimal Quantity);
