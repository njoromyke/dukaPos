using System.Text;
using DukaPoS.Api.Middleware;
using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Sales;
using DukaPoS.Domain.Tenancy;
using DukaPoS.Handlers.Printing;
using DukaPoS.Handlers.Sales;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Infrastructure.Hubs;
using DukaPoS.Infrastructure.Mpesa;
using DukaPoS.Infrastructure.Persistence;
using DukaPoS.Infrastructure.Printing;
using DukaPoS.Messages.Auth;
using DukaPoS.Messages.Expenses;
using DukaPoS.Messages.Inventory;
using DukaPoS.Messages.Payments;
using DukaPoS.Messages.Reporting;
using DukaPoS.Messages.Sales;
using DukaPoS.Messages.Terminal;
using DukaPoS.Messages.Admin;
using DukaPoS.Messages.Tenancy;
using Marten;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using Wolverine;
using Wolverine.Marten;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Postgres")
                       ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

var jwtSecret = builder.Configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key is required.");

// ── Services ──
builder.Services.AddScoped<TenantContext>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IPasswordService, PasswordService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IReceiptPrinter, ReceiptPrinter>();

// ── SignalR ──
builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "DukaPoS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(WellKnownConstants.DukaPosCorsPolicy, policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? ["http://localhost:3000"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyMethod().AllowAnyHeader()
              .SetIsOriginAllowed(_ => true)
              .AllowCredentials());
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
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

// ── Redis ──
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnection))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(
        ConnectionMultiplexer.Connect(redisConnection));
}

// ── M-Pesa ──
builder.Services.Configure<MpesaConfig>(builder.Configuration.GetSection("Mpesa"));
builder.Services.AddHttpClient<IMpesaService, MpesaService>();

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

builder.Services.AddHealthChecks();

var app = builder.Build();

// ── Seed Super Admin ──
await SeedSuperAdmin(app);

// ── Middleware ──
app.UseCors(WellKnownConstants.DukaPosCorsPolicy);

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantResolutionMiddleware>();

// ── SignalR Hubs ──
app.MapHub<PosHub>("/hubs/pos");
app.MapHub<StockHub>("/hubs/stock");

app.MapHealthChecks("/health").AllowAnonymous();

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

// ── Receipt ──
var receipt = app.MapGroup("/api/receipt").RequireAuthorization();

receipt.MapPost("/generate", async (GenerateReceiptCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<ReceiptResult>(command);
        return Results.File(result.Data, "application/octet-stream", $"receipt-{result.SaleNumber}.bin");
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

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

inventory.MapGet("/stock/levels", async (Guid branchId, bool? lowStockOnly, int? page, int? pageSize, IMessageBus bus) =>
{
    var query = new GetStockLevelsQuery(branchId, lowStockOnly ?? false, page ?? 1, pageSize ?? 50);
    var result = await bus.InvokeAsync<StockLevelsResult>(query);
    return Results.Ok(result);
});

inventory.MapPost("/categories", async (CreateCategoryCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<Category>(command);
    return Results.Created($"/api/inventory/categories/{result.Id}", result);
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

// ── Users ──
var users = app.MapGroup("/api/users").RequireAuthorization();

users.MapGet("/", async (Guid? branchId, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<UserDto>>(new GetUsersQuery(branchId));
    return Results.Ok(result);
});

users.MapPost("/", async (CreateUserCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<UserDto>(command);
        return Results.Created($"/api/users/{result.Id}", result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

users.MapPut("/", async (UpdateUserCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<UserDto>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Branch ──
var branch = app.MapGroup("/api/branch").RequireAuthorization();

branch.MapGet("/{branchId:guid}", async (Guid branchId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<BranchDto>(new GetBranchQuery(branchId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

branch.MapPut("/", async (UpdateBranchCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<BranchDto>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Expenses ──
var expenses = app.MapGroup("/api/expenses").RequireAuthorization();

expenses.MapGet("/", async (Guid branchId, string? from, string? to, string? category, int? page, int? pageSize, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<ExpensesResult>(new GetExpensesQuery(branchId, from, to, category, page ?? 1, pageSize ?? 20));
    return Results.Ok(result);
});

expenses.MapPost("/", async (CreateExpenseCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<ExpenseDto>(command);
        return Results.Created($"/api/expenses/{result.Id}", result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

expenses.MapPut("/", async (UpdateExpenseCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<ExpenseDto>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

expenses.MapDelete("/{id:guid}", async (Guid id, IMessageBus bus) =>
{
    try
    {
        await bus.InvokeAsync(new DeleteExpenseCommand(id));
        return Results.Ok(new { deleted = true });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

expenses.MapGet("/summary", async (Guid branchId, string? from, string? to, IMessageBus bus) =>
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var fromDate = from ?? today.AddDays(-30).ToString("yyyy-MM-dd");
    var toDate = to ?? today.ToString("yyyy-MM-dd");
    var result = await bus.InvokeAsync<ExpenseSummaryResult>(
        new GetExpenseSummaryQuery(branchId, fromDate, toDate));
    return Results.Ok(result);
});

// ── Reports ──
var reports = app.MapGroup("/api/reports").RequireAuthorization();

reports.MapGet("/daily-summary", async (Guid branchId, DateOnly? date, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<DailySummaryResult>(new GetDailySummaryQuery(branchId, date ?? DateOnly.FromDateTime(DateTime.UtcNow)));
    return Results.Ok(result);
});

reports.MapGet("/top-products", async (Guid branchId, DateOnly? from, DateOnly? to, int? top, IMessageBus bus) =>
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var result = await bus.InvokeAsync<IReadOnlyList<TopProductDto>>(new GetTopProductsQuery(branchId, from ?? today.AddDays(-30), to ?? today, top ?? 10));
    return Results.Ok(result);
});

reports.MapGet("/payment-breakdown", async (Guid branchId, DateOnly? from, DateOnly? to, IMessageBus bus) =>
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var result = await bus.InvokeAsync<IReadOnlyList<PaymentBreakdownDto>>(new GetPaymentBreakdownQuery(branchId, from ?? today.AddDays(-30), to ?? today));
    return Results.Ok(result);
});

// ── Admin ──
var admin = app.MapGroup("/api/admin").RequireAuthorization();

admin.MapGet("/tenants", async (IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<TenantDto>>(new GetTenantsQuery());
    return Results.Ok(result);
});

admin.MapPost("/tenants", async (CreateTenantCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TenantDto>(command);
        return Results.Created($"/api/admin/tenants/{result.Id}", result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

admin.MapGet("/tenants/{tenantId:guid}/branches", async (Guid tenantId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<IReadOnlyList<BranchSummaryDto>>(new GetTenantBranchesQuery(tenantId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

admin.MapPost("/tenants/{tenantId:guid}/branches", async (Guid tenantId, CreateBranchForTenantCommand command, IMessageBus bus) =>
{
    try
    {
        var cmd = command with { TenantId = tenantId };
        var result = await bus.InvokeAsync<BranchSummaryDto>(cmd);
        return Results.Created($"/api/admin/tenants/{tenantId}/branches/{result.Id}", result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

admin.MapGet("/users", async (IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<UserDto>>(new GetAllUsersQuery());
    return Results.Ok(result);
});

app.Run();

static async Task SeedSuperAdmin(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var store = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
    var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();

    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var email = config["SuperAdmin:Email"] ?? "admin@dukapos.co.ke";
    var password = config["SuperAdmin:DefaultPassword"] ?? "Admin@123";

    await using var session = store.LightweightSession();

    var existing = await session.Query<User>()
        .FirstOrDefaultAsync(u => u.Email == email && u.Role == UserRole.SuperAdmin);

    if (existing != null)
    {
        return;
    }

    var superAdmin = new User
    {
        Id = Guid.NewGuid(),
        TenantId = "system",
        FullName = "Super Admin",
        Email = email,
        PasswordHash = passwordService.Hash(password),
        Role = UserRole.SuperAdmin,
        IsActive = true,
        BranchId = Guid.Empty,
    };

    session.Store(superAdmin);
    await session.SaveChangesAsync();

    app.Logger.LogInformation("Super admin account seeded: {Email}", email);
}
