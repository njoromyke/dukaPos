using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DukaPoS.Infrastructure.Mpesa;

public interface IMpesaService
{
    Task<StkPushResponse> InitiateStkPushAsync(string phoneNumber, decimal amount, string accountReference);
}

public class MpesaService : IMpesaService
{
    private readonly HttpClient _httpClient;
    private readonly MpesaConfig _config;
    private readonly ILogger<MpesaService> _logger;
    private string? _cachedToken;
    private DateTime _tokenExpiry = DateTime.MinValue;

    public MpesaService(HttpClient httpClient, IOptions<MpesaConfig> config, ILogger<MpesaService> logger)
    {
        _httpClient = httpClient;
        _config = config.Value;
        _logger = logger;
        _httpClient.BaseAddress = new Uri(_config.BaseUrl);
    }

    public async Task<StkPushResponse> InitiateStkPushAsync(string phoneNumber, decimal amount, string accountReference)
    {
        var token = await GetAccessTokenAsync();

        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var shortCode = _config.ShortCode;
        var passkey = _config.Passkey;
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
            CallBackURL = _config.CallbackUrl,
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

    private async Task<string> GetAccessTokenAsync()
    {
        if (_cachedToken != null && DateTime.UtcNow < _tokenExpiry)
        {
            return _cachedToken;
        }

        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_config.ConsumerKey}:{_config.ConsumerSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Get, "oauth/v1/generate?grant_type=client_credentials");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var tokenResponse = await response.Content.ReadFromJsonAsync<MpesaTokenResponse>()
            ?? throw new InvalidOperationException("Failed to get M-Pesa access token");

        _cachedToken = tokenResponse.AccessToken;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60);

        return _cachedToken;
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
