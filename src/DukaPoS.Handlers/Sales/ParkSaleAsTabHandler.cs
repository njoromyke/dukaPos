using DukaPoS.Domain;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class ParkSaleAsTabHandler
{
    public static async Task<TabParkedEvent> Handle(ParkSaleAsTabCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status != SaleStatus.Active)
            throw new InvalidOperationException("Only active sales can be parked");

        sale.Status = SaleStatus.Parked;
        session.Store(sale);

        var tab = new Tab
        {
            Id = Guid.NewGuid(),
            SaleId = sale.Id,
            CustomerName = command.CustomerName,
            CustomerPhone = command.CustomerPhone,
            Notes = command.Notes,
            ParkedBy = command.ParkedBy,
            ParkedByName = command.ParkedByName,
            SaleTotal = sale.GrandTotal,
            ItemCount = sale.LineItems.Count,
            ParkedAt = DateTimeOffset.UtcNow,
        };

        session.Store(tab);

        return new TabParkedEvent(tab.Id, sale.Id, sale.BranchId);
    }
}
