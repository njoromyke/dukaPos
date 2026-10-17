using System.Text;
using DukaPoS.Domain.Sales;

namespace DukaPoS.Infrastructure.Printing;

public interface IReceiptPrinter
{
    byte[] GenerateReceipt(ReceiptData data);
}

public class ReceiptPrinter : IReceiptPrinter
{
    private const byte ESC = 0x1B;
    private const byte GS = 0x1D;

    public byte[] GenerateReceipt(ReceiptData data)
    {
        using var ms = new MemoryStream();

        Initialize(ms);
        PrintHeader(ms, data);
        PrintLineItems(ms, data.LineItems);
        PrintTotals(ms, data);
        PrintPayment(ms, data);
        PrintFooter(ms, data);
        CutPaper(ms);

        return ms.ToArray();
    }

    private static void Initialize(Stream s)
    {
        s.Write([ESC, 0x40]); // ESC @ — initialize printer
    }

    private static void PrintHeader(Stream s, ReceiptData data)
    {
        SetAlignment(s, 1); // center
        SetBoldOn(s);
        SetDoubleSize(s);
        WriteText(s, data.BusinessName);
        SetNormalSize(s);
        SetBoldOff(s);
        WriteText(s, data.BranchName);
        WriteText(s, data.BranchAddress ?? "");
        WriteText(s, "");
        SetAlignment(s, 0); // left
        WriteText(s, $"Receipt: {data.SaleNumber}");
        WriteText(s, $"Date: {data.Timestamp:dd/MM/yyyy HH:mm}");
        WriteText(s, $"Cashier: {data.CashierName}");
        WriteDivider(s);
    }

    private static void PrintLineItems(Stream s, IReadOnlyList<ReceiptLineItem> items)
    {
        WriteColumns(s, "Item", "Qty", "Total", 24);

        WriteDivider(s);

        foreach (var item in items)
        {
            WriteText(s, item.ProductName);
            WriteColumns(s, $"  @{item.UnitPrice:F0}", $"{item.Quantity:F0}", $"{item.LineTotal:F0}", 24);
        }

        WriteDivider(s);
    }

    private static void PrintTotals(Stream s, ReceiptData data)
    {
        WriteRow(s, "Subtotal:", $"KES {data.Subtotal:F2}");
        WriteRow(s, "VAT:", $"KES {data.VatTotal:F2}");

        if (data.DiscountTotal > 0)
        {
            WriteRow(s, "Discount:", $"-KES {data.DiscountTotal:F2}");
        }

        SetBoldOn(s);
        WriteRow(s, "TOTAL:", $"KES {data.GrandTotal:F2}");
        SetBoldOff(s);
        WriteDivider(s);
    }

    private static void PrintPayment(Stream s, ReceiptData data)
    {
        WriteRow(s, "Paid via:", data.PaymentMethod);
        WriteRow(s, "Amount:", $"KES {data.AmountPaid:F2}");

        if (data.Change > 0)
        {
            WriteRow(s, "Change:", $"KES {data.Change:F2}");
        }

        if (!string.IsNullOrEmpty(data.MpesaRef))
        {
            WriteRow(s, "M-Pesa Ref:", data.MpesaRef);
        }

        WriteDivider(s);
    }

    private static void PrintFooter(Stream s, ReceiptData data)
    {
        SetAlignment(s, 1);
        WriteText(s, "Thank you for shopping with us!");
        WriteText(s, data.FooterMessage ?? "Powered by DukaPoS");
        WriteText(s, "");
        WriteText(s, "");
        SetAlignment(s, 0);
    }

    private static void CutPaper(Stream s)
    {
        s.Write([GS, 0x56, 0x00]); // GS V 0 — full cut
    }

    private static void SetAlignment(Stream s, byte align)
    {
        s.Write([ESC, 0x61, align]); // ESC a n
    }

    private static void SetBoldOn(Stream s)
    {
        s.Write([ESC, 0x45, 0x01]); // ESC E 1
    }

    private static void SetBoldOff(Stream s)
    {
        s.Write([ESC, 0x45, 0x00]); // ESC E 0
    }

    private static void SetDoubleSize(Stream s)
    {
        s.Write([GS, 0x21, 0x11]); // GS ! 0x11 — double width + height
    }

    private static void SetNormalSize(Stream s)
    {
        s.Write([GS, 0x21, 0x00]); // GS ! 0x00 — normal
    }

    private static void WriteText(Stream s, string text)
    {
        var bytes = Encoding.UTF8.GetBytes(text + "\n");
        s.Write(bytes);
    }

    private static void WriteDivider(Stream s)
    {
        WriteText(s, new string('-', 32));
    }

    private static void WriteRow(Stream s, string label, string value)
    {
        var gap = 32 - label.Length - value.Length;
        if (gap < 1) gap = 1;
        WriteText(s, label + new string(' ', gap) + value);
    }

    private static void WriteColumns(Stream s, string left, string mid, string right, int width)
    {
        var midStart = width / 2 - mid.Length / 2;
        var rightStart = width - right.Length;

        var sb = new StringBuilder(new string(' ', width));

        for (var i = 0; i < left.Length && i < midStart - 1; i++)
        {
            sb[i] = left[i];
        }

        for (var i = 0; i < mid.Length && midStart + i < rightStart - 1; i++)
        {
            sb[midStart + i] = mid[i];
        }

        for (var i = 0; i < right.Length; i++)
        {
            sb[rightStart + i] = right[i];
        }

        WriteText(s, sb.ToString());
    }
}

public class ReceiptData
{
    public string BusinessName { get; set; } = default!;
    public string BranchName { get; set; } = default!;
    public string? BranchAddress { get; set; }
    public string SaleNumber { get; set; } = default!;
    public DateTimeOffset Timestamp { get; set; }
    public string CashierName { get; set; } = default!;
    public IReadOnlyList<ReceiptLineItem> LineItems { get; set; } = [];
    public decimal Subtotal { get; set; }
    public decimal VatTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public string PaymentMethod { get; set; } = default!;
    public decimal AmountPaid { get; set; }
    public decimal Change { get; set; }
    public string? MpesaRef { get; set; }
    public string? FooterMessage { get; set; }
}

public class ReceiptLineItem
{
    public string ProductName { get; set; } = default!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
