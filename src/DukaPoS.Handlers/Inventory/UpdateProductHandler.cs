using DukaPoS.Domain.Enumerations;
using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class UpdateProductHandler
{
    public static async Task<Product> Handle(UpdateProductCommand command, IDocumentSession session)
    {
        var product = await session.LoadAsync<Product>(command.Id)
            ?? throw new InvalidOperationException("Product not found");

        product.Name = command.Name;
        product.Barcode = command.Barcode;
        product.CategoryId = command.CategoryId;
        product.Unit = command.Unit;
        product.SellingPrice = command.SellingPrice;
        product.CostPrice = command.CostPrice;
        product.VatRate = (VatRate)command.VatRate;
        product.IsWeighed = command.IsWeighed;
        product.ImageUrl = command.ImageUrl;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(product);
        return product;
    }
}
