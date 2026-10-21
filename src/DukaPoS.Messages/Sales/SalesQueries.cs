namespace DukaPoS.Messages.Sales;

public record GetSaleQuery(Guid SaleId);
public record GetActiveSalesQuery(Guid BranchId);
public record GetTabsQuery(Guid BranchId);
public record GetSalesHistoryQuery(Guid BranchId, DateTimeOffset? From, DateTimeOffset? To, int Page = 1, int PageSize = 10);
public record SalesHistoryResult(List<SalesSummaryDto> Sales, int TotalCount, int Page, int PageSize);
public record SalesSummaryDto(Guid Id, string SaleNumber, string Status, string CashierName, decimal GrandTotal, decimal PaidAmount, string PaymentMethod, DateTimeOffset CompletedAt, string? CustomerName = null);
