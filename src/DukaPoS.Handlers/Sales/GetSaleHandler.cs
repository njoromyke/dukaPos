using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class GetSaleHandler
{
    public static async Task<Sale> Handle(GetSaleQuery query, IDocumentSession session)
    {
        return await session.LoadAsync<Sale>(query.SaleId)
            ?? throw new InvalidOperationException("Sale not found");
    }
}
