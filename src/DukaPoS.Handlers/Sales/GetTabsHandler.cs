using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class GetTabsHandler
{
    public static async Task<IReadOnlyList<Tab>> Handle(GetTabsQuery query, IDocumentSession session)
    {
        var tabs = await session.Query<Tab>()
            .Where(t => t.RecalledAt == null)
            .OrderByDescending(t => t.ParkedAt)
            .ToListAsync();

        return tabs;
    }
}
