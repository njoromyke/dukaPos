using DukaPoS.Domain.Expenses;
using DukaPoS.Domain.Fiscal;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Domain.Tenancy;
using Marten;
using Weasel.Core;

namespace DukaPoS.Infrastructure.Persistence;

public static class MartenConfig
{
    public static StoreOptions ConfigureDukaPoS(this StoreOptions opts, string connectionString)
    {
        opts.Connection(connectionString);
        opts.AutoCreateSchemaObjects = AutoCreate.All;

        opts.Policies.AllDocumentsAreMultiTenanted();

        // Identity
        opts.Schema.For<User>().Index(x => x.Email);
        opts.Schema.For<User>().Index(x => x.PinHash!);
        opts.Schema.For<TerminalSession>().Index(x => x.UserId);
        opts.Schema.For<AuditLogEntry>().Index(x => x.CreatedAt);

        // Tenancy (stored in default tenant)
        opts.Schema.For<Tenant>().Index(x => x.Slug, i => i.IsUnique = true);

        // Inventory
        opts.Schema.For<Product>().Index(x => x.Barcode!);
        opts.Schema.For<Product>().Index(x => x.Sku);
        opts.Schema.For<Product>().FullTextIndex(x => x.Name);
        opts.Schema.For<Category>().Index(x => x.Name);
        opts.Schema.For<StockLevel>()
            .Index(x => new { x.ProductId, x.BranchId }, i => i.IsUnique = true);
        opts.Schema.For<StockMovement>().Index(x => x.ProductId);
        opts.Schema.For<Supplier>().Index(x => x.Name);
        opts.Schema.For<PurchaseOrder>().Index(x => x.Status);

        // Sales
        opts.Schema.For<Sale>().Index(x => x.Status);
        opts.Schema.For<Sale>().Index(x => x.BranchId);
        opts.Schema.For<Tab>().Index(x => x.SaleId);

        // Payments
        opts.Schema.For<Payment>().Index(x => x.SaleId);
        opts.Schema.For<Payment>().Index(x => x.CheckoutRequestId!);

        // Fiscal
        opts.Schema.For<FiscalInvoice>().Index(x => x.SaleId);
        opts.Schema.For<FiscalInvoice>().Index(x => x.SubmissionStatus);

        // Expenses
        opts.Schema.For<Expense>().Index(x => x.BranchId);
        opts.Schema.For<Expense>().Index(x => x.Date);
        opts.Schema.For<Expense>().Index(x => x.Category);

        return opts;
    }
}
