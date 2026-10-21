using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Subscriptions;
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
        IJwtTokenService jwtService,
        IPasswordService passwordService)
    {
        var isSuperAdmin = string.IsNullOrWhiteSpace(command.TenantSlug)
                           || command.TenantSlug.Equals("system", StringComparison.OrdinalIgnoreCase);

        if (isSuperAdmin)
        {
            return await HandleSuperAdminLogin(command, store, jwtService, passwordService);
        }

        await using var lookupSession = store.LightweightSession();
        var tenant = await lookupSession.Query<Tenant>()
            .FirstOrDefaultAsync(t => t.Slug == command.TenantSlug)
            ?? throw new InvalidOperationException("Tenant not found");

        if (!tenant.IsActive)
            throw new InvalidOperationException("This store has been suspended. Contact support.");

        await using var tenantSession = store.LightweightSession(tenant.Id.ToString());
        var user = await tenantSession.Query<User>()
            .FirstOrDefaultAsync(u => u.Email == command.Email && u.TenantId == tenant.Id.ToString())
            ?? throw new InvalidOperationException("Invalid credentials");

        if (!user.IsActive)
            throw new InvalidOperationException("Account is deactivated");

        if (user.IsLocked)
            throw new InvalidOperationException("Account is locked. Contact your administrator.");

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
            throw new InvalidOperationException($"Account is temporarily locked. Try again after {user.LockoutEnd.Value:HH:mm}.");

        if (user.LockoutEnd.HasValue && user.LockoutEnd <= DateTimeOffset.UtcNow)
        {
            user.LockoutEnd = null;
            user.FailedLoginAttempts = 0;
        }

        if (!passwordService.Verify(command.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
            {
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(30);
            }
            tenantSession.Store(user);
            await tenantSession.SaveChangesAsync();
            throw new InvalidOperationException("Invalid credentials");
        }

        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        user.LastLoginAt = DateTimeOffset.UtcNow;
        tenantSession.Store(user);
        await tenantSession.SaveChangesAsync();

        var branch = tenant.Branches.FirstOrDefault(b => b.Id == user.BranchId);
        var branchName = branch?.Name ?? "Default";

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString(), tenant.Id.ToString(), user.BranchId, user.Permissions);
        var refreshToken = jwtService.GenerateRefreshToken();

        var userInfo = new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, branchName, user.Permissions);

        SubscriptionInfo? subInfo = null;
        var subscription = await lookupSession.Query<Subscription>()
            .FirstOrDefaultAsync(s => s.TenantId == tenant.Id
                && s.Status != SubscriptionStatus.Cancelled);
        if (subscription != null)
        {
            var package = await lookupSession.LoadAsync<Package>(subscription.PackageId);
            subInfo = new SubscriptionInfo(
                subscription.Status.ToString(),
                subscription.Tier.ToString(),
                subscription.BillingCycle.ToString(),
                subscription.ExpiresAt,
                package?.Features ?? subscription.Features);
        }

        return new LoginResult(token, refreshToken, userInfo, tenant.Id.ToString(), user.MustChangePassword, subInfo);
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

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString(), "system", Guid.Empty, user.Permissions);
        var refreshToken = jwtService.GenerateRefreshToken();

        var userInfo = new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString(), Guid.Empty, "All Branches", user.Permissions);

        return new LoginResult(token, refreshToken, userInfo, "system");
    }
}
