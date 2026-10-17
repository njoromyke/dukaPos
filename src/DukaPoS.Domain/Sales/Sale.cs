namespace DukaPoS.Domain.Sales;

public class Sale
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = default!;
    public SaleStatus Status { get; set; } = SaleStatus.Active;
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = default!;
    public Guid BranchId { get; set; }
    public List<SaleLineItem> LineItems { get; set; } = [];
    public decimal Subtotal { get; set; }
    public decimal VatTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? VoidedAt { get; set; }
    public Guid? VoidedByUserId { get; set; }
    public string? VoidReason { get; set; }
    public void Recalculate()
    {
        Subtotal = LineItems.Sum(li => li.LineTotal);
        VatTotal = LineItems.Sum(li => li.VatAmount);
        DiscountTotal = LineItems.Sum(li => li.Discount);
        GrandTotal = Subtotal + VatTotal - DiscountTotal;
    }
    public void AddLineItem(SaleLineItem item)
    {
        var existing = LineItems.FirstOrDefault(li => li.ProductId == item.ProductId);
        if (existing != null) { existing.Quantity += item.Quantity; existing.Recalculate(); }
        else { item.Recalculate(); LineItems.Add(item); }
        Recalculate();
    }
    public void RemoveLineItem(Guid lineItemId) { LineItems.RemoveAll(li => li.Id == lineItemId); Recalculate(); }
    public void UpdateLineItemQuantity(Guid lineItemId, decimal newQuantity)
    {
        var item = LineItems.FirstOrDefault(li => li.Id == lineItemId) ?? throw new InvalidOperationException("Line item not found");
        if (newQuantity <= 0) { RemoveLineItem(lineItemId); return; }
        item.Quantity = newQuantity; item.Recalculate(); Recalculate();
    }
}
public class SaleLineItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string Sku { get; set; } = default!;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "piece";
    public decimal UnitPrice { get; set; }
    public int VatRatePercent { get; set; } = 16;
    public decimal VatAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }
    public void Recalculate()
    {
        var gross = Quantity * UnitPrice;
        LineTotal = gross - Discount;
        VatAmount = VatRatePercent > 0 ? Math.Round(LineTotal * VatRatePercent / (100m + VatRatePercent), 2) : 0;
    }
}
public class Tab
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? Notes { get; set; }
    public Guid ParkedBy { get; set; }
    public string ParkedByName { get; set; } = default!;
    public decimal SaleTotal { get; set; }
    public int ItemCount { get; set; }
    public DateTimeOffset ParkedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RecalledAt { get; set; }
    public Guid? RecalledBy { get; set; }
    public bool IsOpen => RecalledAt == null;
}
