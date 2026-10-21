using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Audit;
using Marten;

namespace DukaPoS.Handlers.Audit;

public static class ArchiveAuditLogsHandler
{
    public static async Task<ArchiveAuditLogsResult> Handle(ArchiveAuditLogsCommand command, IDocumentSession session)
    {
        var batchId = $"archive_{DateTimeOffset.UtcNow:yyyyMMdd_HHmmss}";

        var oldEntries = await session.Query<AuditLogEntry>()
            .Where(a => a.CreatedAt < command.OlderThan)
            .OrderBy(a => a.CreatedAt)
            .Take(5000)
            .ToListAsync();

        if (oldEntries.Count == 0)
            return new ArchiveAuditLogsResult(0, batchId);

        foreach (var entry in oldEntries)
        {
            var archive = new AuditLogArchive
            {
                Id = Guid.NewGuid(),
                TenantId = entry.TenantId,
                UserId = entry.UserId,
                UserName = entry.UserName,
                Action = entry.Action,
                EntityType = entry.EntityType,
                EntityId = entry.EntityId,
                Details = entry.Details,
                IpAddress = entry.IpAddress,
                UserAgent = entry.UserAgent,
                RequestPath = entry.RequestPath,
                HttpMethod = entry.HttpMethod,
                OldValue = entry.OldValue,
                NewValue = entry.NewValue,
                OriginalCreatedAt = entry.CreatedAt,
                ArchiveBatchId = batchId,
            };
            session.Store(archive);
            session.Delete(entry);
        }

        await session.SaveChangesAsync();

        return new ArchiveAuditLogsResult(oldEntries.Count, batchId);
    }
}

public static class GetArchivedAuditLogsHandler
{
    public static async Task<ArchivedAuditLogsResult> Handle(GetArchivedAuditLogsQuery query, IQuerySession session)
    {
        var q = session.Query<AuditLogArchive>().AsQueryable();

        if (!string.IsNullOrEmpty(query.Action))
            q = q.Where(a => a.Action == query.Action);
        if (query.From.HasValue)
            q = q.Where(a => a.OriginalCreatedAt >= query.From.Value);
        if (query.To.HasValue)
            q = q.Where(a => a.OriginalCreatedAt < query.To.Value);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.OriginalCreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var dtos = items.Select(a => new AuditLogDto(
            a.Id, a.UserId, a.UserName, a.Action, a.EntityType, a.EntityId,
            a.Details, a.IpAddress, a.UserAgent, a.RequestPath, a.HttpMethod, a.OriginalCreatedAt
        )).ToList();

        return new ArchivedAuditLogsResult(dtos, total, query.Page, query.PageSize);
    }
}
