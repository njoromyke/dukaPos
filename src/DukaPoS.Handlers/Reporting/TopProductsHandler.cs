using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Reporting;
using Marten;

namespace DukaPoS.Handlers.Reporting;

public static class TopProductsHandler
{
    public static async Task<IReadOnlyList<TopProductDto>> Handle(GetTopProductsQuery query, IDocumentSession session)
    {
        var from = new DateTimeOffset(query.From.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var to = new DateTimeOffset(query.To.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var sales = await session.Query<Sale>()
            .Where(s => s.BranchId == query.BranchId &&
                        s.Status == SaleStatus.Completed &&
                        s.CompletedAt >= from &&
                        s.CompletedAt <= to)
            .ToListAsync();

        var topProducts = sales
            .SelectMany(s => s.LineItems)
            .GroupBy(li => new { li.ProductId, li.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(li => li.Quantity),
                g.Sum(li => li.LineTotal)
            ))
            .OrderByDescending(t => t.Revenue)
            .Take(query.Top)
            .ToList();

        return topProducts;
    }
}
