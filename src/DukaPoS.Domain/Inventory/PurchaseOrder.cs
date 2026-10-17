using DukaPoS.Domain.Enumerations;

namespace DukaPoS.Domain.Inventory;

public class PurchaseOrder
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = default!;
    public Guid BranchId { get; set; }
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;
    public List<PurchaseOrderItem> Items { get; set; } = [];
    public decimal TotalCost => Items.Sum(i => i.Quantity * i.UnitCost);
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? OrderedAt { get; set; }
    public DateTimeOffset? ReceivedAt { get; set; }
    public Guid CreatedBy { get; set; }
}

public class PurchaseOrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
}

