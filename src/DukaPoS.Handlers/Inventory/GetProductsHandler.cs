using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Storage;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class GetProductsHandler
{
    public static async Task<ProductsResult> Handle(GetProductsQuery query, IDocumentSession session)
    {
        var productsQuery = session.Query<Product>().Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
            productsQuery = productsQuery.Where(p => p.Name.Contains(query.Search, StringComparison.OrdinalIgnoreCase));

        if (query.CategoryId.HasValue)
            productsQuery = productsQuery.Where(p => p.CategoryId == query.CategoryId.Value);

        var totalCount = await productsQuery.CountAsync();

        var products = await productsQuery
            .OrderBy(p => p.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var productIds = products.Select(p => p.Id).ToList();
        var categoryIds = products.Select(p => p.CategoryId).Distinct().ToList();
        var blobIds = products
            .Select(p => GetBlobId(p.ImageUrl))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

        var stockLevels = await session.Query<StockLevel>()
            .Where(sl => sl.BranchId == query.BranchId && sl.ProductId.IsOneOf(productIds.ToArray()))
            .ToListAsync();

        var categories = await session.Query<Category>()
            .Where(c => c.Id.IsOneOf(categoryIds.ToArray()))
            .ToListAsync();

        IReadOnlyList<BlobEntry> blobs = blobIds.Length == 0
            ? []
            : await session.Query<BlobEntry>()
                .Where(b => b.TenantId == session.TenantId && b.Id.IsOneOf(blobIds))
                .ToListAsync();

        var stockLookup = stockLevels.ToDictionary(sl => sl.ProductId, sl => sl.Quantity);
        var categoryLookup = categories.ToDictionary(c => c.Id, c => c.Name);
        var blobLookup = blobs.ToDictionary(
            b => b.Id,
            b => $"data:{b.ContentType};base64,{Convert.ToBase64String(b.Data)}");

        var dtos = products.Select(p => new ProductDto(
            p.Id, p.Name, p.Sku, p.Barcode,
            categoryLookup.GetValueOrDefault(p.CategoryId, "Uncategorized"),
            p.Unit, p.SellingPrice, (int)p.VatRate,
            p.IsWeighed,
            stockLookup.GetValueOrDefault(p.Id, 0), p.ImageUrl, p.CategoryId, p.CostPrice,
            blobLookup.GetValueOrDefault(GetBlobId(p.ImageUrl) ?? Guid.Empty)
        )).ToList();

        return new ProductsResult(dtos, totalCount, query.Page, query.PageSize);
    }

    private static Guid? GetBlobId(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return null;
        var lastSegment = imageUrl.TrimEnd('/').Split('/').LastOrDefault();
        return Guid.TryParse(lastSegment, out var id) ? id : null;
    }
}
