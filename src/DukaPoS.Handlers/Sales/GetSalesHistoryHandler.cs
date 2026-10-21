using DukaPoS.Domain;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class GetSalesHistoryHandler
{
    public static async Task<SalesHistoryResult> Handle(GetSalesHistoryQuery query, IDocumentSession session)
    {
        var salesQuery = session.Query<Sale>()
            .Where(s => s.BranchId == query.BranchId &&
                        (s.Status == SaleStatus.Completed || s.Status == SaleStatus.AwaitingPayment || s.Status == SaleStatus.Voided));

        if (query.From.HasValue)
            salesQuery = salesQuery.Where(s => (s.CompletedAt ?? s.StartedAt) >= query.From.Value);
        if (query.To.HasValue)
            salesQuery = salesQuery.Where(s => (s.CompletedAt ?? s.StartedAt) < query.To.Value);

        var totalCount = await salesQuery.CountAsync();

        var sales = await salesQuery
            .OrderByDescending(s => s.CompletedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var saleIds = sales.Select(s => s.Id).ToList();
        var payments = await session.Query<Payment>()
            .Where(p => p.SaleId.IsOneOf(saleIds.ToArray()) && p.Status == PaymentStatus.Confirmed)
            .ToListAsync();

        var paymentLookup = payments
            .GroupBy(p => p.SaleId)
            .ToDictionary(g => g.Key, g => new { Paid = g.Sum(p => p.Amount), Method = string.Join(" + ", g.Select(p => p.Method.ToString()).Distinct()) });

        var dtos = sales.Select(s => new SalesSummaryDto(
            s.Id,
            s.SaleNumber,
            s.Status.ToString(),
            s.CashierName,
            s.GrandTotal,
            paymentLookup.GetValueOrDefault(s.Id, new { Paid = 0m, Method = "N/A" }).Paid,
            paymentLookup.GetValueOrDefault(s.Id, new { Paid = 0m, Method = "N/A" }).Method,
            s.CompletedAt ?? s.StartedAt,
            s.CustomerName
        )).ToList();

        return new SalesHistoryResult(dtos, totalCount, query.Page, query.PageSize);
    }
}
