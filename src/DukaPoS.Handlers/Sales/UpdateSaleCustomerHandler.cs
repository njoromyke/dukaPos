using DukaPoS.Domain;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class UpdateSaleCustomerHandler
{
    public static async Task<Sale> Handle(UpdateSaleCustomerCommand command, IDocumentSession session)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found.");
        if (sale.Status != SaleStatus.Active)
            throw new InvalidOperationException("Customer details can only be changed on an active sale.");

        sale.CustomerName = string.IsNullOrWhiteSpace(command.CustomerName) ? null : command.CustomerName.Trim();
        session.Store(sale);
        await session.SaveChangesAsync();
        return sale;
    }
}
