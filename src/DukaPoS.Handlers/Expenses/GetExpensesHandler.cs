using DukaPoS.Domain;
using DukaPoS.Domain.Expenses;
using DukaPoS.Messages.Expenses;
using Marten;

namespace DukaPoS.Handlers.Expenses;

public static class GetExpensesHandler
{
    public static async Task<ExpensesResult> Handle(GetExpensesQuery query, IDocumentSession session)
    {
        var q = session.Query<Expense>()
            .Where(e => e.BranchId == query.BranchId);

        if (!string.IsNullOrEmpty(query.From) && DateOnly.TryParse(query.From, out var from))
        {
            q = q.Where(e => e.Date >= from);
        }

        if (!string.IsNullOrEmpty(query.To) && DateOnly.TryParse(query.To, out var to))
        {
            q = q.Where(e => e.Date <= to);
        }

        if (!string.IsNullOrEmpty(query.Category) && Enum.TryParse<ExpenseCategory>(query.Category, true, out var cat))
        {
            q = q.Where(e => e.Category == cat);
        }

        var totalCount = await q.CountAsync();

        var expenses = await q
            .OrderByDescending(e => e.Date)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var items = expenses.Select(e => new ExpenseDto(
            e.Id, e.BranchId, e.Category.ToString(),
            e.Description, e.Amount, e.Date,
            e.ReceiptUrl, e.RecordedByName, e.CreatedAt)).ToList();

        return new ExpensesResult(items, totalCount);
    }
}
