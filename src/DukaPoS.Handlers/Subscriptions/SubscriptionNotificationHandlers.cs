using DukaPoS.Infrastructure.Notifications;
using DukaPoS.Messages.Subscriptions;

namespace DukaPoS.Handlers.Subscriptions;

public static class SubscriptionExpiringSoonHandler
{
    public static async Task Handle(SubscriptionExpiringSoonEvent evt, IEmailService emailService)
    {
        var subject = $"DukaPoS — Your subscription expires in {evt.DaysRemaining} day(s)";
        var body = $"""
            <h2>Hi {evt.TenantName},</h2>
            <p>Your DukaPoS subscription will expire on <strong>{evt.ExpiresAt:dd MMM yyyy}</strong> ({evt.DaysRemaining} day(s) remaining).</p>
            <p>Please renew your subscription to avoid service interruption.</p>
            <p>Thank you,<br/>The DukaPoS Team</p>
            """;

        await emailService.SendAsync(evt.TenantEmail, subject, body);
    }
}

public static class SubscriptionExpiredHandler
{
    public static async Task Handle(SubscriptionExpiredEvent evt, IEmailService emailService)
    {
        var subject = "DukaPoS — Your subscription has expired";
        var body = $"""
            <h2>Hi {evt.TenantName},</h2>
            <p>Your DukaPoS subscription has expired. Your access has been restricted.</p>
            <p>Please renew your subscription to restore full access to all features.</p>
            <p>Thank you,<br/>The DukaPoS Team</p>
            """;

        await emailService.SendAsync(evt.TenantEmail, subject, body);
    }
}
