using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class UpdateTenantUserBranchAssignmentsHandler
{
    public static async Task<UserDto> Handle(UpdateTenantUserBranchAssignmentsCommand command, IDocumentStore store)
    {
        var branchIds = (command.BranchIds ?? []).Distinct().ToList();
        if (branchIds.Count == 0 || !branchIds.Contains(command.PrimaryBranchId))
            throw new InvalidOperationException("Assign at least one branch and select an assigned primary branch.");

        await using var session = store.LightweightSession(command.TenantId.ToString());
        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found in the selected tenant.");
        if (!string.Equals(user.TenantId, command.TenantId.ToString(), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("User does not belong to the selected tenant.");

        user.AssignedBranchIds = branchIds;
        user.BranchId = command.PrimaryBranchId;
        session.Store(user);
        await session.SaveChangesAsync();

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId,
            user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId,
            user.Permissions, user.AssignedBranchIds);
    }
}
