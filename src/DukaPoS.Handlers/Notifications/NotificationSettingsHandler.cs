using DukaPoS.Domain.Notifications;
using DukaPoS.Infrastructure.Notifications;
using DukaPoS.Messages.Notifications;
using Marten;

namespace DukaPoS.Handlers.Notifications;

public static class GetNotificationSettingsHandler
{
    public static async Task<NotificationSettingsDto> Handle(GetNotificationSettingsQuery query, IQuerySession session)
    {
        var settings = await session.Query<NotificationSettings>().FirstOrDefaultAsync();
        if (settings == null)
            return new NotificationSettingsDto(Guid.Empty, true, false, true, [], [], 0);

        return new NotificationSettingsDto(
            settings.Id,
            settings.LowStockEmailEnabled,
            settings.LowStockSmsEnabled,
            settings.LowStockPushEnabled,
            settings.AlertEmailRecipients,
            settings.AlertSmsRecipients,
            settings.ExpoPushTokens.Count);
    }
}

public static class UpdateNotificationSettingsHandler
{
    public static async Task<NotificationSettingsDto> Handle(UpdateNotificationSettingsCommand command, IDocumentSession session)
    {
        var settings = await session.Query<NotificationSettings>().FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new NotificationSettings
            {
                Id = Guid.NewGuid(),
                TenantId = Guid.TryParse(session.TenantId, out var tid) ? tid : Guid.Empty,
            };
        }

        settings.LowStockEmailEnabled = command.LowStockEmailEnabled;
        settings.LowStockSmsEnabled = command.LowStockSmsEnabled;
        settings.LowStockPushEnabled = command.LowStockPushEnabled;
        settings.AlertEmailRecipients = command.AlertEmailRecipients;
        settings.AlertSmsRecipients = command.AlertSmsRecipients;
        settings.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(settings);
        await session.SaveChangesAsync();

        return new NotificationSettingsDto(
            settings.Id,
            settings.LowStockEmailEnabled,
            settings.LowStockSmsEnabled,
            settings.LowStockPushEnabled,
            settings.AlertEmailRecipients,
            settings.AlertSmsRecipients,
            settings.ExpoPushTokens.Count);
    }
}

public static class RegisterExpoPushTokenHandler
{
    public static async Task Handle(RegisterExpoPushTokenCommand command, IDocumentSession session)
    {
        var settings = await session.Query<NotificationSettings>().FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new NotificationSettings
            {
                Id = Guid.NewGuid(),
                TenantId = Guid.TryParse(session.TenantId, out var tid) ? tid : Guid.Empty,
            };
        }

        if (!settings.ExpoPushTokens.Contains(command.Token))
        {
            settings.ExpoPushTokens.Add(command.Token);
            settings.UpdatedAt = DateTimeOffset.UtcNow;
            session.Store(settings);
            await session.SaveChangesAsync();
        }
    }
}

public static class RemoveExpoPushTokenHandler
{
    public static async Task Handle(RemoveExpoPushTokenCommand command, IDocumentSession session)
    {
        var settings = await session.Query<NotificationSettings>().FirstOrDefaultAsync();
        if (settings == null) return;

        if (settings.ExpoPushTokens.Remove(command.Token))
        {
            settings.UpdatedAt = DateTimeOffset.UtcNow;
            session.Store(settings);
            await session.SaveChangesAsync();
        }
    }
}

public static class SendPushNotificationHandler
{
    public static async Task<NotificationDeliveryDto> Handle(SendPushNotificationCommand command, IDocumentStore store, IPushNotificationService pushService)
    {
        await using var session = store.LightweightSession(command.TenantId.ToString());
        var settings = await session.Query<NotificationSettings>()
            .FirstOrDefaultAsync(n => n.TenantId == command.TenantId);

        var tokens = settings?.ExpoPushTokens ?? [];
        var sent = tokens.Count > 0 && await pushService.SendAsync(tokens, command.Title, command.Body, command.Data);

        var delivery = new NotificationDelivery
        {
            Id = Guid.NewGuid(),
            TenantId = command.TenantId,
            Title = command.Title,
            Body = command.Body,
            Status = tokens.Count == 0 ? "No devices" : sent ? "Sent" : "Failed",
        };
        session.Store(delivery);
        await session.SaveChangesAsync();
        return new NotificationDeliveryDto(delivery.Id, delivery.Channel, delivery.Title, delivery.Body, delivery.Status, delivery.SentAt, delivery.ResentFromId);
    }
}

public static class GetNotificationHistoryHandler
{
    public static async Task<NotificationHistoryResult> Handle(GetNotificationHistoryQuery query, IQuerySession session)
    {
        IQueryable<NotificationDelivery> deliveriesQuery = session.Query<NotificationDelivery>();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            deliveriesQuery = deliveriesQuery.Where(item => item.Title.Contains(search) || item.Body.Contains(search) || item.Channel.Contains(search) || item.Status.Contains(search));
        }

        var total = await deliveriesQuery.CountAsync();
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var items = await deliveriesQuery.OrderByDescending(item => item.SentAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var result = items.Select(item => new NotificationDeliveryDto(item.Id, item.Channel, item.Title, item.Body, item.Status, item.SentAt, item.ResentFromId)).ToList();
        return new NotificationHistoryResult(result, total, page, pageSize);
    }
}

public static class ResendNotificationHandler
{
    public static async Task<NotificationDeliveryDto> Handle(ResendNotificationCommand command, IDocumentStore store, IPushNotificationService pushService)
    {
        await using var session = store.LightweightSession(command.TenantId.ToString());
        var original = await session.LoadAsync<NotificationDelivery>(command.NotificationId)
            ?? throw new InvalidOperationException("Notification not found.");
        var settings = await session.Query<NotificationSettings>().FirstOrDefaultAsync(item => item.TenantId == command.TenantId);
        var tokens = settings?.ExpoPushTokens ?? [];
        var sent = tokens.Count > 0 && await pushService.SendAsync(tokens, original.Title, original.Body);

        var delivery = new NotificationDelivery
        {
            Id = Guid.NewGuid(),
            TenantId = command.TenantId,
            Title = original.Title,
            Body = original.Body,
            Status = tokens.Count == 0 ? "No devices" : sent ? "Sent" : "Failed",
            ResentFromId = original.Id,
        };
        session.Store(delivery);
        await session.SaveChangesAsync();
        return new NotificationDeliveryDto(delivery.Id, delivery.Channel, delivery.Title, delivery.Body, delivery.Status, delivery.SentAt, delivery.ResentFromId);
    }
}
