namespace DukaPoS.Messages.Admin;

public record GetTenantsQuery();

public record GetTenantBranchesQuery(Guid TenantId);

public record TenantDto(
    Guid Id,
    string Name,
    string Slug,
    string KraPin,
    string Phone,
    string Email,
    bool IsActive,
    DateTimeOffset CreatedAt,
    IReadOnlyList<BranchSummaryDto> Branches);

public record BranchSummaryDto(
    Guid Id,
    string Name,
    string Address,
    string Phone,
    bool IsActive);
