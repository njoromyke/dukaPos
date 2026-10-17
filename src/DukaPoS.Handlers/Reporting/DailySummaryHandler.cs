using DukaPoS.Domain.Enumerations;
using DukaPoS.Domain.Expenses;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Reporting;
using Marten;

namespace DukaPoS.Handlers.Reporting;

public static class DailySummaryHandler
{
    public static async Task<DailySummaryResult> Handle(GetDailySummaryQuery query, IDocumentSession session)
    {
        var dayStart = new DateTimeOffset(query.Date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var dayEnd = dayStart.AddDays(1);

        var completedSales = await session.Query<Sale>()
            .Where(s => s.BranchId == query.BranchId &&
                        s.Status == SaleStatus.Completed &&
                        s.CompletedAt >= dayStart &&
                        s.CompletedAt < dayEnd)
            .ToListAsync();

        var voidedCount = await session.Query<Sale>()
            .CountAsync(s => s.BranchId == query.BranchId &&
                             s.Status == SaleStatus.Voided &&
                             s.VoidedAt >= dayStart &&
                             s.VoidedAt < dayEnd);

        var totalRevenue = completedSales.Sum(s => s.GrandTotal);
        var totalVat = completedSales.Sum(s => s.VatTotal);

        var saleIds = completedSales.Select(s => s.Id).ToArray();
        var payments = await session.Query<Payment>()
            .Where(p => p.SaleId.IsOneOf(saleIds) && p.Status == PaymentStatus.Confirmed)
            .ToListAsync();

        var cashTotal = payments.Where(p => p.Method == PaymentMethod.Cash).Sum(p => p.Amount);
        var mpesaTotal = payments.Where(p => p.Method == PaymentMethod.Mpesa).Sum(p => p.Amount);

        var averageBasket = completedSales.Count > 0 ? totalRevenue / completedSales.Count : 0;

        var expenseTotal = await session.Query<Expense>()
            .Where(e => e.BranchId == query.BranchId && e.Date == query.Date)
            .SumAsync(e => e.Amount);

        return new DailySummaryResult(
            query.Date, completedSales.Count, totalRevenue, totalVat,
            cashTotal, mpesaTotal, voidedCount, averageBasket, expenseTotal
        );
    }
}
