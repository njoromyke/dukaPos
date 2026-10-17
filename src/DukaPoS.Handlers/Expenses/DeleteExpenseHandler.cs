using DukaPoS.Domain.Expenses;
using DukaPoS.Messages.Expenses;
using Marten;

namespace DukaPoS.Handlers.Expenses;

public static class DeleteExpenseHandler
{
    public static async Task Handle(DeleteExpenseCommand command, IDocumentSession session)
    {
        var expense = await session.LoadAsync<Expense>(command.Id)
            ?? throw new InvalidOperationException("Expense not found");

        session.Delete(expense);
    }
}
