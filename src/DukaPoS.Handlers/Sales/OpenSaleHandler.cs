using DukaPoS.Domain;
using DukaPoS.Domain.Sales;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class OpenSaleHandler
{
    public static async Task<Sale> Handle(OpenSaleCommand command, IDocumentSession session)
    {
        var today = DateTimeOffset.UtcNow.ToString("yyyyMMdd");
        var count = await session.Query<Sale>()
            .CountAsync(s => s.SaleNumber.StartsWith($"S-{today}"));

        var sale = new Sale
        {
            Id = Guid.NewGuid(),
            SaleNumber = $"S-{today}-{(count + 1):D4}",
            Status = SaleStatus.Active,
            CashierId = command.CashierId,
            CashierName = command.CashierName,
            BranchId = command.BranchId,
            StartedAt = DateTimeOffset.UtcNow,
        };

        session.Store(sale);
        return sale;
    }
}
