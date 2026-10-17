using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Auth;

public static class LoginHandler
{
    public static async Task<LoginResult> Handle(
        LoginCommand command,
        IDocumentStore store,
        IDocumentSession session,
        IJwtTokenService jwtService,
        IPasswordService passwordService)
    {
        var isSuperAdmin = string.IsNullOrWhiteSpace(command.TenantSlug)
                           || command.TenantSlug.Equals("system", StringComparison.OrdinalIgnoreCase);

        if (isSuperAdmin)
        {
            return await HandleSuperAdminLogin(command, store, jwtService, passwordService);
        }

        var tenant = await session.Query<Tenant>()
            .FirstOrDefaultAsync(t => t.Slug == command.TenantSlug)
            ?? throw new InvalidOperationException("Tenant not found");

        var user = await session.Query<User>()
            .FirstOrDefaultAsync(u => u.Email == command.Email && u.TenantId == tenant.Id.ToString())
            ?? throw new InvalidOperationException("Invalid credentials");

        if (!user.IsActive)
        {
            throw new InvalidOperationException("Account is deactivated");
        }

        if (!passwordService.Verify(command.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Invalid credentials");
        }

        var branch = tenant.Branches.FirstOrDefault(b => b.Id == user.BranchId);
        var branchName = branch?.Name ?? "Default";

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString(), tenant.Id.ToString(), user.BranchId);
        var refreshToken = jwtService.GenerateRefreshToken();

        var userInfo = new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, branchName);

        return new LoginResult(token, refreshToken, userInfo, tenant.Id.ToString());
    }

    private static async Task<LoginResult> HandleSuperAdminLogin(
        LoginCommand command,
        IDocumentStore store,
        IJwtTokenService jwtService,
        IPasswordService passwordService)
    {
        await using var session = store.LightweightSession();

        var user = await session.Query<User>()
            .FirstOrDefaultAsync(u => u.Email == command.Email && u.Role == UserRole.SuperAdmin)
            ?? throw new InvalidOperationException("Invalid credentials");

        if (!user.IsActive)
        {
            throw new InvalidOperationException("Account is deactivated");
        }

        if (!passwordService.Verify(command.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Invalid credentials");
        }

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString(), "system", Guid.Empty);
        var refreshToken = jwtService.GenerateRefreshToken();

        var userInfo = new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString(), Guid.Empty, "All Branches");

        return new LoginResult(token, refreshToken, userInfo, "system");
    }
}
