# DukaPoS — Multi-Tenant POS & Inventory System

A complete point-of-sale and inventory management platform for Kenyan retail.

## Tech Stack

- **Backend:** .NET 9, ASP.NET Core, Wolverine (CQRS), Marten/PostgreSQL
- **Web Frontend:** Next.js 15 + React 19 + MUI 6
- **Mobile App:** React Native (Expo) + React Native Paper
- **Payments:** M-Pesa Daraja 2.0 STK Push + Cash
- **Tax:** KRA eTIMS compliant receipts
- **Printing:** ESC/POS thermal receipt rendering

## Quick Start

### Prerequisites
- .NET 9 SDK
- Node.js 20+
- PostgreSQL 16
- Redis 7

### Backend
```bash
# Start dependencies
docker compose up -d postgres redis

# Run API
cd src/DukaPoS.Api
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

### Web Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Mobile App
```bash
cd mobile
npx expo install
npx expo start
# Scan QR with Expo Go app
```

## Project Structure

```
src/
├── DukaPoS.Api/           → ASP.NET host, middleware, SignalR, endpoints
├── DukaPoS.Domain/        → Pure domain entities (no framework deps)
├── DukaPoS.Messages/      → Commands, events, queries (Wolverine)
├── DukaPoS.Handlers/      → Wolverine command/event handlers
└── DukaPoS.Infrastructure/ → M-Pesa Daraja client, ESC/POS printer

frontend/                   → Next.js 15 web app
mobile/                     → React Native (Expo) mobile app
```

## Key Features

- **Multi-tenant** — schema-per-tenant isolation in PostgreSQL
- **POS Terminal** — touch-friendly product grid + cart
- **Tabs** — park a sale, come back to it later
- **M-Pesa** — STK Push payment integration
- **Cash** — tendered amount + change calculation
- **Split payments** — part M-Pesa + part cash
- **Lock screen** — idle timeout, PIN or supervisor card unlock
- **Thermal printing** — ESC/POS receipt with eTIMS QR code
- **KRA eTIMS** — invoice signing, SCU number, fiscal receipts
- **Barcode scanning** — USB HID (web) + camera (mobile)
- **Real-time** — SignalR for payment confirmations + stock alerts

## M-Pesa Configuration

1. Register at [Daraja Portal](https://developer.safaricom.co.ke/)
2. Create an app, get Consumer Key + Secret
3. Set up C2B callback URL
4. Update `appsettings.json` → `Daraja` section

## eTIMS Configuration

1. Register with KRA for eTIMS
2. Obtain Control Unit (CU) credentials
3. Configure CU serial number and signing keys
4. Set eTIMS API endpoint in settings
