namespace DukaPoS.Messages.Auth;

public record LoginCommand(string Email, string Password, string? TenantSlug = null);
public record LoginResult(
    string Token,
    string RefreshToken,
    UserInfo User,
    string TenantId,
    bool MustChangePassword = false,
    SubscriptionInfo? Subscription = null);

public record SubscriptionInfo(
    string Status,
    string Tier,
    string BillingCycle,
    DateTimeOffset? ExpiresAt,
    IReadOnlyList<string> Features);
public record UserInfo(Guid Id, string Name, string Email, string Role, Guid BranchId, string BranchName, IReadOnlyList<string>? Permissions = null);
public record PinLoginCommand(string Pin);
public record PasswordUnlockCommand(string Password);
public record PinLoginResult(string Token, UserInfo User);
public record RefreshTokenCommand(string RefreshToken);
