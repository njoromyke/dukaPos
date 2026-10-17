using DukaPoS.Domain;
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

        if (command.BranchId.HasValue && command.BranchId != Guid.Empty)
        {
            var stockLevel = new StockLevel
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                BranchId = command.BranchId.Value,
                Quantity = command.InitialStock,
                ReorderLevel = 10,
            };
            session.Store(stockLevel);
        }

        return Task.FromResult(product);
    }
}
