using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class GetTabsHandler
{
    public static async Task<IReadOnlyList<Tab>> Handle(GetTabsQuery query, IDocumentSession session)
    {
        // BranchId was added to Tab after tabs were already persisted. Include legacy records
        // with an empty BranchId and resolve their branch through the associated sale.
        var candidates = await session.Query<Tab>()
            .Where(tab => tab.RecalledAt == null && (tab.BranchId == query.BranchId || tab.BranchId == Guid.Empty))
            .ToListAsync();

        var legacySaleIds = candidates
            .Where(tab => tab.BranchId == Guid.Empty)
            .Select(tab => tab.SaleId)
            .Distinct()
            .ToArray();

        var legacyBranchSaleIds = legacySaleIds.Length == 0
            ? new HashSet<Guid>()
            : (await session.Query<Sale>()
                .Where(sale => sale.BranchId == query.BranchId && legacySaleIds.Contains(sale.Id))
                .Select(sale => sale.Id)
                .ToListAsync())
                .ToHashSet();

        return candidates
            .Where(tab => tab.BranchId == query.BranchId || legacyBranchSaleIds.Contains(tab.SaleId))
            .OrderByDescending(tab => tab.ParkedAt)
            .ToList();
    }
}
