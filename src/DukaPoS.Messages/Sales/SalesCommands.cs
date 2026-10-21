namespace DukaPoS.Messages.Sales;

public record OpenSaleCommand(Guid CashierId, string CashierName, Guid BranchId);
public record AddLineItemCommand(Guid SaleId, Guid ProductId, string ProductName, string Sku, decimal Quantity, string Unit, decimal UnitPrice, int VatRatePercent);
public record UpdateLineItemQuantityCommand(Guid SaleId, Guid LineItemId, decimal NewQuantity);
public record RemoveLineItemCommand(Guid SaleId, Guid LineItemId);
public record ApplyDiscountCommand(Guid SaleId, Guid? LineItemId, decimal DiscountAmount, string Reason);
public record CompleteSaleCommand(Guid SaleId);
public record VoidSaleCommand(Guid SaleId, Guid VoidedBy, string Reason);
public record ParkSaleAsTabCommand(Guid SaleId, Guid ParkedBy, string ParkedByName, string? CustomerName, string? CustomerPhone, string? Notes);
public record UpdateSaleCustomerCommand(Guid SaleId, string? CustomerName);
public record RecallTabCommand(Guid TabId, Guid RecalledBy);
