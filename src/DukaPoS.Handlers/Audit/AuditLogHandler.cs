using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Audit;
using Marten;

namespace DukaPoS.Handlers.Audit;

public static class CreateAuditLogHandler
{
    public static async Task Handle(CreateAuditLogCommand command, IDocumentSession session)
    {
        var entry = new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            UserId = command.UserId,
            UserName = command.UserName,
            Action = command.Action,
            EntityType = command.EntityType,
            EntityId = command.EntityId,
            Details = command.Details,
            IpAddress = command.IpAddress,
            UserAgent = command.UserAgent,
            RequestPath = command.RequestPath,
            HttpMethod = command.HttpMethod,
            OldValue = command.OldValue,
            NewValue = command.NewValue,
        };

        session.Store(entry);
        await session.SaveChangesAsync();
    }
}

public static class GetAuditLogsHandler
{
    public static async Task<AuditLogsResult> Handle(GetAuditLogsQuery query, IQuerySession session)
    {
        var q = session.Query<AuditLogEntry>().AsQueryable();

        if (query.UserId.HasValue)
            q = q.Where(a => a.UserId == query.UserId.Value);
        if (!string.IsNullOrEmpty(query.Action))
            q = q.Where(a => a.Action == query.Action);
        if (!string.IsNullOrEmpty(query.EntityType))
            q = q.Where(a => a.EntityType == query.EntityType);
        if (query.From.HasValue)
            q = q.Where(a => a.CreatedAt >= query.From.Value);
        if (query.To.HasValue)
            q = q.Where(a => a.CreatedAt < query.To.Value);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var dtos = items.Select(a => new AuditLogDto(
            a.Id, a.UserId, a.UserName, a.Action, a.EntityType, a.EntityId,
            a.Details, a.IpAddress, a.UserAgent, a.RequestPath, a.HttpMethod, a.CreatedAt
        )).ToList();

        return new AuditLogsResult(dtos, total, query.Page, query.PageSize);
    }
}
