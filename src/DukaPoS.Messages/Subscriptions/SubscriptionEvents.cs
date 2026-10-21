using DukaPoS.Domain;

namespace DukaPoS.Messages.Subscriptions;

public record SubscriptionExpiringSoonEvent(
    Guid TenantId,
    Guid SubscriptionId,
    string TenantName,
    string TenantEmail,
    DateTimeOffset ExpiresAt,
    int DaysRemaining);

public record SubscriptionExpiredEvent(
    Guid TenantId,
    Guid SubscriptionId,
    string TenantName,
    string TenantEmail);

public record SubscriptionRenewedEvent(
    Guid TenantId,
    Guid SubscriptionId,
    DateTimeOffset NewPeriodEnd);
