using DukaPoS.Domain;
using DukaPoS.Domain.Expenses;
using DukaPoS.Messages.Expenses;
using Marten;

namespace DukaPoS.Handlers.Expenses;

public static class ApproveExpenseHandler
{
    public static async Task<ExpenseDto> Handle(ApproveExpenseCommand command, IDocumentSession session)
    {
        var expense = await session.LoadAsync<Expense>(command.Id)
            ?? throw new InvalidOperationException("Expense not found.");

        if (expense.Status != ExpenseStatus.Draft && expense.Status != ExpenseStatus.PendingApproval)
            throw new InvalidOperationException("Expense is not pending approval.");

        expense.Status = ExpenseStatus.Approved;
        expense.ApprovedBy = command.ApprovedBy.ToString();
        expense.ApprovedByName = command.ApprovedByName;
        expense.ApprovedAt = DateTimeOffset.UtcNow;
        expense.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(expense);
        await session.SaveChangesAsync();

        return new ExpenseDto(expense.Id, expense.BranchId, expense.Category.ToString(),
            expense.Description, expense.Amount, expense.Date, expense.ReceiptUrl,
            expense.RecordedByName, expense.Status.ToString(),
            expense.ApprovedByName, expense.ApprovedAt, null, expense.CreatedAt);
    }
}

public static class RejectExpenseHandler
{
    public static async Task<ExpenseDto> Handle(RejectExpenseCommand command, IDocumentSession session)
    {
        var expense = await session.LoadAsync<Expense>(command.Id)
            ?? throw new InvalidOperationException("Expense not found.");

        if (expense.Status != ExpenseStatus.Draft && expense.Status != ExpenseStatus.PendingApproval)
            throw new InvalidOperationException("Expense is not pending approval.");

        expense.Status = ExpenseStatus.Rejected;
        expense.RejectionReason = command.Reason;
        expense.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(expense);
        await session.SaveChangesAsync();

        return new ExpenseDto(expense.Id, expense.BranchId, expense.Category.ToString(),
            expense.Description, expense.Amount, expense.Date, expense.ReceiptUrl,
            expense.RecordedByName, expense.Status.ToString(),
            null, null, expense.RejectionReason, expense.CreatedAt);
    }
}
