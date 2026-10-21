namespace DukaPoS.Messages.Notifications;

public record RegisterExpoPushTokenCommand(string Token);

public record RemoveExpoPushTokenCommand(string Token);

public record GetNotificationSettingsQuery;

public record UpdateNotificationSettingsCommand(
    bool LowStockEmailEnabled,
    bool LowStockSmsEnabled,
    bool LowStockPushEnabled,
    List<string> AlertEmailRecipients,
    List<string> AlertSmsRecipients);

public record SendPushNotificationCommand(
    Guid TenantId,
    string Title,
    string Body,
    Dictionary<string, string>? Data = null);

public record GetNotificationHistoryQuery(int Page = 1, int PageSize = 10, string? Search = null);
public record ResendNotificationCommand(Guid TenantId, Guid NotificationId);
public record NotificationDeliveryDto(Guid Id, string Channel, string Title, string Body, string Status, DateTimeOffset SentAt, Guid? ResentFromId);
public record NotificationHistoryResult(IReadOnlyList<NotificationDeliveryDto> Items, int TotalCount, int Page, int PageSize);

public record NotificationSettingsDto(
    Guid Id,
    bool LowStockEmailEnabled,
    bool LowStockSmsEnabled,
    bool LowStockPushEnabled,
    List<string> AlertEmailRecipients,
    List<string> AlertSmsRecipients,
    int RegisteredDevices);
