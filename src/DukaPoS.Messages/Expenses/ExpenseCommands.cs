namespace DukaPoS.Messages.Expenses;

public record CreateExpenseCommand(
    Guid BranchId,
    string Category,
    string Description,
    decimal Amount,
    string? ReceiptUrl,
    Guid RecordedBy,
    string RecordedByName,
    string? ExpenseDate);

public record UpdateExpenseCommand(
    Guid Id,
    string Category,
    string Description,
    decimal Amount,
    string? ReceiptUrl);

public record DeleteExpenseCommand(Guid Id);

public record GetExpensesQuery(Guid BranchId, string? From, string? To, string? Category, int Page = 1, int PageSize = 20);

public record GetExpenseSummaryQuery(Guid BranchId, string From, string To);

public record ExpenseDto(
    Guid Id,
    Guid BranchId,
    string Category,
    string Description,
    decimal Amount,
    DateOnly Date,
    string? ReceiptUrl,
    string RecordedByName,
    DateTimeOffset CreatedAt);

public record ExpensesResult(IReadOnlyList<ExpenseDto> Items, int TotalCount);

public record ExpenseSummaryResult(decimal TotalAmount, int Count, IReadOnlyList<ExpenseSummaryDto> ByCategory);

public record ExpenseSummaryDto(string Category, decimal Total, int Count);
