using DukaPoS.Domain.Enumerations;

namespace DukaPoS.Domain.Inventory;

public class Product
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = default!;
    public string? Barcode { get; set; }
    public string Name { get; set; } = default!;
    public Guid CategoryId { get; set; }
    public string Unit { get; set; } = "piece";
    public decimal SellingPrice { get; set; }
    public decimal CostPrice { get; set; }
    public VatRate VatRate { get; set; } = VatRate.Standard;
    public bool IsWeighed { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ImageUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
public class StockLevel
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public decimal Quantity { get; set; }
    public decimal ReorderLevel { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class StockMovement
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public decimal QuantityChange { get; set; }
    public StockMovementReason Reason { get; set; }
    public Guid? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }
    public string? Notes { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
