using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Admin;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class GetTenantsHandler
{
    public static async Task<IReadOnlyList<TenantDto>> Handle(GetTenantsQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();

        var tenants = await session.Query<Tenant>().ToListAsync();

        return tenants.Select(t => new TenantDto(
            t.Id,
            t.Name,
            t.Slug,
            t.KraPin,
            t.Phone,
            t.Email,
            t.IsActive,
            t.CreatedAt,
            t.Branches.Select(b => new BranchSummaryDto(
                b.Id, b.Name, b.Address, b.Phone, b.IsActive)).ToList()
        )).ToList();
    }
}
