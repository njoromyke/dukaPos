using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Admin;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class CreateTenantHandler
{
    public static async Task<TenantDto> Handle(CreateTenantCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var existing = await session.Query<Tenant>()
            .FirstOrDefaultAsync(t => t.Slug == command.Slug);

        if (existing != null)
            throw new InvalidOperationException($"A tenant with slug '{command.Slug}' already exists.");

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            Slug = command.Slug.ToLowerInvariant().Trim(),
            KraPin = command.KraPin,
            Phone = command.Phone,
            Email = command.Email,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            Branches = []
        };

        session.Store(tenant);
        await session.SaveChangesAsync();

        return new TenantDto(
            tenant.Id, tenant.Name, tenant.Slug, tenant.KraPin,
            tenant.Phone, tenant.Email, tenant.IsActive, tenant.CreatedAt, []);
    }
}
