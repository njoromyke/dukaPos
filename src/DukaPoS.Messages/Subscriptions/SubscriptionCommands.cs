using DukaPoS.Domain;

namespace DukaPoS.Messages.Subscriptions;

// ── Package management (SuperAdmin) ──
public record CreatePackageCommand(
    string Name,
    PackageTier Tier,
    string Description,
    decimal MonthlyPrice,
    decimal? LifetimePrice,
    List<string> Features,
    int MaxBranches,
    int MaxUsers);

public record UpdatePackageCommand(
    Guid Id,
    string Name,
    string Description,
    decimal MonthlyPrice,
    decimal? LifetimePrice,
    List<string> Features,
    int MaxBranches,
    int MaxUsers,
    bool IsActive);

public record GetPackagesQuery();

// ── Subscription lifecycle ──
public record CreateSubscriptionCommand(
    Guid TenantId,
    Guid PackageId,
    BillingCycle BillingCycle,
    DateOnly? StartDate = null);

public record GetSubscriptionInvoicesQuery(int Page = 1, int PageSize = 50, string? Status = null);
public record GetAdminSubscriptionsQuery();
public record MarkSubscriptionInvoicePaidCommand(Guid InvoiceId, string PaymentMethod, string? TransactionReference, string? Notes);

public record CreateTrialSubscriptionCommand(
    Guid TenantId,
    int TrialDays = 14);

public record RenewSubscriptionCommand(
    Guid SubscriptionId,
    string PaymentMethod,
    string? TransactionReference,
    decimal Amount);

public record CancelSubscriptionCommand(Guid SubscriptionId);

public record ChangePackageCommand(
    Guid SubscriptionId,
    Guid NewPackageId,
    BillingCycle NewBillingCycle);

public record GetSubscriptionQuery(Guid TenantId);
public record GetSubscriptionPaymentsQuery(Guid TenantId, int Page = 1, int PageSize = 20);

public record CheckExpiredSubscriptionsCommand();

// ── DTOs ──
public record PackageDto(
    Guid Id,
    string Name,
    PackageTier Tier,
    string Description,
    decimal MonthlyPrice,
    decimal? LifetimePrice,
    List<string> Features,
    int MaxBranches,
    int MaxUsers,
    bool IsActive);

public record SubscriptionDto(
    Guid Id,
    Guid TenantId,
    Guid PackageId,
    string PackageName,
    PackageTier Tier,
    BillingCycle BillingCycle,
    SubscriptionStatus Status,
    decimal PricePerCycle,
    DateTimeOffset StartDate,
    DateTimeOffset? CurrentPeriodStart,
    DateTimeOffset? CurrentPeriodEnd,
    DateTimeOffset? ExpiresAt,
    List<string> Features,
    DateTimeOffset? LastPaymentAt);

public record SubscriptionPaymentDto(
    Guid Id,
    decimal Amount,
    string PaymentMethod,
    string? TransactionReference,
    DateTimeOffset PeriodStart,
    DateTimeOffset PeriodEnd,
    DateTimeOffset PaidAt,
    string? Notes);

public record SubscriptionInvoiceDto(
    Guid Id,
    Guid TenantId,
    string TenantName,
    Guid SubscriptionId,
    string InvoiceNumber,
    DateTimeOffset IssuedAt,
    DateTimeOffset DueAt,
    DateTimeOffset PeriodStart,
    DateTimeOffset? PeriodEnd,
    decimal Amount,
    SubscriptionInvoiceStatus Status,
    DateTimeOffset? PaidAt,
    string? PaymentMethod,
    string? TransactionReference,
    string? Notes);

public record AdminSubscriptionDto(
    Guid Id,
    Guid TenantId,
    string TenantName,
    string TenantSlug,
    Guid PackageId,
    string PackageName,
    BillingCycle BillingCycle,
    SubscriptionStatus Status,
    decimal PricePerCycle,
    DateTimeOffset StartDate,
    DateTimeOffset? CurrentPeriodEnd,
    DateTimeOffset? ExpiresAt);
