using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Tenancy;
using Marten;

namespace DukaPoS.Handlers.Tenancy;

public static class GetBranchHandler
{
    public static async Task<BranchDto> Handle(GetBranchQuery query, IDocumentSession session)
    {
        var tenants = await session.Query<Tenant>().ToListAsync();

        var branch = tenants
            .SelectMany(t => t.Branches)
            .FirstOrDefault(b => b.Id == query.BranchId)
            ?? throw new InvalidOperationException("Branch not found");

        return new BranchDto(branch.Id, branch.Name, branch.Address, branch.Phone, branch.IsActive);
    }
}

public static class UpdateBranchHandler
{
    public static async Task<BranchDto> Handle(UpdateBranchCommand command, IDocumentSession session)
    {
        var tenants = await session.Query<Tenant>().ToListAsync();

        var tenant = tenants.FirstOrDefault(t => t.Branches.Any(b => b.Id == command.Id))
            ?? throw new InvalidOperationException("Branch not found");

        var branch = tenant.Branches.First(b => b.Id == command.Id);
        branch.Name = command.Name;
        branch.Address = command.Address;
        branch.Phone = command.Phone;

        session.Store(tenant);

        return new BranchDto(branch.Id, branch.Name, branch.Address, branch.Phone, branch.IsActive);
    }
}
