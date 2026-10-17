using DukaPoS.Domain.Enumerations;
using DukaPoS.Domain.Inventory;
using DukaPoS.Messages.Inventory;
using Marten;

namespace DukaPoS.Handlers.Inventory;

public static class CreateProductHandler
{
    public static Task<Product> Handle(CreateProductCommand command, IDocumentSession session)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            Sku = command.Sku,
            Barcode = command.Barcode,
            CategoryId = command.CategoryId,
            Unit = command.Unit,
            SellingPrice = command.SellingPrice,
            CostPrice = command.CostPrice,
            VatRate = (VatRate)command.VatRate,
            IsWeighed = command.IsWeighed,
            ImageUrl = command.ImageUrl,
        };

        session.Store(product);

        return Task.FromResult(product);
    }
}
