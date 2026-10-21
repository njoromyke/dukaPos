using DukaPoS.Domain.Identity;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class ResetUserPasswordHandler
{
    public static async Task<UserDto> Handle(
        ResetUserPasswordCommand command,
        IDocumentStore store,
        IPasswordService passwordService)
    {
        if (string.IsNullOrWhiteSpace(command.NewPassword) || command.NewPassword.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters long.");
        if (string.IsNullOrWhiteSpace(command.TenantId))
            throw new InvalidOperationException("Tenant ID is required to reset a tenant user password.");
        await using var session = store.LightweightSession(command.TenantId);
        var user = await session.LoadAsync<User>(command.UserId) ?? throw new InvalidOperationException("User not found");

        user.PasswordHash = passwordService.Hash(command.NewPassword);
        user.MustChangePassword = true;
        user.IsLocked = false;
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        session.Store(user);
        await session.SaveChangesAsync();

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(),
            user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions, user.AssignedBranchIds);
    }
}
