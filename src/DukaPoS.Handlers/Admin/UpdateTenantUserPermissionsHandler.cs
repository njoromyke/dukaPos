using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class UpdateTenantUserPermissionsHandler
{
    private static readonly HashSet<string> AllowedPermissions = new(StringComparer.OrdinalIgnoreCase)
    {
        "stock.adjust", "inventory.manage", "sales.void", "users.manage", "reports.export", "admin.portal.view", "branch.switch"
    };

    public static async Task<UserDto> Handle(UpdateTenantUserPermissionsCommand command, IDocumentStore store)
    {
        if (command.Permissions.Any(permission => !AllowedPermissions.Contains(permission)))
            throw new InvalidOperationException("One or more requested permissions are not supported.");
        await using var session = store.LightweightSession(command.TenantId.ToString());
        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found in the selected tenant.");
        if (!string.Equals(user.TenantId, command.TenantId.ToString(), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("User does not belong to the selected tenant.");
        user.Permissions = command.Permissions.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        session.Store(user);
        await session.SaveChangesAsync();
        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId,
            user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions, user.AssignedBranchIds);
    }
}
