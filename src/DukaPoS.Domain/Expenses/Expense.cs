namespace DukaPoS.Domain.Expenses;

public class Expense
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public ExpenseCategory Category { get; set; }
    public string Description { get; set; } = default!;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? ReceiptUrl { get; set; }
    public Guid RecordedBy { get; set; }
    public string RecordedByName { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
