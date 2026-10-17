namespace DukaPoS.Messages.Inventory;

public record CreateProductCommand(string Name, string Sku, string? Barcode, Guid CategoryId, string Unit, decimal SellingPrice, decimal CostPrice, int VatRate, bool IsWeighed, string? ImageUrl);
public record UpdateProductCommand(Guid Id, string Name, string? Barcode, Guid CategoryId, string Unit, decimal SellingPrice, decimal CostPrice, int VatRate, bool IsWeighed, string? ImageUrl);
public record CreateCategoryCommand(string Name, Guid? ParentId, int SortOrder);
public record AdjustStockCommand(Guid ProductId, Guid BranchId, decimal QuantityChange, string Reason, string? Notes, Guid AdjustedBy);
public record ReceiveStockCommand(Guid ProductId, Guid BranchId, decimal Quantity, decimal CostPrice, Guid? SupplierId, Guid ReceivedBy);
