using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Storage;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class GetProductByBarcodeHandler
{
    public static async Task<ProductDto?> Handle(GetProductByBarcodeQuery query, IDocumentSession session)
    {
        var product = await session.Query<Product>()
            .FirstOrDefaultAsync(p => p.Barcode == query.Barcode && p.IsActive);

        if (product == null) return null;

        var category = await session.LoadAsync<Category>(product.CategoryId);
        var stock = await session.Query<StockLevel>()
            .FirstOrDefaultAsync(sl => sl.ProductId == product.Id && sl.BranchId == query.BranchId);
        var blobId = GetBlobId(product.ImageUrl);
        var blob = blobId.HasValue ? await session.LoadAsync<BlobEntry>(blobId.Value) : null;
        var imageData = blob is not null && blob.TenantId == session.TenantId
            ? $"data:{blob.ContentType};base64,{Convert.ToBase64String(blob.Data)}"
            : null;

        return new ProductDto(
            product.Id, product.Name, product.Sku, product.Barcode,
            category?.Name ?? "Uncategorized",
            product.Unit, product.SellingPrice, (int)product.VatRate,
            product.IsWeighed,
            stock?.Quantity ?? 0, product.ImageUrl, product.CategoryId, product.CostPrice, imageData
        );
    }

    private static Guid? GetBlobId(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return null;
        var lastSegment = imageUrl.TrimEnd('/').Split('/').LastOrDefault();
        return Guid.TryParse(lastSegment, out var id) ? id : null;
    }
}
