using DukaPoS.Domain.Sales;
using DukaPoS.Domain.Storage;
using DukaPoS.Infrastructure.Printing;
using Marten;

namespace DukaPoS.Handlers.Printing;

public record GenerateReceiptCommand(Guid SaleId, string BusinessName, string BranchName, string? BranchAddress, string PaymentMethod, decimal AmountPaid, decimal Change, string? MpesaRef);

public record ReceiptResult(byte[] Data, string SaleNumber, Guid BlobId);

public static class GenerateReceiptHandler
{
    public static async Task<ReceiptResult> Handle(
        GenerateReceiptCommand command,
        IDocumentSession session,
        IReceiptPrinter printer)
    {
        var sale = await session.LoadAsync<Sale>(command.SaleId)
            ?? throw new InvalidOperationException("Sale not found");

        var receiptData = new ReceiptData
        {
            BusinessName = command.BusinessName,
            BranchName = command.BranchName,
            BranchAddress = command.BranchAddress,
            SaleNumber = sale.SaleNumber,
            Timestamp = sale.CompletedAt ?? sale.StartedAt,
            CashierName = sale.CashierName,
            LineItems = sale.LineItems.Select(li => new ReceiptLineItem
            {
                ProductName = li.ProductName,
                Quantity = li.Quantity,
                UnitPrice = li.UnitPrice,
                LineTotal = li.LineTotal,
            }).ToList(),
            Subtotal = sale.Subtotal,
            VatTotal = sale.VatTotal,
            DiscountTotal = sale.DiscountTotal,
            GrandTotal = sale.GrandTotal,
            PaymentMethod = command.PaymentMethod,
            AmountPaid = command.AmountPaid,
            Change = command.Change,
            MpesaRef = command.MpesaRef,
        };

        var bytes = printer.GenerateReceipt(receiptData);

        var blob = new BlobEntry
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            FileName = $"receipt-{sale.SaleNumber}.bin",
            ContentType = "application/octet-stream",
            Size = bytes.Length,
            Data = bytes,
            Category = "receipt",
            ReferenceId = sale.Id,
        };
        session.Store(blob);
        await session.SaveChangesAsync();

        return new ReceiptResult(bytes, sale.SaleNumber, blob.Id);
    }
}
