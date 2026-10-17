namespace DukaPoS.Messages.Sales;

public record SaleCompletedEvent(Guid SaleId, Guid BranchId, Guid CashierId, decimal GrandTotal, DateTimeOffset CompletedAt);
public record SaleVoidedEvent(Guid SaleId, Guid VoidedBy, string Reason);
public record TabParkedEvent(Guid TabId, Guid SaleId, Guid BranchId);
public record TabRecalledEvent(Guid TabId, Guid SaleId, Guid RecalledBy);
