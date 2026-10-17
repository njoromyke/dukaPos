namespace DukaPoS.Infrastructure.Mpesa;

public class MpesaConfig
{
    public string ConsumerKey { get; set; } = default!;
    public string ConsumerSecret { get; set; } = default!;
    public string Passkey { get; set; } = default!;
    public string ShortCode { get; set; } = "174379";
    public string CallbackUrl { get; set; } = default!;
    public string Environment { get; set; } = "sandbox";

    public string BaseUrl => Environment == "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
}
