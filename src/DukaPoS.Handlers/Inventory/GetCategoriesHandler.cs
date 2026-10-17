using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class GetCategoriesHandler
{
    public static async Task<IReadOnlyList<Category>> Handle(GetCategoriesQuery query, IDocumentSession session)
    {
        return await session.Query<Category>()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();
    }
}
