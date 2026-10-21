using DukaPoS.Domain.Notifications;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Infrastructure.Notifications;
using DukaPoS.Messages.Inventory;
using Marten;
using Microsoft.AspNetCore.SignalR;
using DukaPoS.Infrastructure.Hubs;
using Microsoft.Extensions.Logging;

namespace DukaPoS.Handlers.Inventory;

public static class LowStockAlertHandler
{
    public static async Task Handle(
        StockDepletedEvent @event,
        IDocumentStore store,
        IEmailService emailService,
        ISmsService smsService,
        IPushNotificationService pushService,
        IHubContext<StockHub> stockHub,
        ILogger logger)
    {
        await stockHub.NotifyLowStock(@event.BranchId, new
        {
            @event.ProductId,
            @event.ProductName,
            @event.CurrentQuantity,
            @event.ReorderLevel,
            AlertedAt = DateTimeOffset.UtcNow,
        });

        await using var session = store.QuerySession();
        var tenants = await session.Query<Tenant>().ToListAsync();
        var tenant = tenants.FirstOrDefault(t => t.Branches.Any(b => b.Id == @event.BranchId));
        if (tenant == null) return;

        var branchName = tenant.Branches.FirstOrDefault(b => b.Id == @event.BranchId)?.Name ?? "Unknown branch";

        await using var tenantSession = store.QuerySession(tenant.Id.ToString());
        var settings = await tenantSession.Query<NotificationSettings>()
            .FirstOrDefaultAsync(n => n.TenantId == tenant.Id);

        var subject = $"Low Stock Alert: {branchName}";
        var message = $"{@event.ProductName} is low on stock ({@event.CurrentQuantity} remaining, reorder level: {@event.ReorderLevel}) at {branchName}.";
        var htmlBody = $"""
            <h2>Low Stock Alert</h2>
            <p><strong>Product:</strong> {@event.ProductName}</p>
            <p><strong>Branch:</strong> {branchName}</p>
            <p><strong>Current Quantity:</strong> {@event.CurrentQuantity}</p>
            <p><strong>Reorder Level:</strong> {@event.ReorderLevel}</p>
            <p>Please restock soon to avoid stockouts.</p>
            """;

        var emailRecipients = settings?.AlertEmailRecipients ?? [];
        if (emailRecipients.Count == 0 && !string.IsNullOrEmpty(tenant.Email))
            emailRecipients = [tenant.Email];

        if (settings is null or { LowStockEmailEnabled: true })
        {
            foreach (var email in emailRecipients)
            {
                try { await emailService.SendAsync(email, subject, htmlBody); }
                catch { /* logged by EmailService */ }
            }
        }

        if (settings is { LowStockSmsEnabled: true })
        {
            var smsRecipients = settings.AlertSmsRecipients;
            if (smsRecipients.Count == 0 && !string.IsNullOrEmpty(tenant.Phone))
                smsRecipients = [tenant.Phone];

            foreach (var phone in smsRecipients)
            {
                try { await smsService.SendAsync(phone, message); }
                catch { /* logged by SmsService */ }
            }
        }

        if (settings is null or { LowStockPushEnabled: true })
        {
            var tokens = settings?.ExpoPushTokens ?? [];
            if (tokens.Count > 0)
            {
                await pushService.SendAsync(tokens, subject, message, new Dictionary<string, string>
                {
                    ["type"] = "low_stock",
                    ["productId"] = @event.ProductId.ToString(),
                    ["branchId"] = @event.BranchId.ToString(),
                });
            }
        }
    }
}
