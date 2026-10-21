using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Subscriptions;
using Marten;
using Wolverine;

namespace DukaPoS.Handlers.Admin;

public static class CreateTenantHandler
{
    public static async Task<CreateTenantResult> Handle(
        CreateTenantCommand command,
        IDocumentStore store,
        IPasswordService passwordService,
        IMessageBus bus)
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

        var defaultBranch = new Branch
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Main Branch",
            Address = "Default",
            Phone = command.Phone,
            IsActive = true
        };
        tenant.Branches.Add(defaultBranch);

        session.Store(tenant);
        await session.SaveChangesAsync();

        var tempPassword = GenerateTempPassword();
        await using var tenantSession = store.LightweightSession(tenant.Id.ToString());

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id.ToString(),
            FullName = command.Name + " Admin",
            Email = command.Email,
            PasswordHash = passwordService.Hash(tempPassword),
            Role = UserRole.Admin,
            BranchId = defaultBranch.Id,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        tenantSession.Store(adminUser);
        await tenantSession.SaveChangesAsync();

        try
        {
            await bus.InvokeAsync(new CreateTrialSubscriptionCommand(tenant.Id));
        }
        catch
        {
            // Trial creation is best-effort; don't block tenant creation
        }

        var tenantDto = new TenantDto(
            tenant.Id, tenant.Name, tenant.Slug, tenant.KraPin,
            tenant.Phone, tenant.Email, tenant.IsActive, tenant.CreatedAt,
            [new BranchSummaryDto(defaultBranch.Id, defaultBranch.Name, defaultBranch.Address, defaultBranch.Phone, defaultBranch.IsActive)]);

        return new CreateTenantResult(tenantDto, command.Email, tempPassword);
    }

    private static string GenerateTempPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        var rng = Random.Shared;
        var chars = new char[12];
        chars[0] = upper[rng.Next(upper.Length)];
        chars[1] = lower[rng.Next(lower.Length)];
        chars[2] = digits[rng.Next(digits.Length)];
        chars[3] = '!';
        var all = upper + lower + digits;
        for (var i = 4; i < chars.Length; i++)
            chars[i] = all[rng.Next(all.Length)];
        rng.Shuffle(chars);
        return new string(chars);
    }
}
