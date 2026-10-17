using DukaPoS.Domain.Enumerations;

namespace DukaPoS.Domain.Identity;

public class User
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string? PinHash { get; set; }
    public string? CardTokenHash { get; set; }
    public UserRole Role { get; set; } = UserRole.Cashier;
    public bool IsActive { get; set; } = true;
    public Guid BranchId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class TerminalSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TerminalId { get; set; } = default!;
    public Guid BranchId { get; set; }
    public TerminalStatus Status { get; set; } = TerminalStatus.Active;
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LockedAt { get; set; }
    public DateTimeOffset? UnlockedAt { get; set; }
    public Guid? UnlockedByUserId { get; set; }
    public string? UnlockMethod { get; set; }
}
public class AuditLogEntry
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = default!;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = default!;
    public string Action { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string? Details { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
