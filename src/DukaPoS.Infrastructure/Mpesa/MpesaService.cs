using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace DukaPoS.Infrastructure.Mpesa;

public interface IMpesaService
{
    Task<StkPushResponse> InitiateStkPushAsync(MpesaConfig config, string phoneNumber, decimal amount, string accountReference);
}

public class MpesaService : IMpesaService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MpesaService> _logger;
    private readonly Dictionary<string, (string Token, DateTime Expiry)> _tokens = new();
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    public MpesaService(HttpClient httpClient, ILogger<MpesaService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<StkPushResponse> InitiateStkPushAsync(MpesaConfig config, string phoneNumber, decimal amount, string accountReference)
    {
        var token = await GetAccessTokenAsync(config);
        _httpClient.BaseAddress = new Uri(config.BaseUrl);

        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var shortCode = config.ShortCode;
        var passkey = config.Passkey;
        var password = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{shortCode}{passkey}{timestamp}"));

        var formattedPhone = FormatPhoneNumber(phoneNumber);

        var payload = new
        {
            BusinessShortCode = shortCode,
            Password = password,
            Timestamp = timestamp,
            TransactionType = "CustomerPayBillOnline",
            Amount = Math.Ceiling(amount),
            PartyA = formattedPhone,
            PartyB = shortCode,
            PhoneNumber = formattedPhone,
            CallBackURL = config.CallbackUrl,
            AccountReference = accountReference,
            TransactionDesc = $"Payment for {accountReference}",
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "mpesa/stkpush/v1/processrequest")
        {
            Content = JsonContent.Create(payload),
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("M-Pesa STK Push response: {Body}", body);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"M-Pesa STK Push failed: {body}");
        }

        var result = JsonSerializer.Deserialize<MpesaStkApiResponse>(body)
            ?? throw new InvalidOperationException("Failed to parse M-Pesa response");

        if (result.ResponseCode != "0")
        {
            throw new InvalidOperationException($"M-Pesa STK Push rejected: {result.ResponseDescription}");
        }

        return new StkPushResponse(
            result.CheckoutRequestID!,
            result.MerchantRequestID!,
            result.ResponseDescription ?? "Success");
    }

    private async Task<string> GetAccessTokenAsync(MpesaConfig config)
    {
        var key = $"{config.BaseUrl}|{config.ConsumerKey}";
        await _tokenLock.WaitAsync();
        try
        {
            if (_tokens.TryGetValue(key, out var cached) && DateTime.UtcNow < cached.Expiry) return cached.Token;

            _httpClient.BaseAddress = new Uri(config.BaseUrl);
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{config.ConsumerKey}:{config.ConsumerSecret}"));

            var request = new HttpRequestMessage(HttpMethod.Get, "oauth/v1/generate?grant_type=client_credentials");
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var tokenResponse = await response.Content.ReadFromJsonAsync<MpesaTokenResponse>()
                ?? throw new InvalidOperationException("Failed to get M-Pesa access token");

            _tokens[key] = (tokenResponse.AccessToken, DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60));
            return tokenResponse.AccessToken;
        }
        finally { _tokenLock.Release(); }
    }

    private static string FormatPhoneNumber(string phone)
    {
        phone = phone.Trim().Replace(" ", "").Replace("-", "");

        if (phone.StartsWith("+254"))
        {
            return phone[1..];
        }

        if (phone.StartsWith("0"))
        {
            return "254" + phone[1..];
        }

        if (phone.StartsWith("254"))
        {
            return phone;
        }

        return "254" + phone;
    }
}

public record StkPushResponse(string CheckoutRequestId, string MerchantRequestId, string ResponseDescription);

internal class MpesaTokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = default!;

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }
}

internal class MpesaStkApiResponse
{
    public string? MerchantRequestID { get; set; }
    public string? CheckoutRequestID { get; set; }
    public string? ResponseCode { get; set; }
    public string? ResponseDescription { get; set; }
    public string? CustomerMessage { get; set; }
}
