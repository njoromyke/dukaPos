namespace DukaPoS.Domain.Storage;

public class BlobEntry
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = default!;
    public string FileName { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long Size { get; set; }
    public byte[] Data { get; set; } = [];
    public string Category { get; set; } = default!;
    public Guid? ReferenceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
