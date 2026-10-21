using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class GetAllUsersHandler
{
    public static async Task<IReadOnlyList<UserDto>> Handle(GetTenantUsersQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession(query.TenantId.ToString());
        var users = await session.Query<User>().ToListAsync();
        return users.Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString(), u.BranchId,
            u.IsActive, u.IsLocked, u.MustChangePassword, u.CreatedAt, u.TenantId, u.Permissions, u.AssignedBranchIds)).ToList();
    }

    public static async Task<IReadOnlyList<UserDto>> Handle(GetAllUsersQuery query, IDocumentStore store)
    {
        await using var directorySession = store.QuerySession();
        var tenants = await directorySession.Query<Tenant>().ToListAsync();
        var allUsers = new List<User>();
        foreach (var tenant in tenants)
        {
            await using var tenantSession = store.QuerySession(tenant.Id.ToString());
            allUsers.AddRange(await tenantSession.Query<User>().Where(user => user.Role != UserRole.SuperAdmin).ToListAsync());
        }
        return allUsers.Select(user => new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(),
            user.BranchId, user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions, user.AssignedBranchIds)).ToList();
    }
}
