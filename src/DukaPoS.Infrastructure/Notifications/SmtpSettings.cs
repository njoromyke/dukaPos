namespace DukaPoS.Infrastructure.Notifications;

public class SmtpSettings
{
    public string Host { get; set; } = default!;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = default!;
    public string Password { get; set; } = default!;
    public string FromAddress { get; set; } = default!;
    public string FromName { get; set; } = default!;
    public int TimeoutMs { get; set; } = 30000;
}

public class SmsSettings
{
    public string Provider { get; set; } = "AfricasTalking";
    public AfricasTalkingSettings AfricasTalking { get; set; } = new();
}

public class AfricasTalkingSettings
{
    public string ApiKey { get; set; } = default!;
    public string Username { get; set; } = "sandbox";
    public string SenderId { get; set; } = default!;
}
