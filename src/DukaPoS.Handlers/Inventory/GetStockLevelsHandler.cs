using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class GetStockLevelsHandler
{
    public static async Task<StockLevelsResult> Handle(GetStockLevelsQuery query, IDocumentSession session)
    {
        var stockQuery = session.Query<StockLevel>()
            .Where(sl => sl.BranchId == query.BranchId);

        if (query.LowStockOnly)
            stockQuery = stockQuery.Where(sl => sl.Quantity <= sl.ReorderLevel);

        var totalCount = await stockQuery.CountAsync();

        var stockLevels = await stockQuery
            .OrderBy(sl => sl.Quantity)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var productIds = stockLevels.Select(sl => sl.ProductId).ToArray();
        var products = await session.Query<Product>()
            .Where(p => p.Id.IsOneOf(productIds))
            .ToListAsync();

        var productLookup = products.ToDictionary(p => p.Id);

        var dtos = stockLevels.Select(sl =>
        {
            var product = productLookup.GetValueOrDefault(sl.ProductId);
            return new StockLevelDto(
                sl.Id, sl.ProductId,
                product?.Name ?? "Unknown",
                product?.Sku ?? "",
                product?.Unit ?? "piece",
                sl.Quantity, sl.ReorderLevel,
                sl.Quantity <= sl.ReorderLevel,
                sl.UpdatedAt
            );
        }).ToList();

        return new StockLevelsResult(dtos, totalCount, query.Page, query.PageSize);
    }
}
