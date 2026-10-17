using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Admin;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class GetTenantBranchesHandler
{
    public static async Task<IReadOnlyList<BranchSummaryDto>> Handle(GetTenantBranchesQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();

        var tenant = await session.LoadAsync<Tenant>(query.TenantId)
            ?? throw new InvalidOperationException("Tenant not found");

        return tenant.Branches.Select(b => new BranchSummaryDto(
            b.Id, b.Name, b.Address, b.Phone, b.IsActive)).ToList();
    }
}
