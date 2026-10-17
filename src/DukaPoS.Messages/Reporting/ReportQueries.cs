namespace DukaPoS.Messages.Reporting;

public record GetDailySummaryQuery(Guid BranchId, DateOnly Date);
public record DailySummaryResult(DateOnly Date, int TotalSales, decimal TotalRevenue, decimal TotalVat, decimal CashTotal, decimal MpesaTotal, int VoidedCount, decimal AverageBasket);
public record GetPaymentBreakdownQuery(Guid BranchId, DateOnly From, DateOnly To);
public record GetTopProductsQuery(Guid BranchId, DateOnly From, DateOnly To, int Top = 10);
public record TopProductDto(Guid ProductId, string ProductName, decimal QuantitySold, decimal Revenue);
