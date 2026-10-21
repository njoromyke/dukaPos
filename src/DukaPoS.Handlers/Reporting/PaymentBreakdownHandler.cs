using DukaPoS.Domain;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Reporting;
using Marten;

namespace DukaPoS.Handlers.Reporting;

public static class PaymentBreakdownHandler
{
    public static async Task<IReadOnlyList<PaymentBreakdownDto>> Handle(GetPaymentBreakdownQuery query, IDocumentSession session)
    {
        var from = new DateTimeOffset(query.From.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(3)).ToUniversalTime();
        var toExclusive = new DateTimeOffset(query.To.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(3)).ToUniversalTime();

        var completedSaleIds = await session.Query<Sale>()
            .Where(s => s.BranchId == query.BranchId &&
                        s.Status == SaleStatus.Completed &&
                        s.CompletedAt >= from &&
                        s.CompletedAt < toExclusive)
            .Select(s => s.Id)
            .ToListAsync();

        var payments = await session.Query<Payment>()
            .Where(p => p.SaleId.IsOneOf(completedSaleIds.ToArray()) && p.Status == PaymentStatus.Confirmed)
            .ToListAsync();

        var totalAmount = payments.Sum(p => p.Amount);

        var breakdown = payments
            .GroupBy(p => p.Method)
            .Select(g => new PaymentBreakdownDto(
                g.Key.ToString(),
                g.Count(),
                g.Sum(p => p.Amount),
                totalAmount > 0 ? Math.Round(g.Sum(p => p.Amount) / totalAmount * 100, 1) : 0
            ))
            .OrderByDescending(b => b.Total)
            .ToList();

        return breakdown;
    }
}
