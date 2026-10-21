namespace DukaPoS.Domain.Subscriptions;

public class Package
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public PackageTier Tier { get; set; }
    public string Description { get; set; } = default!;
    public decimal MonthlyPrice { get; set; }
    public decimal? LifetimePrice { get; set; }
    public List<string> Features { get; set; } = [];
    public int MaxBranches { get; set; } = 1;
    public int MaxUsers { get; set; } = 5;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
