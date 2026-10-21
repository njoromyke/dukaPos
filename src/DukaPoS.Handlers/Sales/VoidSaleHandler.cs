using DukaPoS.Domain;
using DukaPoS.Domain.Sales;
using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Sales;
using Marten;

namespace DukaPoS.Handlers.Sales;

public static class VoidSaleHandler
{
    public static async Task<SaleVoidedEvent> Handle(VoidSaleCommand command, IDocumentSession session)
    {
        var actor = await session.LoadAsync<User>(command.VoidedBy);
        if (actor == null || !actor.IsActive || actor.IsLocked)
            throw new UnauthorizedAccessException("An active signed-in user is required to void a sale.");
        if (actor.Role != UserRole.Admin && !actor.Permissions.Contains("sales.void", StringComparer.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("You do not have permission to void sales.");
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");
        if (actor.Role != UserRole.Admin && sale.BranchId != actor.BranchId)
            throw new UnauthorizedAccessException("You cannot void sales from another branch.");

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
