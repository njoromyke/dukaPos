namespace DukaPoS.Messages.Storage;

public record UploadBlobCommand(string FileName, string ContentType, byte[] Data, string Category, Guid? ReferenceId);
public record GetBlobQuery(Guid Id);
public record DeleteBlobCommand(Guid Id);
public record BlobDto(Guid Id, string FileName, string ContentType, long Size, string Category, Guid? ReferenceId, DateTimeOffset CreatedAt);
