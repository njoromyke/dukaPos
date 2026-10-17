using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class UpdateCategoryHandler
{
    public static async Task<Category> Handle(UpdateCategoryCommand command, IDocumentSession session)
    {
        var category = await session.LoadAsync<Category>(command.Id)
            ?? throw new InvalidOperationException("Category not found.");

        category.Name = command.Name;
        category.ParentId = command.ParentId;
        category.SortOrder = command.SortOrder;

        session.Store(category);
        await session.SaveChangesAsync();
        return category;
    }
}
