namespace DukaPoS.Messages.Audit;

public record CreateAuditLogCommand(
    Guid UserId,
    string UserName,
    string Action,
    string EntityType,
    Guid EntityId,
    string? Details = null,
    string? IpAddress = null,
    string? UserAgent = null,
    string? RequestPath = null,
    string? HttpMethod = null,
    string? OldValue = null,
    string? NewValue = null);

public record GetAuditLogsQuery(
    Guid? UserId = null,
    string? Action = null,
    string? EntityType = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    int Page = 1,
    int PageSize = 50);

public record AuditLogsResult(IReadOnlyList<AuditLogDto> Items, int TotalCount, int Page, int PageSize);

public record AuditLogDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Action,
    string EntityType,
    Guid EntityId,
    string? Details,
    string? IpAddress,
    string? UserAgent,
    string? RequestPath,
    string? HttpMethod,
    DateTimeOffset CreatedAt);
