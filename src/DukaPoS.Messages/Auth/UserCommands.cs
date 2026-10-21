namespace DukaPoS.Messages.Auth;

public record CreateUserCommand(string FullName, string Email, string Password, string? Pin, string Role, Guid BranchId, string? TenantId = null, IReadOnlyList<Guid>? BranchIds = null);
public record UpdateUserCommand(Guid Id, string FullName, string Email, string Role, Guid BranchId, bool IsActive);
public record UpdateUserBranchAssignmentsCommand(Guid UserId, IReadOnlyList<Guid> BranchIds, Guid PrimaryBranchId);
public record LockUserCommand(Guid UserId);
public record UnlockUserCommand(Guid UserId);
public record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword, string? TenantId = null);
public record GetUsersQuery(Guid? BranchId);
public record UserDto(Guid Id, string FullName, string Email, string Role, Guid BranchId, bool IsActive, bool IsLocked, bool MustChangePassword, DateTimeOffset CreatedAt, string? TenantId = null, IReadOnlyList<string>? Permissions = null, IReadOnlyList<Guid>? BranchIds = null);
public record UpdateUserPermissionsCommand(Guid UserId, IReadOnlyList<string> Permissions);
