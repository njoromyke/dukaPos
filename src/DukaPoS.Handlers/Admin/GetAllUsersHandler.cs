using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class GetAllUsersHandler
{
    public static async Task<IReadOnlyList<UserDto>> Handle(GetAllUsersQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();

        var users = await session.Query<User>()
            .Where(u => u.Role != UserRole.SuperAdmin)
            .ToListAsync();

        return users.Select(u => new UserDto(
            u.Id, u.FullName, u.Email, u.Role.ToString(),
            u.BranchId, u.IsActive, u.IsLocked, u.MustChangePassword, u.CreatedAt)).ToList();
    }
}
