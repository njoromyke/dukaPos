namespace DukaPoS.Domain.Notifications;

public class NotificationSettings
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public bool LowStockEmailEnabled { get; set; } = true;
    public bool LowStockSmsEnabled { get; set; }
    public bool LowStockPushEnabled { get; set; } = true;
    public List<string> AlertEmailRecipients { get; set; } = [];
    public List<string> AlertSmsRecipients { get; set; } = [];
    public List<string> ExpoPushTokens { get; set; } = [];
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
