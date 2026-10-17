namespace DukaPoS.Messages.Inventory;

public record GetProductsQuery(Guid BranchId, string? Search, Guid? CategoryId, int Page = 1, int PageSize = 50);
public record ProductsResult(List<ProductDto> Products, int TotalCount, int Page, int PageSize);
public record ProductDto(Guid Id, string Name, string Sku, string? Barcode, string CategoryName, string Unit, decimal SellingPrice, int VatRate, bool IsWeighed, decimal StockQuantity);
public record GetProductByBarcodeQuery(string Barcode, Guid BranchId);
public record GetCategoriesQuery();
public record GetStockLevelsQuery(Guid BranchId, bool LowStockOnly = false, int Page = 1, int PageSize = 50);
