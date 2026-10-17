using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Admin;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class CreateBranchForTenantHandler
{
    public static async Task<BranchSummaryDto> Handle(CreateBranchForTenantCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var tenant = await session.LoadAsync<Tenant>(command.TenantId)
            ?? throw new InvalidOperationException("Tenant not found");

        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = command.Name,
            Address = command.Address,
            Phone = command.Phone,
            IsActive = true
        };

        tenant.Branches.Add(branch);
        session.Store(tenant);
        await session.SaveChangesAsync();

        return new BranchSummaryDto(branch.Id, branch.Name, branch.Address, branch.Phone, branch.IsActive);
    }
}
