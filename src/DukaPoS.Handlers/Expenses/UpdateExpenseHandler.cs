using DukaPoS.Domain;
using DukaPoS.Domain.Expenses;
using DukaPoS.Messages.Expenses;
using Marten;

namespace DukaPoS.Handlers.Expenses;

public static class UpdateExpenseHandler
{
    public static async Task<ExpenseDto> Handle(UpdateExpenseCommand command, IDocumentSession session)
    {
        var expense = await session.LoadAsync<Expense>(command.Id)
            ?? throw new InvalidOperationException("Expense not found");

        if (Enum.TryParse<ExpenseCategory>(command.Category, true, out var category))
        {
            expense.Category = category;
        }

        expense.Description = command.Description;
        expense.Amount = command.Amount;
        expense.ReceiptUrl = command.ReceiptUrl;
        expense.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(expense);

        return new ExpenseDto(
            expense.Id, expense.BranchId, expense.Category.ToString(),
            expense.Description, expense.Amount, expense.Date,
            expense.ReceiptUrl, expense.RecordedByName, expense.CreatedAt);
    }
}
