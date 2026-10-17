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
            FullName = command.FullName,
            Email = command.Email,
            PasswordHash = passwordService.Hash(command.Password),
            PinHash = !string.IsNullOrEmpty(command.Pin) ? passwordService.Hash(command.Pin) : null,
            Role = Enum.Parse<UserRole>(command.Role, true),
            BranchId = command.BranchId,
        };

        session.Store(user);

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, user.IsActive, user.CreatedAt);
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

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId, user.IsActive, user.CreatedAt);
    }
}

public static class GetUsersHandler
{
    public static async Task<IReadOnlyList<UserDto>> Handle(GetUsersQuery query, IDocumentSession session)
    {
        var usersQuery = session.Query<User>().Where(u => u.IsActive);

        if (query.BranchId.HasValue)
            usersQuery = usersQuery.Where(u => u.BranchId == query.BranchId.Value);

        var users = await usersQuery
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return users.Select(u => new UserDto(
            u.Id, u.FullName, u.Email, u.Role.ToString(), u.BranchId, u.IsActive, u.CreatedAt
        )).ToList();
    }
}
