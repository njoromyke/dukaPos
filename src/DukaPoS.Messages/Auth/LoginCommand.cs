namespace DukaPoS.Messages.Auth;

public record LoginCommand(string Email, string Password, string? TenantSlug = null);
public record LoginResult(string Token, string RefreshToken, UserInfo User, string TenantId, bool MustChangePassword = false);
public record UserInfo(Guid Id, string Name, string Email, string Role, Guid BranchId, string BranchName);
public record PinLoginCommand(string Pin);
public record PinLoginResult(string Token, UserInfo User);
public record RefreshTokenCommand(string RefreshToken);
