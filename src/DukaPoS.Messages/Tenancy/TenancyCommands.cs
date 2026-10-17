namespace DukaPoS.Messages.Tenancy;

public record GetBranchQuery(Guid BranchId);
public record UpdateBranchCommand(Guid Id, string Name, string Address, string Phone);
public record BranchDto(Guid Id, string Name, string Address, string Phone, bool IsActive);

public record GetTenantSettingsQuery(string TenantId);
public record UpdateTenantSettingsCommand(
    string TenantId,
    int MaxLoginAttempts,
    int LockoutDurationMinutes,
    int IdleTimeoutMinutes,
    int MinPasswordLength,
    bool RequirePasswordChangeOnFirstLogin,
    bool AllowCashierRemoveItems,
    string UnlockRoles);

public record TenantSettingsDto(
    int MaxLoginAttempts,
    int LockoutDurationMinutes,
    int IdleTimeoutMinutes,
    int MinPasswordLength,
    bool RequirePasswordChangeOnFirstLogin,
    bool AllowCashierRemoveItems,
    string UnlockRoles);
