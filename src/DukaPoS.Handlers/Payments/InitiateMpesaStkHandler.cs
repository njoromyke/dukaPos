using DukaPoS.Domain;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Infrastructure.Mpesa;
using DukaPoS.Messages.Payments;
using Marten;
using Microsoft.AspNetCore.DataProtection;
using System.Text.Json;

namespace DukaPoS.Handlers.Payments;

public static class InitiateMpesaStkHandler
{
    public static async Task<MpesaStkResult> Handle(
        InitiateMpesaStkCommand command,
        IDocumentSession session,
        IMpesaService mpesaService,
        IDataProtectionProvider protectionProvider,
        Microsoft.Extensions.Configuration.IConfiguration configuration,
        IDocumentStore store)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        if (sale.Status is not (SaleStatus.Active or SaleStatus.AwaitingPayment))
            throw new InvalidOperationException($"Cannot accept payment for a sale in {sale.Status} status.");
        if (command.Amount <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");
        var confirmedPayments = await session.Query<Payment>()
            .Where(payment => payment.SaleId == sale.Id && payment.Status == PaymentStatus.Confirmed)
            .ToListAsync();
        var remainingBalance = sale.GrandTotal - confirmedPayments.Sum(payment => payment.Amount);
        if (remainingBalance <= 0 || command.Amount > remainingBalance)
            throw new InvalidOperationException($"Payment amount exceeds the remaining balance of {Math.Max(0, remainingBalance):N2}.");

        sale.Status = SaleStatus.AwaitingPayment;
        session.Store(sale);

        var settings = await session.LoadAsync<BranchMpesaSettings>(sale.BranchId);
        var config = new MpesaConfig();
        if (settings is not null)
        {
            var protector = protectionProvider.CreateProtector("DukaPoS.BranchMpesaCredentials.v1");
            var credentials = JsonSerializer.Deserialize<MpesaCredentials>(protector.Unprotect(settings.ProtectedCredentials))
                ?? throw new InvalidOperationException("M-Pesa settings are invalid.");
            config.ConsumerKey = credentials.ConsumerKey;
            config.ConsumerSecret = credentials.ConsumerSecret;
            config.Passkey = credentials.Passkey;
            config.ShortCode = settings.ShortCode;
            config.Environment = settings.Environment;
            config.CallbackUrl = configuration["Mpesa:CallbackUrl"] ?? string.Empty;
        }
        else
            throw new InvalidOperationException("M-Pesa is not configured for this branch.");

        var stkResponse = await mpesaService.InitiateStkPushAsync(config,
            command.PhoneNumber,
            command.Amount,
            sale.SaleNumber);

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            SaleId = command.SaleId,
            Method = PaymentMethod.Mpesa,
            Amount = command.Amount,
            MpesaPhone = command.PhoneNumber,
            CheckoutRequestId = stkResponse.CheckoutRequestId,
            MpesaMerchantRequestId = stkResponse.MerchantRequestId,
            Status = PaymentStatus.Pending,
        };

        session.Store(payment);
        await session.SaveChangesAsync();

        await using (var routingSession = store.LightweightSession())
        {
            routingSession.Store(new MpesaCallbackRoute
            {
                Id = stkResponse.CheckoutRequestId,
                TenantId = session.TenantId,
                BranchId = sale.BranchId,
                SaleId = sale.Id,
            });
            await routingSession.SaveChangesAsync();
        }

        return new MpesaStkResult(
            stkResponse.CheckoutRequestId,
            stkResponse.MerchantRequestId,
            stkResponse.ResponseDescription);
    }

    private sealed record MpesaCredentials(string ConsumerKey, string ConsumerSecret, string Passkey);
}
