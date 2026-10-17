using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Tenancy;
using Marten;

namespace DukaPoS.Handlers.Tenancy;

public static class GetTenantSettingsHandler
{
    public static async Task<TenantSettingsDto> Handle(GetTenantSettingsQuery query, IQuerySession session)
    {
        var settings = await session.Query<TenantSettings>()
            .FirstOrDefaultAsync(s => s.TenantId == query.TenantId);

        if (settings == null)
        {
            return new TenantSettingsDto(5, 30, 1, 8, true, false, "Supervisor,Manager,Admin");
        }

        return new TenantSettingsDto(
            settings.MaxLoginAttempts,
            settings.LockoutDurationMinutes,
            settings.IdleTimeoutMinutes,
            settings.MinPasswordLength,
            settings.RequirePasswordChangeOnFirstLogin,
            settings.AllowCashierRemoveItems,
            settings.UnlockRoles ?? "Supervisor,Manager,Admin");
    }
}

public static class UpdateTenantSettingsHandler
{
    public static async Task<TenantSettingsDto> Handle(UpdateTenantSettingsCommand command, IDocumentSession session)
    {
        var settings = await session.Query<TenantSettings>()
            .FirstOrDefaultAsync(s => s.TenantId == command.TenantId);

        if (settings == null)
        {
            settings = new TenantSettings { Id = Guid.NewGuid(), TenantId = command.TenantId };
        }

        settings.MaxLoginAttempts = command.MaxLoginAttempts;
        settings.LockoutDurationMinutes = command.LockoutDurationMinutes;
        settings.IdleTimeoutMinutes = command.IdleTimeoutMinutes;
        settings.MinPasswordLength = command.MinPasswordLength;
        settings.RequirePasswordChangeOnFirstLogin = command.RequirePasswordChangeOnFirstLogin;
        settings.AllowCashierRemoveItems = command.AllowCashierRemoveItems;
        settings.UnlockRoles = command.UnlockRoles;
        settings.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(settings);
        await session.SaveChangesAsync();

        return new TenantSettingsDto(
            settings.MaxLoginAttempts,
            settings.LockoutDurationMinutes,
            settings.IdleTimeoutMinutes,
            settings.MinPasswordLength,
            settings.RequirePasswordChangeOnFirstLogin,
            settings.AllowCashierRemoveItems,
            settings.UnlockRoles ?? "Supervisor,Manager,Admin");
    }
}
