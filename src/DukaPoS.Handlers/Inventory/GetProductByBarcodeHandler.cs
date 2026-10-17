using DukaPoS.Domain.Inventory;
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

        return new ProductDto(
            product.Id, product.Name, product.Sku, product.Barcode,
            category?.Name ?? "Uncategorized",
            product.Unit, product.SellingPrice, (int)product.VatRate,
            product.IsWeighed,
            stock?.Quantity ?? 0
        );
    }
}
