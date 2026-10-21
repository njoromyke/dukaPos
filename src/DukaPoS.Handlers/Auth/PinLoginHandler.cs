using DukaPoS.Domain.Identity;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Auth;

public static class PinLoginHandler
{
    public static async Task<PinLoginResult> Handle(
        PinLoginCommand command,
        IDocumentSession session,
        IJwtTokenService jwtService,
        IPasswordService passwordService)
    {
        var users = await session.Query<User>()
            .Where(u => u.IsActive && u.PinHash != null)
            .ToListAsync();

        var user = users.FirstOrDefault(u => passwordService.Verify(command.Pin, u.PinHash!))
            ?? throw new InvalidOperationException("Invalid PIN");

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString(), user.TenantId, user.BranchId, user.Permissions);

        var userInfo = new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, "", user.Permissions);

        return new PinLoginResult(token, userInfo);
    }
}
