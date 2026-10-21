namespace DukaPoS.Domain.Payments;

public class BranchMpesaSettings
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public string ProtectedCredentials { get; set; } = string.Empty;
    public string ShortCode { get; set; } = string.Empty;
    public string Environment { get; set; } = "production";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
