using DukaPoS.Domain;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class RecallTabHandler
{
    public static async Task<Sale> Handle(RecallTabCommand command, IDocumentSession session)
    {
        var tab = await session.LoadAsync<Tab>(command.TabId)
            ?? throw new InvalidOperationException("Tab not found");

        if (!tab.IsOpen)
            throw new InvalidOperationException("Tab has already been recalled");

        tab.RecalledAt = DateTimeOffset.UtcNow;
        tab.RecalledBy = command.RecalledBy;
        session.Store(tab);

        var sale = await session.LoadAsync<Sale>(tab.SaleId)
            ?? throw new InvalidOperationException("Associated sale not found");

        sale.Status = SaleStatus.Active;
        session.Store(sale);

        return sale;
    }
}
