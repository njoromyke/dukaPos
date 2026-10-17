using DukaPoS.Domain.Storage;
using DukaPoS.Messages.Storage;
using Marten;

namespace DukaPoS.Handlers.Storage;

public static class UploadBlobHandler
{
    public static async Task<BlobDto> Handle(UploadBlobCommand command, IDocumentSession session)
    {
        var blob = new BlobEntry
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            FileName = command.FileName,
            ContentType = command.ContentType,
            Size = command.Data.Length,
            Data = command.Data,
            Category = command.Category,
            ReferenceId = command.ReferenceId,
        };

        session.Store(blob);
        await session.SaveChangesAsync();

        return new BlobDto(blob.Id, blob.FileName, blob.ContentType, blob.Size, blob.Category, blob.ReferenceId, blob.CreatedAt);
    }
}

public static class GetBlobHandler
{
    public static async Task<BlobEntry> Handle(GetBlobQuery query, IQuerySession session)
    {
        return await session.LoadAsync<BlobEntry>(query.Id)
            ?? throw new InvalidOperationException("File not found.");
    }
}

public static class DeleteBlobHandler
{
    public static async Task Handle(DeleteBlobCommand command, IDocumentSession session)
    {
        var blob = await session.LoadAsync<BlobEntry>(command.Id)
            ?? throw new InvalidOperationException("File not found.");
        session.Delete(blob);
        await session.SaveChangesAsync();
    }
}
