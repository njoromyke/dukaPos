namespace DukaPoS.Domain.Identity;

public class AuditLogArchive
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = default!;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = default!;
    public string Action { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? RequestPath { get; set; }
    public string? HttpMethod { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTimeOffset OriginalCreatedAt { get; set; }
    public DateTimeOffset ArchivedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? ArchiveBatchId { get; set; }
}
