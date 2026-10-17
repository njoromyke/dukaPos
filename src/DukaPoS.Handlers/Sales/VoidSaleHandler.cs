using DukaPoS.Domain.Enumerations;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class VoidSaleHandler
{
    public static async Task<SaleVoidedEvent> Handle(VoidSaleCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status == SaleStatus.Voided)
            throw new InvalidOperationException("Sale is already voided");

        sale.Status = SaleStatus.Voided;
        sale.VoidedAt = DateTimeOffset.UtcNow;
        sale.VoidedByUserId = command.VoidedBy;
        sale.VoidReason = command.Reason;
        session.Store(sale);

        return new SaleVoidedEvent(sale.Id, command.VoidedBy, command.Reason);
    }
}
