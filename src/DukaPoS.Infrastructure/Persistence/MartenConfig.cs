using DukaPoS.Domain;
using DukaPoS.Domain.Expenses;
using DukaPoS.Domain.Fiscal;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Payments;
using DukaPoS.Domain.Sales;
using DukaPoS.Domain.Notifications;
using DukaPoS.Domain.Storage;
using DukaPoS.Domain.Subscriptions;
using DukaPoS.Domain.Tenancy;
using JasperFx;
using Marten;
using Weasel.Core;

namespace DukaPoS.Infrastructure.Persistence;

public static class MartenConfig
{
    public static StoreOptions ConfigureDukaPoS(this StoreOptions opts, string connectionString)
    {
        opts.Connection(connectionString);
        opts.AutoCreateSchemaObjects = AutoCreate.All;
        opts.DatabaseSchemaName = WellKnownConstants.SchemaName;

        opts.Policies.AllDocumentsAreMultiTenanted();

        // ── Identity ──
        var users = opts.Schema.For<User>();
        users.DocumentAlias($"{WellKnownConstants.TablePrefix}users");
        users.Index(x => x.Email);
        users.Index(x => x.PinHash!);

        var terminalSessions = opts.Schema.For<TerminalSession>();
        terminalSessions.DocumentAlias($"{WellKnownConstants.TablePrefix}terminal_sessions");
        terminalSessions.Index(x => x.UserId);

        var auditLogs = opts.Schema.For<AuditLogEntry>();
        auditLogs.DocumentAlias($"{WellKnownConstants.TablePrefix}audit_log_entries");
        auditLogs.Index(x => x.CreatedAt);
        auditLogs.Index(x => x.UserId);
        auditLogs.Index(x => x.Action);

        // ── Tenancy (stored in default tenant) ──
        var tenants = opts.Schema.For<Tenant>();
        tenants.DocumentAlias($"{WellKnownConstants.TablePrefix}tenants");
        tenants.Index(x => x.Slug, i => i.IsUnique = true);

        var tenantSettings = opts.Schema.For<TenantSettings>();
        tenantSettings.DocumentAlias($"{WellKnownConstants.TablePrefix}tenant_settings");
        tenantSettings.Index(x => x.TenantId);

        // ── Inventory ──
        var products = opts.Schema.For<Product>();
        products.DocumentAlias($"{WellKnownConstants.TablePrefix}products");
        products.Index(x => x.Barcode!);
        products.Index(x => x.Sku);
        products.FullTextIndex(x => x.Name);

        var categories = opts.Schema.For<Category>();
        categories.DocumentAlias($"{WellKnownConstants.TablePrefix}categories");
        categories.Index(x => x.Name);

        var stockLevels = opts.Schema.For<StockLevel>();
        stockLevels.DocumentAlias($"{WellKnownConstants.TablePrefix}stock_levels");
        stockLevels.Index(x => new { x.ProductId, x.BranchId }, i => i.IsUnique = true);

        var stockMovements = opts.Schema.For<StockMovement>();
        stockMovements.DocumentAlias($"{WellKnownConstants.TablePrefix}stock_movements");
        stockMovements.Index(x => x.ProductId);

        var suppliers = opts.Schema.For<Supplier>();
        suppliers.DocumentAlias($"{WellKnownConstants.TablePrefix}suppliers");
        suppliers.Index(x => x.Name);

        var purchaseOrders = opts.Schema.For<PurchaseOrder>();
        purchaseOrders.DocumentAlias($"{WellKnownConstants.TablePrefix}purchase_orders");
        purchaseOrders.Index(x => x.Status);

        // ── Sales ──
        var sales = opts.Schema.For<Sale>();
        sales.DocumentAlias($"{WellKnownConstants.TablePrefix}sales");
        sales.Index(x => x.Status);
        sales.Index(x => x.BranchId);

        var tabs = opts.Schema.For<Tab>();
        tabs.DocumentAlias($"{WellKnownConstants.TablePrefix}tabs");
        tabs.Index(x => x.SaleId);
        tabs.Index(x => x.BranchId);

        // ── Payments ──
        var payments = opts.Schema.For<Payment>();
        payments.DocumentAlias($"{WellKnownConstants.TablePrefix}payments");
        payments.Index(x => x.SaleId);
        payments.Index(x => x.CheckoutRequestId!);
        opts.Schema.For<MpesaCallbackRoute>().Index(x => x.TenantId);
        var mpesaCallbackLogs = opts.Schema.For<MpesaCallbackLog>();
        mpesaCallbackLogs.DocumentAlias($"{WellKnownConstants.TablePrefix}mpesa_callback_logs");
        mpesaCallbackLogs.Index(x => x.CheckoutRequestId!);
        mpesaCallbackLogs.Index(x => x.ReceivedAt);
        mpesaCallbackLogs.Index(x => x.ProcessingStatus);

        // ── Fiscal ──
        var fiscalInvoices = opts.Schema.For<FiscalInvoice>();
        fiscalInvoices.DocumentAlias($"{WellKnownConstants.TablePrefix}fiscal_invoices");
        fiscalInvoices.Index(x => x.SaleId);
        fiscalInvoices.Index(x => x.SubmissionStatus);

        // Expenses
        opts.Schema.For<Expense>().Index(x => x.BranchId);
        opts.Schema.For<Expense>().Index(x => x.Date);
        opts.Schema.For<Expense>().Index(x => x.Category);
        opts.Schema.For<Expense>().Index(x => x.Status);

        // ── Subscriptions (stored in default tenant) ──
        var packages = opts.Schema.For<Package>();
        packages.DocumentAlias($"{WellKnownConstants.TablePrefix}packages");
        packages.Index(x => x.Tier);

        var subscriptions = opts.Schema.For<Subscription>();
        subscriptions.DocumentAlias($"{WellKnownConstants.TablePrefix}subscriptions");
        subscriptions.Index(x => x.TenantId);
        subscriptions.Index(x => x.Status);

        var subscriptionPayments = opts.Schema.For<SubscriptionPayment>();
        subscriptionPayments.DocumentAlias($"{WellKnownConstants.TablePrefix}subscription_payments");
        subscriptionPayments.Index(x => x.SubscriptionId);
        subscriptionPayments.Index(x => x.TenantId);

        var subscriptionInvoices = opts.Schema.For<SubscriptionInvoice>();
        subscriptionInvoices.DocumentAlias($"{WellKnownConstants.TablePrefix}subscription_invoices");
        subscriptionInvoices.Index(x => x.TenantId);
        subscriptionInvoices.Index(x => x.SubscriptionId);
        subscriptionInvoices.Index(x => x.InvoiceNumber);
        subscriptionInvoices.Index(x => x.Status);

        // ── Audit Archive ──
        var auditArchives = opts.Schema.For<AuditLogArchive>();
        auditArchives.DocumentAlias($"{WellKnownConstants.TablePrefix}audit_log_archives");
        auditArchives.Index(x => x.OriginalCreatedAt);
        auditArchives.Index(x => x.ArchiveBatchId!);

        // ── Notification Settings ──
        var notificationSettings = opts.Schema.For<NotificationSettings>();
        notificationSettings.DocumentAlias($"{WellKnownConstants.TablePrefix}notification_settings");
        notificationSettings.Index(x => x.TenantId);

        // ── Storage (Blobs) ──
        var blobEntries = opts.Schema.For<BlobEntry>();
        blobEntries.DocumentAlias($"{WellKnownConstants.TablePrefix}blobs");
        blobEntries.Index(x => x.Category);
        blobEntries.Index(x => x.ReferenceId);

        return opts;
    }
}
