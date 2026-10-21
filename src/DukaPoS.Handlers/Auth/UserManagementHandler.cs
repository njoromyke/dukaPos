using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Auth;

public static class CreateUserHandler
{
    public static async Task<UserDto> Handle(
        CreateUserCommand command,
        IDocumentSession session,
        IPasswordService passwordService)
    {
        var existing = await session.Query<User>()
            .FirstOrDefaultAsync(u => u.Email == command.Email);
        if (existing != null)
            throw new InvalidOperationException("A user with this email already exists");

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = command.TenantId ?? session.TenantId,
            FullName = command.FullName,
            Email = command.Email,
            PasswordHash = passwordService.Hash(command.Password),
            PinHash = !string.IsNullOrEmpty(command.Pin) ? passwordService.Hash(command.Pin) : null,
            Role = Enum.Parse<UserRole>(command.Role, true),
            BranchId = command.BranchId,
            AssignedBranchIds = (command.BranchIds ?? [command.BranchId]).Append(command.BranchId).Distinct().ToList(),
        };

        session.Store(user);

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions, user.AssignedBranchIds);
    }
}

public static class UpdateUserPermissionsHandler
{
    private static readonly HashSet<string> AllowedPermissions = new(StringComparer.OrdinalIgnoreCase)
    {
        "stock.adjust", "inventory.manage", "sales.void", "users.manage", "reports.export", "admin.portal.view", "branch.switch"
    };

    public static async Task<UserDto> Handle(UpdateUserPermissionsCommand command, IDocumentSession session)
    {
        if (command.Permissions.Any(permission => !AllowedPermissions.Contains(permission)))
            throw new InvalidOperationException("One or more requested permissions are not supported.");
        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found");
        user.Permissions = command.Permissions.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        session.Store(user);
        await session.SaveChangesAsync();
        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId,
            user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions);
    }
}

public static class UpdateUserBranchAssignmentsHandler
{
    public static async Task<UserDto> Handle(UpdateUserBranchAssignmentsCommand command, IDocumentSession session)
    {
        var branchIds = command.BranchIds.Distinct().ToList();
        if (branchIds.Count == 0 || !branchIds.Contains(command.PrimaryBranchId))
            throw new InvalidOperationException("Assign at least one branch and select an assigned primary branch.");

        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found");
        user.AssignedBranchIds = branchIds;
        user.BranchId = command.PrimaryBranchId;
        session.Store(user);
        await session.SaveChangesAsync();

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId,
            user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions, user.AssignedBranchIds);
    }
}

public static class UpdateUserHandler
{
    public static async Task<UserDto> Handle(UpdateUserCommand command, IDocumentSession session)
    {
        var user = await session.LoadAsync<User>(command.Id)
            ?? throw new InvalidOperationException("User not found");

        user.FullName = command.FullName;
        user.Email = command.Email;
        user.Role = Enum.Parse<UserRole>(command.Role, true);
        user.BranchId = command.BranchId;
        user.IsActive = command.IsActive;

        session.Store(user);

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt);
    }
}

public static class LockUserHandler
{
    public static async Task<UserDto> Handle(LockUserCommand command, IDocumentSession session)
    {
        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found");

        user.IsLocked = true;
        user.LockedAt = DateTimeOffset.UtcNow;

        session.Store(user);
        await session.SaveChangesAsync();

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(),
            user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt);
    }
}

public static class UnlockUserHandler
{
    public static async Task<UserDto> Handle(UnlockUserCommand command, IDocumentSession session)
    {
        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found");

        user.IsLocked = false;
        user.LockedAt = null;
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        session.Store(user);
        await session.SaveChangesAsync();

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(),
            user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt);
    }
}

public static class ChangePasswordHandler
{
    public static async Task Handle(
        ChangePasswordCommand command,
        IDocumentStore store,
        IPasswordService passwordService)
    {
        await using var session = string.IsNullOrWhiteSpace(command.TenantId) ||
                                  command.TenantId.Equals("system", StringComparison.OrdinalIgnoreCase)
            ? store.LightweightSession()
            : store.LightweightSession(command.TenantId);

        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found");

        if (!passwordService.Verify(command.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("Current password is incorrect");

        user.PasswordHash = passwordService.Hash(command.NewPassword);
        user.MustChangePassword = false;

        session.Store(user);
        await session.SaveChangesAsync();
    }
}

public static class GetUsersHandler
{
    public static async Task<IReadOnlyList<UserDto>> Handle(GetUsersQuery query, IDocumentSession session)
    {
        var usersQuery = session.Query<User>().Where(u => u.IsActive);

        if (query.BranchId.HasValue)
            usersQuery = usersQuery.Where(u => u.BranchId == query.BranchId.Value || u.AssignedBranchIds.Contains(query.BranchId.Value));

        var users = await usersQuery
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return users.Select(u => new UserDto(
            u.Id, u.FullName, u.Email, u.Role.ToString(), u.BranchId, u.IsActive, u.IsLocked,
            u.MustChangePassword, u.CreatedAt, u.TenantId, u.Permissions, u.AssignedBranchIds
        )).ToList();
    }
}
