namespace DukaPoS.Domain.Enumerations;

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
