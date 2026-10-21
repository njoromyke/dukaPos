namespace DukaPoS.Domain;

public enum UserRole
{
    Cashier,
    Supervisor,
    Manager,
    Admin,
    SuperAdmin,
}

public enum TerminalStatus
{
    Active,
    Locked,
}

public enum VatRate
{
    Standard = 16,
    Exempt = 0,
    ZeroRated = -1,
}

public enum StockMovementReason
{
    Sale,
    SaleReturn,
    PurchaseReceived,
    Adjustment,
    Damaged,
    Expired,
    Transfer,
}

public enum PurchaseOrderStatus
{
    Draft,
    Ordered,
    PartiallyReceived,
    Received,
    Cancelled,
}

public enum SaleStatus
{
    Active,
    Parked,
    AwaitingPayment,
    Completed,
    Voided,
}

public enum PaymentMethod
{
    Cash,
    Mpesa,
}

public enum PaymentStatus
{
    Pending,
    Confirmed,
    Failed,
    Cancelled,
}

public enum FiscalSubmissionStatus
{
    Pending,
    Submitted,
    Acknowledged,
    Failed,
}

public enum ExpenseCategory
{
    Rent,
    Utilities,
    Salaries,
    Supplies,
    Transport,
    Marketing,
    Maintenance,
    Other,
}

public enum AuditEventType
{
    Login,
    Logout,
    FailedLogin,
    PasswordChange,
    PinChange,
    ProductCreated,
    ProductUpdated,
    StockAdjusted,
    SaleCompleted,
    SaleVoided,
    PaymentReceived,
    ExpenseCreated,
    ExpenseApproved,
    ExpenseRejected,
    UserCreated,
    UserUpdated,
    UserLocked,
    UserUnlocked,
    CategoryCreated,
    CategoryUpdated,
    BranchUpdated,
    TenantCreated,
    TerminalLocked,
    TerminalUnlocked,
    MpesaStkPush,
    MpesaCallback,
    SubscriptionCreated,
    SubscriptionRenewed,
    SubscriptionExpired,
    SubscriptionCancelled,
    PackageChanged,
}

public enum ExpenseStatus
{
    Draft,
    PendingApproval,
    Approved,
    Rejected,
}

public enum PackageTier
{
    Beginner = 0,
    Inter = 1,
    Business = 2,
}

public enum BillingCycle
{
    Lifetime = 0,
    Monthly = 1,
    BiMonthly = 2,
    Quarterly = 3,
    SemiAnnual = 6,
    Annual = 12,
}

public enum SubscriptionStatus
{
    Trial,
    Active,
    PastDue,
    Expired,
    Cancelled,
    LifetimeActive,
}

public enum SubscriptionInvoiceStatus
{
    Unpaid,
    Paid,
    Overdue,
    Void,
}
