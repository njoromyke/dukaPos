using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Auth;
using Marten;

namespace DukaPoS.Handlers.Admin;

public static class CreateTenantUserHandler
{
    public static async Task<UserDto> Handle(CreateTenantUserCommand command, IDocumentStore store, IPasswordService passwordService)
    {
        if (string.IsNullOrWhiteSpace(command.Password) || command.Password.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters long.");
        var role = Enum.Parse<UserRole>(command.Role, true);
        if (role == UserRole.SuperAdmin) throw new InvalidOperationException("SuperAdmin cannot be assigned to a tenant user.");

        await using var directorySession = store.QuerySession();
        var tenant = await directorySession.LoadAsync<Tenant>(command.TenantId)
            ?? throw new InvalidOperationException("Tenant not found.");
        if (!tenant.IsActive) throw new InvalidOperationException("Cannot add users to a locked tenant.");
        var assignedBranchIds = (command.BranchIds ?? [command.BranchId]).Append(command.BranchId).Distinct().ToList();
        if (assignedBranchIds.Any(id => !tenant.Branches.Any(branch => branch.Id == id && branch.IsActive)))
            throw new InvalidOperationException("Select an active branch belonging to this tenant.");

        await using var session = store.LightweightSession(command.TenantId.ToString());
        var email = command.Email.Trim();
        if (await session.Query<User>().AnyAsync(user => user.Email == email))
            throw new InvalidOperationException("A user with this email already exists in the tenant.");

        var user = new User
        {
            Id = Guid.NewGuid(), TenantId = command.TenantId.ToString(), FullName = command.FullName.Trim(),
            Email = email, PasswordHash = passwordService.Hash(command.Password),
            PinHash = string.IsNullOrWhiteSpace(command.Pin) ? null : passwordService.Hash(command.Pin),
            Role = role, BranchId = command.BranchId, AssignedBranchIds = assignedBranchIds, MustChangePassword = true,
        };
        session.Store(user);
        await session.SaveChangesAsync();
        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.BranchId,
            user.IsActive, user.IsLocked, user.MustChangePassword, user.CreatedAt, user.TenantId, user.Permissions, user.AssignedBranchIds);
    }
}
