using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Admin;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class LockTenantHandler
{
    public static async Task<TenantDto> Handle(LockTenantCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();
        var tenant = await session.LoadAsync<Tenant>(command.TenantId)
            ?? throw new InvalidOperationException("Tenant not found");

        tenant.IsActive = false;
        session.Store(tenant);
        await session.SaveChangesAsync();

        return new TenantDto(
            tenant.Id, tenant.Name, tenant.Slug, tenant.KraPin,
            tenant.Phone, tenant.Email, tenant.IsActive, tenant.CreatedAt,
            tenant.Branches.Select(b => new BranchSummaryDto(b.Id, b.Name, b.Address, b.Phone, b.IsActive)).ToList());
    }
}

public static class UnlockTenantHandler
{
    public static async Task<TenantDto> Handle(UnlockTenantCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();
        var tenant = await session.LoadAsync<Tenant>(command.TenantId)
            ?? throw new InvalidOperationException("Tenant not found");

        tenant.IsActive = true;
        session.Store(tenant);
        await session.SaveChangesAsync();

        return new TenantDto(
            tenant.Id, tenant.Name, tenant.Slug, tenant.KraPin,
            tenant.Phone, tenant.Email, tenant.IsActive, tenant.CreatedAt,
            tenant.Branches.Select(b => new BranchSummaryDto(b.Id, b.Name, b.Address, b.Phone, b.IsActive)).ToList());
    }
}
