using DukaPoS.Domain.Expenses;
using DukaPoS.Messages.Expenses;
using Marten;

namespace DukaPoS.Handlers.Expenses;

public static class GetExpenseSummaryHandler
{
    public static async Task<ExpenseSummaryResult> Handle(GetExpenseSummaryQuery query, IDocumentSession session)
    {
        var from = DateOnly.Parse(query.From);
        var to = DateOnly.Parse(query.To);

        var expenses = await session.Query<Expense>()
            .Where(e => e.BranchId == query.BranchId && e.Date >= from && e.Date <= to)
            .ToListAsync();

        var byCategory = expenses
            .GroupBy(e => e.Category)
            .Select(g => new ExpenseSummaryDto(g.Key.ToString(), g.Sum(e => e.Amount), g.Count()))
            .OrderByDescending(s => s.Total)
            .ToList();

        return new ExpenseSummaryResult(expenses.Sum(e => e.Amount), expenses.Count, byCategory);
    }
}
