# DukaPoS — Multi-Tenant POS & Inventory System

## Architecture Design Document

---

## 1. System Overview

**DukaPoS** is a multi-tenant point-of-sale and inventory management platform built for Kenyan retail — butcheries, supermarkets, hardware shops, kiosks. It handles sales, stock tracking, M-Pesa and cash payments, deferred transactions (tabs), KRA eTIMS-compliant receipts, and thermal printing, all behind a lockable POS terminal with supervisor override.

---

## 2. Tech Stack

| Layer            | Technology                                                      |
|------------------|-----------------------------------------------------------------|
| **Backend API**  | .NET 9 / ASP.NET Core, Wolverine (CQRS + messaging)            |
| **Database**     | PostgreSQL 16 (schema-per-tenant) + Marten (document/event store) |
| **Cache/Pub-Sub**| Redis (session, locks, real-time inventory)                     |
| **Frontend**     | Next.js 15 (App Router) + React 19 + MUI 6                     |
| **Payments**     | Safaricom Daraja 2.0 (M-Pesa STK Push, C2B, B2C)              |
| **Tax/Fiscal**   | KRA eTIMS API (invoice signing, CU integration)                |
| **Printing**     | ESC/POS over USB/Network via backend print service              |
| **Real-time**    | SignalR (stock alerts, payment confirmations, lock events)      |
| **Auth**         | ASP.NET Identity + JWT + Refresh tokens + PIN/Card auth         |
| **Infra**        | Docker Compose (dev), Kubernetes (prod)                         |

---

## 3. Multi-Tenancy Strategy

```
┌──────────────────────────────────────────────────────┐
│                   Shared Application                 │
│              (single deployment, N tenants)           │
├──────────────────────────────────────────────────────┤
│  Tenant Resolution: subdomain OR X-Tenant-Id header  │
├──────────────────────────────────────────────────────┤
│  PostgreSQL                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ tenant_a │  │ tenant_b │  │ tenant_c │  schemas  │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌────────────────────────────────────────┐          │
│  │            public (shared)             │          │
│  │  tenants, plans, global_config         │          │
│  └────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────┘
```

**Schema-per-tenant** gives data isolation, easy backup/restore per client, and simpler compliance. Marten's `IDocumentStore` is configured per-tenant via Wolverine's `TenantId` on every command/query.

**Tenant resolution pipeline:**
1. Middleware extracts tenant from `{slug}.dukapos.co.ke` subdomain or `X-Tenant-Id` header (for mobile/desktop)
2. Sets `TenantContext` on the scoped DI container
3. Wolverine handlers receive tenant-scoped `IDocumentSession` automatically

---

## 4. Domain Contexts & Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DukaPoS Domain                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Identity   │  │   Tenancy    │  │      Inventory           │  │
│  │              │  │              │  │                          │  │
│  │ Users        │  │ Tenants      │  │ Products / SKUs          │  │
│  │ Roles        │  │ Branches     │  │ Categories               │  │
│  │ Permissions  │  │ Subscription │  │ Stock Levels             │  │
│  │ PIN/Card     │  │ Plans        │  │ Purchase Orders          │  │
│  │ Lock/Unlock  │  │              │  │ Stock Adjustments        │  │
│  │ Supervisor   │  │              │  │ Suppliers                │  │
│  │ Override     │  │              │  │ Low-Stock Alerts         │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────────┴─────────────┐  │
│  │    Sales     │  │   Payments   │  │     Fiscal / eTIMS       │  │
│  │   (POS)      │  │              │  │                          │  │
│  │ Cart/Session │  │ M-Pesa STK   │  │ Invoice Signing          │  │
│  │ Line Items   │  │ Cash Tender  │  │ Credit/Debit Notes       │  │
│  │ Discounts    │  │ Split Pay    │  │ Control Unit (CU) Sync   │  │
│  │ Tabs (defer) │  │ Tab Settle   │  │ Fiscal Receipts          │  │
│  │ Returns      │  │ Reconcile    │  │ Daily Z-Reports          │  │
│  │ Void         │  │              │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│  ┌──────┴───────────────────────────────────────────┴─────────────┐ │
│  │                       Printing                                │ │
│  │  Thermal receipt rendering (ESC/POS)                          │ │
│  │  Receipt templates per tenant                                 │ │
│  │  Reprint / duplicate                                          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       Reporting                               │  │
│  │  Daily sales, stock valuation, cashier performance,           │  │
│  │  payment method breakdown, eTIMS submission status            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Backend Architecture (Wolverine CQRS)

### 5.1 Project Structure

```
src/
├── DukaPoS.Api/                    # ASP.NET Core host, middleware, SignalR hubs
│   ├── Program.cs                  # Wolverine + Marten + service wiring
│   ├── Middleware/
│   │   ├── TenantResolutionMiddleware.cs
│   │   └── TerminalLockMiddleware.cs
│   └── Hubs/
│       ├── PosHub.cs               # real-time POS events
│       └── StockHub.cs             # low-stock alerts
│
├── DukaPoS.Domain/                 # Pure domain — no framework refs
│   ├── Identity/
│   │   ├── User.cs
│   │   ├── SupervisorCard.cs
│   │   └── TerminalSession.cs
│   ├── Tenancy/
│   │   ├── Tenant.cs
│   │   └── Branch.cs
│   ├── Inventory/
│   │   ├── Product.cs
│   │   ├── StockLevel.cs
│   │   ├── Category.cs
│   │   └── PurchaseOrder.cs
│   ├── Sales/
│   │   ├── Sale.cs                 # aggregate root
│   │   ├── SaleLineItem.cs
│   │   ├── Tab.cs                  # deferred transaction
│   │   └── Discount.cs
│   ├── Payments/
│   │   ├── Payment.cs
│   │   ├── MpesaPayment.cs
│   │   └── CashPayment.cs
│   └── Fiscal/
│       ├── FiscalInvoice.cs
│       └── EtimsSubmission.cs
│
├── DukaPoS.Messages/               # Commands, Events, Queries (shared)
│   ├── Sales/
│   │   ├── OpenSaleCommand.cs
│   │   ├── AddLineItemCommand.cs
│   │   ├── RemoveLineItemCommand.cs
│   │   ├── ApplyDiscountCommand.cs
│   │   ├── ParkSaleAsTabCommand.cs     # defer → tab
│   │   ├── RecallTabCommand.cs         # resume tab
│   │   ├── CompleteSaleCommand.cs
│   │   ├── VoidSaleCommand.cs
│   │   ├── SaleCompletedEvent.cs
│   │   └── GetActiveSalesQuery.cs
│   ├── Payments/
│   │   ├── InitiateMpesaStkCommand.cs
│   │   ├── RecordCashPaymentCommand.cs
│   │   ├── MpesaCallbackEvent.cs
│   │   └── PaymentConfirmedEvent.cs
│   ├── Inventory/
│   │   ├── ReceiveStockCommand.cs
│   │   ├── AdjustStockCommand.cs
│   │   ├── StockDepletedEvent.cs
│   │   └── GetProductsQuery.cs
│   ├── Fiscal/
│   │   ├── SubmitToEtimsCommand.cs
│   │   └── EtimsAcknowledgedEvent.cs
│   ├── Terminal/
│   │   ├── LockTerminalCommand.cs
│   │   ├── UnlockTerminalCommand.cs  # PIN or supervisor card
│   │   └── TerminalLockedEvent.cs
│   └── Printing/
│       ├── PrintReceiptCommand.cs
│       └── ReprintReceiptCommand.cs
│
├── DukaPoS.Handlers/               # Wolverine handlers
│   ├── Sales/
│   │   ├── OpenSaleHandler.cs
│   │   ├── AddLineItemHandler.cs
│   │   ├── ParkSaleAsTabHandler.cs
│   │   ├── RecallTabHandler.cs
│   │   ├── CompleteSaleHandler.cs
│   │   └── SaleCompletedHandler.cs     # cascading handler
│   ├── Payments/
│   │   ├── InitiateMpesaStkHandler.cs
│   │   ├── MpesaCallbackHandler.cs
│   │   └── RecordCashPaymentHandler.cs
│   ├── Inventory/
│   │   ├── ReceiveStockHandler.cs
│   │   ├── DeductStockOnSaleHandler.cs # handles SaleCompletedEvent
│   │   └── StockDepletedHandler.cs     # sends SignalR alert
│   ├── Fiscal/
│   │   ├── SubmitToEtimsHandler.cs
│   │   └── ScheduleEtimsRetryHandler.cs
│   └── Printing/
│       └── PrintReceiptHandler.cs
│
└── DukaPoS.Infrastructure/         # External integrations
    ├── Mpesa/
    │   ├── DarajaClient.cs          # HTTP client for Daraja 2.0
    │   ├── StkPushService.cs
    │   └── MpesaCallbackController.cs
    ├── Etims/
    │   ├── EtimsClient.cs           # KRA eTIMS REST client
    │   ├── InvoiceSigner.cs         # TIMS CU signing logic
    │   └── EtimsModels.cs
    ├── Printing/
    │   ├── EscPosRenderer.cs        # builds ESC/POS byte commands
    │   ├── ThermalPrinterService.cs # USB/TCP dispatch
    │   └── ReceiptTemplateEngine.cs
    ├── Persistence/
    │   ├── MartenConfig.cs
    │   └── TenantedSessionFactory.cs
    └── RealTime/
        └── SignalRNotifier.cs
```

### 5.2 Wolverine Wiring (Program.cs sketch)

```csharp
builder.Host.UseWolverine(opts =>
{
    // Marten integration — event sourcing + document store
    opts.Services.AddMarten(db =>
    {
        db.Connection(connectionString);
        db.Policies.AllDocumentsAreMultiTenanted();
        db.Schema.For<Sale>().Index(x => x.Status);
        db.Schema.For<Tab>().Index(x => x.CashierId);
        db.Schema.For<Product>().FullTextIndex(x => x.Name);
    })
    .IntegrateWithWolverine()
    .UseLightweightSessions();

    // Handler discovery
    opts.Discovery.IncludeAssembly(typeof(CompleteSaleHandler).Assembly);

    // Middleware chain for every command
    opts.Policies.AutoApplyTransactions();  // Marten unit-of-work per handler

    // M-Pesa callback is an external HTTP endpoint
    opts.PublishMessage<MpesaCallbackEvent>()
        .ToLocalQueue("mpesa-callbacks")
        .UseDurableInbox();                 // survive restarts

    // eTIMS submission with retry
    opts.PublishMessage<SubmitToEtimsCommand>()
        .ToLocalQueue("etims")
        .UseDurableInbox();

    opts.Policies.UseDurableLocalQueues();
});
```

### 5.3 Key Handler Examples

**Complete a sale → cascading events:**

```
CompleteSaleCommand
  → CompleteSaleHandler
      writes Sale aggregate, publishes SaleCompletedEvent
        → DeductStockOnSaleHandler   (inventory)
        → SubmitToEtimsHandler       (fiscal)
        → PrintReceiptHandler        (printing)
        → NotifySaleCompleteHandler  (SignalR → frontend)
```

**Tab (deferred transaction) flow:**

```
ParkSaleAsTabCommand
  → ParkSaleAsTabHandler
      Sale.Status = Parked
      Tab { SaleId, CustomerName?, PhoneNumber?, ParkedAt, CashierId }
      → TabParkedEvent → SignalR update

RecallTabCommand
  → RecallTabHandler
      Sale.Status = Active
      Tab.RecalledAt = now
      → frontend receives full cart state
```

---

## 6. Payment Flows

### 6.1 M-Pesa STK Push

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│   POS    │───▶│   API    │───▶│  Daraja   │───▶│ Customer │
│ Frontend │    │ Backend  │    │  API 2.0  │    │  Phone   │
└─────────┘    └──────────┘    └───────────┘    └──────────┘
                    │                                │
                    │         STK Push sent           │
                    │                                │
                    │◀── callback (success/fail) ────│
                    │                                │
              PaymentConfirmedEvent                  │
              → complete sale flow                   │
```

The backend holds the sale in `AwaitingPayment` status. A Wolverine scheduled retry polls Daraja if the callback doesn't arrive within 30 seconds.

### 6.2 Cash Payment

Straightforward — cashier enters tendered amount, system computes change, records `CashPayment`, completes the sale.

### 6.3 Split Payment

A sale can have multiple `Payment` records — e.g. KES 500 M-Pesa + KES 200 cash. The sale completes when `sum(payments) >= sale.Total`.

---

## 7. eTIMS / KRA Compliance

```
Sale completed
  │
  ▼
SubmitToEtimsHandler
  │
  ├── Build TaxInvoice payload (items, VAT breakdown, buyer TIN if B2B)
  ├── Sign with Control Unit credentials (TIMS CU serial, keys)
  ├── POST to eTIMS API → receive SCU (Signed Control Unit) number
  ├── Store FiscalInvoice { SaleId, ScuNumber, QrCodeData, SubmittedAt }
  │
  ▼
Receipt includes:
  - Trader name, PIN, branch
  - SCU number & date
  - QR code (eTIMS verification URL)
  - Item-level tax breakdown (16% VAT / 0% exempt)
  - CU serial number

On failure → durable retry queue with exponential backoff
           → offline buffer (up to 48h per KRA guidelines)
           → alert dashboard for manual resubmission
```

---

## 8. Terminal Lock / Supervisor Override

```
┌─────────────────────────────────────────────────┐
│                 POS Terminal                     │
│                                                  │
│  ACTIVE ──(idle timeout / manual)──▶ LOCKED     │
│                                        │         │
│                         ┌──────────────┼─────┐  │
│                         │              │     │  │
│                    Cashier PIN    Supervisor  │  │
│                    (own session)    Card/PIN  │  │
│                         │          (override) │  │
│                         ▼              ▼     │  │
│                       UNLOCKED              │  │
│                                              │  │
│  Supervisor actions while unlocked:          │  │
│    - Void sale           - Price override     │  │
│    - Apply manual disc.  - Open cash drawer   │  │
│    - Reprint receipt     - View other tabs    │  │
└─────────────────────────────────────────────────┘
```

**Supervisor card** = NFC/magstripe card with encoded `SupervisorId`. Backend validates the card token against `SupervisorCard` entity, checks role permissions, and unlocks. All supervisor actions are audit-logged.

---

## 9. Thermal Printing Architecture

```
┌─────────┐     SignalR or      ┌───────────────┐     USB/TCP      ┌─────────┐
│ Backend │ ──────────────────▶ │  Print Agent   │ ──────────────▶ │ Thermal │
│  API    │   PrintReceiptCmd   │  (local svc)   │    ESC/POS      │ Printer │
└─────────┘                     └───────────────┘                  └─────────┘
                                       │
                                 Runs on the same
                                 machine as the POS
                                 terminal (Windows
                                 service or systemd)
```

**Why a local print agent?** Browsers can't talk USB directly to receipt printers reliably. A lightweight .NET agent runs on the terminal PC, subscribes to the backend's print queue via SignalR, receives the ESC/POS byte payload, and dispatches to the thermal printer.

**Receipt template engine** supports:
- Logo (monochrome bitmap)
- Tenant header (name, PIN, branch address, phone)
- Line items with quantity, unit price, total
- Tax breakdown (VAT 16%, Exempt)
- eTIMS QR code (rendered as ESC/POS raster image)
- SCU number, CU serial
- Payment method summary
- Footer (custom message per tenant)
- Cut command (full or partial)

---

## 10. Frontend Architecture (Next.js + MUI)

### 10.1 Route Structure

```
app/
├── (auth)/
│   ├── login/page.tsx              # tenant + user login
│   └── pin-entry/page.tsx          # fast cashier switch (PIN pad)
│
├── (dashboard)/
│   ├── layout.tsx                  # sidebar nav, tenant context
│   ├── page.tsx                    # dashboard / today's summary
│   ├── inventory/
│   │   ├── products/page.tsx       # product list + search
│   │   ├── products/[id]/page.tsx  # product detail / edit
│   │   ├── categories/page.tsx
│   │   ├── stock/page.tsx          # stock levels, adjustments
│   │   └── purchase-orders/page.tsx
│   ├── sales/
│   │   ├── history/page.tsx        # past sales, reprint
│   │   └── tabs/page.tsx           # all open tabs
│   ├── reports/
│   │   ├── daily/page.tsx
│   │   ├── payments/page.tsx
│   │   └── etims/page.tsx          # eTIMS submission status
│   └── settings/
│       ├── branch/page.tsx
│       ├── users/page.tsx
│       ├── printers/page.tsx
│       └── etims/page.tsx          # CU config, KRA PIN
│
├── (pos)/
│   ├── layout.tsx                  # full-screen POS chrome
│   ├── page.tsx                    # main POS terminal
│   ├── lock/page.tsx               # lock screen (PIN / card)
│   └── components/
│       ├── ProductGrid.tsx         # touch-friendly product tiles
│       ├── BarcodeScanner.tsx      # camera or USB scanner input
│       ├── Cart.tsx                # current sale line items
│       ├── PaymentDialog.tsx       # cash / M-Pesa / split
│       ├── TabDrawer.tsx           # park & recall tabs
│       ├── ReceiptPreview.tsx      # on-screen receipt before print
│       └── SupervisorOverlay.tsx   # card/PIN unlock modal
│
└── api/                            # Next.js API routes (BFF proxy)
    ├── auth/[...nextauth]/route.ts
    └── mpesa/callback/route.ts     # M-Pesa callback proxy
```

### 10.2 POS Screen Layout (touch-optimized)

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌─ Header ──────────────────────────────────────────────────┐   │
│  │  DukaPoS  │  Branch: Kilimani  │  Cashier: Amina  │ 🔒   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Product Grid (left 60%) ────┐  ┌─ Cart (right 40%) ───────┐ │
│  │                              │  │                           │ │
│  │  [Search / Scan ________]    │  │  🛒 Current Sale          │ │
│  │                              │  │                           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ │  │  Sugar 2kg    ×2   400   │ │
│  │  │Bread │ │Milk  │ │Sugar │ │  │  Bread          ×1    65  │ │
│  │  │ 65   │ │ 70   │ │ 200  │ │  │  Beef 1kg     ×1   850   │ │
│  │  └──────┘ └──────┘ └──────┘ │  │                           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ │  │  ─────────────────────── │ │
│  │  │Beef  │ │Eggs  │ │Rice  │ │  │  Subtotal         1,315   │ │
│  │  │ 850  │ │ 450  │ │ 320  │ │  │  VAT (16%)          210   │ │
│  │  └──────┘ └──────┘ └──────┘ │  │  TOTAL            1,525   │ │
│  │                              │  │                           │ │
│  │  Categories:                 │  │  ┌─────────┐ ┌─────────┐ │ │
│  │  [All] [Meat] [Dairy] [Dry] │  │  │  Park   │ │  Pay    │ │ │
│  │                              │  │  │  (Tab)  │ │  Now    │ │ │
│  └──────────────────────────────┘  │  └─────────┘ └─────────┘ │ │
│                                     │  ┌─────────────────────┐ │ │
│                                     │  │   Open Tabs (3)     │ │ │
│                                     │  └─────────────────────┘ │ │
│                                     └───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 State Management

```
Zustand stores (lightweight, no boilerplate):

├── useAuthStore        — user, token, tenant, permissions
├── usePosStore         — active sale, cart items, payment state
├── useTabStore         — open tabs list, recall logic
├── useInventoryStore   — products cache, search, categories
├── useTerminalStore    — lock state, supervisor mode
└── useSocketStore      — SignalR connection, event handlers
```

**React Query (TanStack Query)** for all server state — products, sales history, reports. Zustand only for ephemeral client state (cart, lock).

---

## 11. Database Schema (key tables per tenant schema)

```sql
-- Tenant schema (e.g. tenant_kilimani_duka)

-- INVENTORY
products         (id, sku, barcode, name, category_id, unit, selling_price,
                  cost_price, vat_rate, is_weighted, is_active, image_url)
categories       (id, name, parent_id, sort_order)
stock_levels     (id, product_id, branch_id, quantity, reorder_level)
stock_movements  (id, product_id, branch_id, quantity_change, reason,
                  reference_id, reference_type, created_at, created_by)
suppliers        (id, name, phone, email, kra_pin)
purchase_orders  (id, supplier_id, status, ordered_at, received_at)

-- SALES
sales            (id, sale_number, status [Active|Parked|Completed|Voided],
                  cashier_id, branch_id, subtotal, vat_total, discount_total,
                  grand_total, started_at, completed_at)
sale_line_items  (id, sale_id, product_id, product_name, quantity,
                  unit_price, vat_rate, line_total, discount)
tabs             (id, sale_id, customer_name, customer_phone,
                  parked_by, parked_at, recalled_at, notes)

-- PAYMENTS
payments         (id, sale_id, method [Cash|Mpesa], amount,
                  mpesa_receipt_number, mpesa_phone, transaction_date,
                  status [Pending|Confirmed|Failed])

-- FISCAL
fiscal_invoices  (id, sale_id, scu_number, cu_serial, qr_code_data,
                  submission_status [Pending|Submitted|Acknowledged|Failed],
                  submitted_at, kra_response, retry_count)

-- IDENTITY (could be in public schema, linked by tenant_id)
users            (id, tenant_id, name, email, pin_hash, role,
                  is_supervisor, card_token_hash)
terminal_sessions(id, user_id, terminal_id, started_at, locked_at,
                  unlocked_at, unlocked_by)
audit_log        (id, user_id, action, entity_type, entity_id,
                  details_json, ip, created_at)
```

---

## 12. Deployment Architecture

```
                        ┌───────────────────┐
                        │    Cloudflare /    │
                        │    Nginx LB        │
                        └────────┬──────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────┴──────┐          ┌───────┴──────┐
             │  Next.js    │          │  ASP.NET     │
             │  Frontend   │          │  API (×2+)   │
             │  (Vercel or │          │  + Wolverine │
             │   Docker)   │          │  + SignalR   │
             └─────────────┘          └──────┬───────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                   ┌──────┴──────┐   ┌───────┴──────┐  ┌───────┴──────┐
                   │ PostgreSQL  │   │    Redis     │  │  KRA eTIMS   │
                   │   (RDS or   │   │  (ElastiC.   │  │  API         │
                   │    self)    │   │   or self)   │  └──────────────┘
                   └─────────────┘   └──────────────┘

  On each POS terminal machine:
  ┌──────────────────────────────────────┐
  │  Browser (Next.js PWA)               │
  │  Print Agent (.NET service)          │──── USB ──── Thermal Printer
  │  Barcode Scanner (HID keyboard mode) │
  └──────────────────────────────────────┘
```

---

## 13. Key Non-Functional Decisions

| Concern              | Decision                                                        |
|----------------------|-----------------------------------------------------------------|
| **Offline**          | PWA with service worker caches product catalog; sales queue locally in IndexedDB; sync on reconnect via Wolverine durable inbox |
| **Barcode scanning** | USB scanners in HID/keyboard mode — no driver needed; input captured by the search field's `onKeyDown` handler |
| **Weighted items**   | `is_weighted` flag on product; POS prompts for weight entry (manual or scale integration via serial/USB) |
| **Audit trail**      | Every mutation writes to `audit_log` via Wolverine middleware; supervisor overrides double-logged |
| **Idempotency**      | Every command carries a client-generated `CorrelationId`; handlers check for duplicate processing |
| **Receipt reprint**  | Stored as a rendered byte array in `fiscal_invoices.receipt_data`; reprint dispatches the same payload |

---

## 14. Implementation Phases

| Phase | Scope                                                    | ~Duration |
|-------|----------------------------------------------------------|-----------|
| **1** | Tenancy, Auth (JWT + PIN), Product CRUD, basic POS flow, cash payment, thermal printing (receipt v1) | 4–5 weeks |
| **2** | M-Pesa STK Push integration, split payments, tabs (park/recall), lock screen + supervisor card | 3–4 weeks |
| **3** | KRA eTIMS integration (invoice signing, QR code, CU sync), fiscal receipt format | 3–4 weeks |
| **4** | Inventory (stock levels, purchase orders, low-stock alerts), reporting dashboard | 3–4 weeks |
| **5** | PWA offline mode, barcode scanning, weighted items, multi-branch stock transfers | 2–3 weeks |
| **6** | Hardening — load testing, security audit, KRA certification, tenant onboarding flow | 2–3 weeks |

---

*Ready to proceed with implementation. Confirm this architecture or flag changes, then we start with Phase 1.*
