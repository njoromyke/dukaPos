namespace DukaPoS.Domain;

public static class WellKnownConstants
{
    public const string SchemaName = "dukapos";
    public const string TablePrefix = "dukapos_";
    public const string TenantHeaderName = "X-Tenant-Id";
    public const string DukaPosCorsPolicy = "DukaPosCorsPolicy";

    public static class SubscriptionFeatures
    {
        public const string MobileApp = "mobile_app";
        public const string InventoryPortal = "inventory_portal";
        public const string PortalInventory = "portal_inventory";
        public const string BarcodeScanning = "barcode_scanning";
        public const string ReceiptPrinting = "receipt_printing";
        public const string DedicatedHosting = "dedicated_hosting";
        public const string MpesaStkPush = "mpesa_stk_push";
        public const string QrCodeScanning = "qr_code_scanning";
        public const string ExpenseTracking = "expense_tracking";
        public const string TopProductsReports = "top_products_reports";
    }
}
