using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class CreateCategoryHandler
{
    public static Task<Category> Handle(CreateCategoryCommand command, IDocumentSession session)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            ParentId = command.ParentId,
            SortOrder = command.SortOrder,
        };

        session.Store(category);
        return Task.FromResult(category);
    }
}
