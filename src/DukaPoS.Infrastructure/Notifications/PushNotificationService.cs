using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace DukaPoS.Infrastructure.Notifications;

public interface IPushNotificationService
{
    Task<bool> SendAsync(IReadOnlyList<string> expoPushTokens, string title, string body,
        Dictionary<string, string>? data = null, CancellationToken ct = default);
}

public class ExpoPushNotificationService : IPushNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ExpoPushNotificationService> _logger;

    public ExpoPushNotificationService(HttpClient httpClient, ILogger<ExpoPushNotificationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<bool> SendAsync(IReadOnlyList<string> expoPushTokens, string title, string body,
        Dictionary<string, string>? data = null, CancellationToken ct = default)
    {
        if (expoPushTokens.Count == 0) return false;

        var messages = expoPushTokens.Select(token => new
        {
            to = token,
            title,
            body,
            sound = "default",
            data = data ?? new Dictionary<string, string>(),
        }).ToList();

        try
        {
            var response = await _httpClient.PostAsJsonAsync("https://exp.host/--/api/v2/push/send", messages, ct);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Push notifications sent to {Count} devices", expoPushTokens.Count);
                return true;
            }
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Push notification failed: {Status} {Body}", response.StatusCode, responseBody);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send push notifications");
            return false;
        }
    }
}
