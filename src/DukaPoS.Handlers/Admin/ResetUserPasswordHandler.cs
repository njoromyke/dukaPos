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
        IDocumentSession session,
        IPasswordService passwordService)
    {
        var user = await session.LoadAsync<User>(command.UserId)
            ?? throw new InvalidOperationException("User not found");

        user.PasswordHash = passwordService.Hash(command.NewPassword);
        user.MustChangePassword = true;
        user.IsLocked = false;
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        session.Store(user);
        await session.SaveChangesAsync();

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(),
            user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt);
    }
}
