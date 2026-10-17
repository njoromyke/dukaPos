using System.Text;
using DukaPoS.Api.Middleware;
using DukaPoS.Handlers.Sales;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Infrastructure.Persistence;
using DukaPoS.Messages.Auth;
using DukaPoS.Messages.Inventory;
using DukaPoS.Messages.Payments;
using DukaPoS.Messages.Reporting;
using DukaPoS.Messages.Sales;
using DukaPoS.Messages.Terminal;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Sales;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Wolverine;
using Wolverine.Marten;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Postgres")!;
var jwtKey = builder.Configuration["Jwt:Key"]!;

// ── Services ──
builder.Services.AddScoped<TenantContext>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IPasswordService, PasswordService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "DukaPoS",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "DukaPoS",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });
builder.Services.AddAuthorization();

// ── Wolverine + Marten ──
builder.Host.UseWolverine(opts =>
{
    opts.Services.AddMarten(db =>
    {
        db.ConfigureDukaPoS(connectionString);
    })
    .IntegrateWithWolverine()
    .UseLightweightSessions();

    opts.Discovery.IncludeAssembly(typeof(CompleteSaleHandler).Assembly);

    opts.Policies.AutoApplyTransactions();
    opts.Policies.UseDurableLocalQueues();
});

var app = builder.Build();

// ── Middleware ──
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantResolutionMiddleware>();

// ══════════════════════════════════════════════════════════
//  API ENDPOINTS
// ══════════════════════════════════════════════════════════

// ── Auth ──
var auth = app.MapGroup("/api/auth");

auth.MapPost("/login", async (LoginCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<LoginResult>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

auth.MapPost("/pin-login", async (PinLoginCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<PinLoginResult>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Sales ──
var sales = app.MapGroup("/api/sales").RequireAuthorization();

sales.MapPost("/open", async (OpenSaleCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<Sale>(command);
    return Results.Ok(result);
});

sales.MapPost("/add-item", async (AddLineItemCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<Sale>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/update-quantity", async (UpdateLineItemQuantityCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<Sale>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/remove-item", async (RemoveLineItemCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<Sale>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/park-tab", async (ParkSaleAsTabCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TabParkedEvent>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/recall-tab", async (RecallTabCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<Sale>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapGet("/{saleId:guid}", async (Guid saleId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<Sale>(new GetSaleQuery(saleId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

sales.MapGet("/tabs", async (Guid branchId, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<Tab>>(new GetTabsQuery(branchId));
    return Results.Ok(result);
});

sales.MapGet("/history", async (Guid branchId, DateTimeOffset? from, DateTimeOffset? to, int? page, int? pageSize, IMessageBus bus) =>
{
    var query = new GetSalesHistoryQuery(branchId, from, to, page ?? 1, pageSize ?? 20);
    var result = await bus.InvokeAsync<SalesHistoryResult>(query);
    return Results.Ok(result);
});

sales.MapPost("/void", async (VoidSaleCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<SaleVoidedEvent>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Payments ──
var payments = app.MapGroup("/api/payments").RequireAuthorization();

payments.MapPost("/cash", async (RecordCashPaymentCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<(CashPaymentResult, CompleteSaleCommand)>(command);
        return Results.Ok(new { paymentId = result.Item1.PaymentId, change = result.Item1.Change, status = result.Item1.Status });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

payments.MapPost("/mpesa/stk-push", async (InitiateMpesaStkCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<MpesaStkResult>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

payments.MapPost("/mpesa/callback", async (MpesaCallbackEvent callback, IMessageBus bus) =>
{
    await bus.InvokeAsync<object[]>(callback);
    return Results.Ok();
}).AllowAnonymous();

// ── Inventory ──
var inventory = app.MapGroup("/api/inventory").RequireAuthorization();

inventory.MapGet("/products", async (Guid branchId, string? search, Guid? categoryId, int? page, int? pageSize, IMessageBus bus) =>
{
    var query = new GetProductsQuery(branchId, search, categoryId, page ?? 1, pageSize ?? 50);
    var result = await bus.InvokeAsync<ProductsResult>(query);
    return Results.Ok(result);
});

inventory.MapGet("/products/barcode/{barcode}", async (string barcode, Guid branchId, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<ProductDto?>(new GetProductByBarcodeQuery(barcode, branchId));
    return result != null ? Results.Ok(result) : Results.NotFound();
});

inventory.MapGet("/categories", async (IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<Category>>(new GetCategoriesQuery());
    return Results.Ok(result);
});

inventory.MapPost("/products", async (CreateProductCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<Product>(command);
    return Results.Created($"/api/inventory/products/{result.Id}", result);
});

inventory.MapPut("/products", async (UpdateProductCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<Product>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

inventory.MapPost("/stock/adjust", async (AdjustStockCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<StockDepletedEvent?>(command);
    return Results.Ok(new { adjusted = true, lowStockAlert = result != null });
});

// ── Terminal ──
var terminal = app.MapGroup("/api/terminal").RequireAuthorization();

terminal.MapPost("/lock", async (LockTerminalCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TerminalLockedEvent>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

terminal.MapPost("/unlock/pin", async (UnlockTerminalWithPinCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TerminalUnlockedEvent>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Reports ──
var reports = app.MapGroup("/api/reports").RequireAuthorization();

reports.MapGet("/daily", async (Guid branchId, DateOnly date, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<DailySummaryResult>(new GetDailySummaryQuery(branchId, date));
    return Results.Ok(result);
});

reports.MapGet("/top-products", async (Guid branchId, DateOnly from, DateOnly to, int? top, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<TopProductDto>>(new GetTopProductsQuery(branchId, from, to, top ?? 10));
    return Results.Ok(result);
});

app.Run();
