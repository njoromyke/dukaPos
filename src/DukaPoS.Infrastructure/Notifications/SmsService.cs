using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DukaPoS.Infrastructure.Notifications;

public interface ISmsService
{
    Task SendAsync(string phoneNumber, string message, CancellationToken ct = default);
}

public class AfricasTalkingSmsService : ISmsService
{
    private readonly SmsSettings _settings;
    private readonly ILogger<AfricasTalkingSmsService> _logger;

    public AfricasTalkingSmsService(IOptions<SmsSettings> settings, ILogger<AfricasTalkingSmsService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public Task SendAsync(string phoneNumber, string message, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.AfricasTalking.ApiKey))
        {
            _logger.LogWarning("SMS not sent — AfricasTalking API key is not configured. Message: {Message}", message);
            return Task.CompletedTask;
        }

        _logger.LogInformation("SMS would be sent to {Phone}: {Message}", phoneNumber, message);
        return Task.CompletedTask;
    }
}
