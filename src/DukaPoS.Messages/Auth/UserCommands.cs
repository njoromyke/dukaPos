namespace DukaPoS.Messages.Auth;

public record CreateUserCommand(string FullName, string Email, string Password, string? Pin, string Role, Guid BranchId);
public record UpdateUserCommand(Guid Id, string FullName, string Email, string Role, Guid BranchId, bool IsActive);
public record GetUsersQuery(Guid? BranchId);
public record UserDto(Guid Id, string FullName, string Email, string Role, Guid BranchId, bool IsActive, DateTimeOffset CreatedAt);
