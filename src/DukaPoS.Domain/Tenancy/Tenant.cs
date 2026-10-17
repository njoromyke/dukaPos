namespace DukaPoS.Domain.Tenancy;
public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string KraPin { get; set; } = default!;
    public string Phone { get; set; } = default!;
    public string Email { get; set; } = default!;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<Branch> Branches { get; set; } = [];
}
public class Branch
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = default!;
    public string Address { get; set; } = default!;
    public string Phone { get; set; } = default!;
    public bool IsActive { get; set; } = true;
}

public class TenantSettings
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = default!;
    public int MaxLoginAttempts { get; set; } = 5;
    public int LockoutDurationMinutes { get; set; } = 30;
    public int IdleTimeoutMinutes { get; set; } = 1;
    public int MinPasswordLength { get; set; } = 8;
    public bool RequirePasswordChangeOnFirstLogin { get; set; } = true;
    public bool AllowCashierRemoveItems { get; set; }
    public string? UnlockRoles { get; set; } = "Supervisor,Manager,Admin";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
