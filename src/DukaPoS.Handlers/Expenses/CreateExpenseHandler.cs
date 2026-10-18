using DukaPoS.Domain;
using DukaPoS.Domain.Expenses;
using DukaPoS.Messages.Expenses;
using Marten;

namespace DukaPoS.Handlers.Expenses;

public static class CreateExpenseHandler
{
    public static async Task<ExpenseDto> Handle(CreateExpenseCommand command, IDocumentSession session)
    {
        if (!Enum.TryParse<ExpenseCategory>(command.Category, true, out var category))
        {
            category = ExpenseCategory.Other;
        }

        var date = string.IsNullOrEmpty(command.ExpenseDate)
            ? DateOnly.FromDateTime(DateTime.UtcNow)
            : DateOnly.Parse(command.ExpenseDate);

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            BranchId = command.BranchId,
            Category = category,
            Description = command.Description,
            Amount = command.Amount,
            Date = date,
            ReceiptUrl = command.ReceiptUrl,
            RecordedBy = command.RecordedBy,
            RecordedByName = command.RecordedByName,
        };

        session.Store(expense);
        await session.SaveChangesAsync();

        return new ExpenseDto(
            expense.Id, expense.BranchId, expense.Category.ToString(),
            expense.Description, expense.Amount, expense.Date,
            expense.ReceiptUrl, expense.RecordedByName, expense.Status.ToString(),
            expense.ApprovedByName, expense.ApprovedAt, expense.RejectionReason, expense.CreatedAt);
    }
}
