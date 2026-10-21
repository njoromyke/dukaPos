namespace DukaPoS.Messages.Admin;

public record GetTenantsQuery();

public record GetTenantBranchesQuery(Guid TenantId);

public record CreateTenantCommand(string Name, string Slug, string KraPin, string Phone, string Email);

public record CreateBranchForTenantCommand(Guid TenantId, string Name, string Address, string Phone);

public record GetAllUsersQuery();

public record TenantDto(
    Guid Id,
    string Name,
    string Slug,
    string KraPin,
    string Phone,
    string Email,
    bool IsActive,
    DateTimeOffset CreatedAt,
    IReadOnlyList<BranchSummaryDto> Branches);

public record BranchSummaryDto(
    Guid Id,
    string Name,
    string Address,
    string Phone,
    bool IsActive);

public record CreateTenantResult(TenantDto Tenant, string AdminEmail, string TempPassword);

public record LockTenantCommand(Guid TenantId);
public record UnlockTenantCommand(Guid TenantId);

public record ResetUserPasswordCommand(Guid UserId, string NewPassword, string? TenantId = null);
public record GetTenantUsersQuery(Guid TenantId);
public record CreateTenantUserCommand(Guid TenantId, string FullName, string Email, string Password, string? Pin, string Role, Guid BranchId, IReadOnlyList<Guid>? BranchIds = null);
public record UpdateTenantUserBranchAssignmentsCommand(Guid TenantId, Guid UserId, IReadOnlyList<Guid> BranchIds, Guid PrimaryBranchId);
public record UpdateTenantUserPermissionsCommand(Guid TenantId, Guid UserId, IReadOnlyList<string> Permissions);
