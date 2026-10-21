using System.Text;
using System.Security.Claims;
using System.Globalization;
using System.Text.Json;
using DukaPoS.Api.Middleware;
using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using DukaPoS.Domain.Inventory;
using DukaPoS.Domain.Sales;
using DukaPoS.Domain.Payments;
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
using DukaPoS.Messages.Audit;
using DukaPoS.Messages.Tenancy;
using DukaPoS.Messages.Storage;
using DukaPoS.Messages.Subscriptions;
using DukaPoS.Messages.Notifications;
using DukaPoS.Domain.Storage;
using DukaPoS.Domain.Subscriptions;
using DukaPoS.Infrastructure.Notifications;
using Marten;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using Wolverine;
using Wolverine.Marten;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
QuestPDF.Settings.License = LicenseType.Community;

// Keep the browser API on loopback while exposing a separate development port
// to phones on the LAN. macOS services may already claim wildcard port 5000.
if (builder.Environment.IsDevelopment())
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.ListenLocalhost(5000);
        options.ListenAnyIP(5100);
    });

var connectionString = builder.Configuration.GetConnectionString("Postgres")
                       ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

var jwtSecret = builder.Configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key is required.");

// ── Services ──
builder.Services.AddScoped<TenantContext>();
var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"]
    ?? Path.Combine(builder.Environment.ContentRootPath, ".dataprotection-keys");
Directory.CreateDirectory(dataProtectionKeysPath);
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IPasswordService, PasswordService>();
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
});
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
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            NameClaimType = "email",
            RoleClaimType = "role",
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminPortal", policy =>
        policy.RequireAuthenticatedUser().RequireAssertion(context =>
            context.User.IsInRole("Admin") || context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim("permission", "admin.portal.view")));
    options.AddPolicy("ManageInventory", policy =>
        policy.RequireAuthenticatedUser().RequireAssertion(context =>
            context.User.IsInRole("Admin") || context.User.IsInRole("SuperAdmin") ||
            context.User.IsInRole("Manager") || context.User.HasClaim("permission", "inventory.manage") ||
            context.User.HasClaim("permission", "admin.portal.view")));
});

// ── Redis ──
var redisSettings = builder.Configuration.GetSection("RedisConfiguration");
var redisHost = redisSettings["Host"];
if (!string.IsNullOrWhiteSpace(redisHost))
{
    var redisOptions = new ConfigurationOptions
    {
        Password = redisSettings["password"],
        Ssl = bool.TryParse(redisSettings["Ssl"], out var redisSsl) && redisSsl,
    };
    var redisPort = int.TryParse(redisSettings["Port"], out var parsedRedisPort) ? parsedRedisPort : 6379;
    redisOptions.EndPoints.Add(redisHost, redisPort);

    builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisOptions));
}

// ── M-Pesa ──
builder.Services.Configure<MpesaConfig>(builder.Configuration.GetSection("Mpesa"));
builder.Services.AddHttpClient<IMpesaService, MpesaService>();

// ── Notifications ──
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.Configure<SmsSettings>(builder.Configuration.GetSection("Sms"));
builder.Services.AddSingleton<IEmailService, SmtpEmailService>();
builder.Services.AddSingleton<ISmsService, AfricasTalkingSmsService>();
builder.Services.AddHttpClient<IPushNotificationService, ExpoPushNotificationService>();
builder.Services.AddHostedService<SubscriptionExpiryScheduler>();

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
app.UseForwardedHeaders();

// ── Seed ──
await SeedSuperAdmin(app);
await SeedDefaultPackages(app);

// ── Middleware ──
app.UseCors(WellKnownConstants.DukaPosCorsPolicy);

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseMiddleware<SubscriptionEnforcementMiddleware>();
app.UseMiddleware<ApiAuditMiddleware>();
app.UseAuthorization();

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

auth.MapGet("/branches", async (HttpContext context, IDocumentStore store) =>
{
    if (context.User.IsInRole(UserRole.SuperAdmin.ToString()))
        return Results.Ok(Array.Empty<object>());

    var userIdValue = context.User.FindFirstValue("sub");
    var tenantIdValue = context.User.FindFirstValue("tenantId");
    if (!Guid.TryParse(userIdValue, out var userId) || !Guid.TryParse(tenantIdValue, out var tenantId))
        return Results.Unauthorized();

    await using var userSession = store.QuerySession(tenantIdValue);
    var user = await userSession.LoadAsync<User>(userId);
    await using var tenantSession = store.QuerySession();
    var tenant = await tenantSession.LoadAsync<Tenant>(tenantId);
    if (user is null || tenant is null || !user.IsActive || user.TenantId != tenantIdValue)
        return Results.Forbid();

    var allowedBranchIds = GetAuthorizedBranchIds(user, tenant);
    var branches = tenant.Branches.Where(branch => branch.IsActive && allowedBranchIds.Contains(branch.Id))
        .Select(branch => new { branch.Id, branch.Name, branch.Address })
        .ToList();
    return Results.Ok(branches);
}).RequireAuthorization();

auth.MapPost("/select-branch/{branchId:guid}", async (Guid branchId, HttpContext context, IDocumentStore store, IJwtTokenService jwtTokenService) =>
{
    var userIdValue = context.User.FindFirstValue("sub");
    var tenantIdValue = context.User.FindFirstValue("tenantId");
    if (!Guid.TryParse(userIdValue, out var userId) || !Guid.TryParse(tenantIdValue, out var tenantId))
        return Results.Unauthorized();

    await using var userSession = store.QuerySession(tenantIdValue);
    var user = await userSession.LoadAsync<User>(userId);
    await using var tenantSession = store.QuerySession();
    var tenant = await tenantSession.LoadAsync<Tenant>(tenantId);
    if (user is null || tenant is null || !user.IsActive || user.TenantId != tenantIdValue)
        return Results.Forbid();

    var allowedBranchIds = GetAuthorizedBranchIds(user, tenant);
    var branch = tenant.Branches.FirstOrDefault(item => item.Id == branchId && item.IsActive
        && allowedBranchIds.Contains(item.Id));
    if (branch is null) return Results.Forbid();

    var token = jwtTokenService.GenerateToken(user.Id, user.Email, user.Role.ToString(), tenantIdValue, branch.Id, user.Permissions);
    return Results.Ok(new
    {
        token,
        user = new { id = user.Id, name = user.FullName, email = user.Email, role = user.Role.ToString(), branchId = branch.Id, branchName = branch.Name, permissions = user.Permissions, branchIds = user.AssignedBranchIds },
        tenantId = tenantIdValue
    });
}).RequireAuthorization();

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

auth.MapPost("/unlock-pin", async (PinLoginCommand command, HttpContext context, IDocumentStore store, IPasswordService passwordService) =>
{
    var userId = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!Guid.TryParse(userId, out var id)) return Results.Unauthorized();
    var tenantId = GetTenantId(context.User);
    await using var session = store.QuerySession(tenantId);
    var user = await session.LoadAsync<User>(id);
    if (user is null || !user.IsActive || user.PinHash is null || !passwordService.Verify(command.Pin, user.PinHash))
        return Results.Unauthorized();
    return Results.Ok(new { unlocked = true });
}).RequireAuthorization();

auth.MapPost("/unlock-password", async (PasswordUnlockCommand command, HttpContext context, IDocumentStore store, IPasswordService passwordService) =>
{
    var userId = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!Guid.TryParse(userId, out var id)) return Results.Unauthorized();
    var tenantId = GetTenantId(context.User);
    await using var session = store.QuerySession(tenantId);
    var user = await session.LoadAsync<User>(id);
    if (user is null || !user.IsActive || string.IsNullOrWhiteSpace(user.PasswordHash) || !passwordService.Verify(command.Password, user.PasswordHash))
        return Results.Unauthorized();
    return Results.Ok(new { unlocked = true });
}).RequireAuthorization();

// ── Sales ──
var sales = app.MapGroup("/api/sales").RequireAuthorization();

sales.MapPost("/open", async (OpenSaleCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, command.BranchId)) return Results.Forbid();
    var userId = principal.FindFirstValue("sub");
    if (!Guid.TryParse(userId, out var cashierId)) return Results.Unauthorized();
    var tenantId = GetTenantId(principal);
    await using var session = store.QuerySession(tenantId);
    var cashier = await session.LoadAsync<User>(cashierId);
    if (cashier is null || !cashier.IsActive) return Results.Unauthorized();
    var result = await bus.InvokeForTenantAsync<Sale>(tenantId, command with { CashierId = cashierId, CashierName = cashier.FullName });
    return Results.Ok(result);
});

sales.MapPost("/add-item", async (AddLineItemCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound();
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var result = await bus.InvokeForTenantAsync<Sale>(tenantId, command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/update-quantity", async (UpdateLineItemQuantityCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound();
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var result = await bus.InvokeForTenantAsync<Sale>(tenantId, command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/remove-item", async (RemoveLineItemCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound();
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var result = await bus.InvokeForTenantAsync<Sale>(tenantId, command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/park-tab", async (ParkSaleAsTabCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound();
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var actorId = principal.FindFirstValue("sub");
        if (!Guid.TryParse(actorId, out var userId)) return Results.Unauthorized();
        var result = await bus.InvokeForTenantAsync<TabParkedEvent>(tenantId, command with { ParkedBy = userId, ParkedByName = sale.CashierName });
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPut("/{saleId:guid}/customer", async (Guid saleId, UpdateSaleCustomerRequest request, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    var tenantId = GetTenantId(principal);
    await using var session = store.QuerySession(tenantId);
    var sale = await session.LoadAsync<Sale>(saleId);
    if (sale is null) return Results.NotFound();
    if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
    try
    {
        var updated = await bus.InvokeForTenantAsync<Sale>(tenantId, new UpdateSaleCustomerCommand(saleId, request.CustomerName));
        return Results.Ok(updated);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapPost("/recall-tab", async (RecallTabCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var tab = await session.LoadAsync<Tab>(command.TabId);
        if (tab is null) return Results.NotFound();
        var sale = await session.LoadAsync<Sale>(tab.SaleId);
        if (sale is null) return Results.NotFound();
        var branchId = tab.BranchId == Guid.Empty ? sale.BranchId : tab.BranchId;
        if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
        var userId = principal.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var recalledBy)) return Results.Unauthorized();
        var result = await bus.InvokeForTenantAsync<Sale>(tenantId, command with { RecalledBy = recalledBy });
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

sales.MapGet("/{saleId:guid}", async (Guid saleId, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var sale = await session.LoadAsync<Sale>(saleId);
        if (sale is null) return Results.NotFound();
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var result = await bus.InvokeForTenantAsync<Sale>(tenantId, new GetSaleQuery(saleId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

sales.MapGet("/tabs", async (Guid branchId, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var result = await bus.InvokeForTenantAsync<IReadOnlyList<Tab>>(GetTenantId(principal), new GetTabsQuery(branchId));
    return Results.Ok(result);
});

sales.MapGet("/history", async (Guid branchId, DateOnly? from, DateOnly? to, int? page, int? pageSize, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    DateTimeOffset? start = from.HasValue ? new DateTimeOffset(from.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(3)).ToUniversalTime() : null;
    DateTimeOffset? endExclusive = to.HasValue ? new DateTimeOffset(to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(3)).ToUniversalTime() : null;
    var query = new GetSalesHistoryQuery(branchId, start, endExclusive, page ?? 1, pageSize ?? 10);
    var result = await bus.InvokeForTenantAsync<SalesHistoryResult>(GetTenantId(principal), query);
    return Results.Ok(result);
});

sales.MapPost("/void", async (VoidSaleCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var actorId = principal.FindFirstValue("sub") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorId, out var userId)) return Results.Unauthorized();
        var tenantId = GetTenantId(principal);
        await using var session = store.QuerySession(tenantId);
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound();
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var result = await bus.InvokeForTenantAsync<SaleVoidedEvent>(tenantId, command with { VoidedBy = userId });
        return Results.Ok(result);
    }
    catch (UnauthorizedAccessException) { return Results.Forbid(); }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Payments ──
var payments = app.MapGroup("/api/payments").RequireAuthorization();

payments.MapPost("/cash", async (RecordCashPaymentCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        await using var session = store.QuerySession(GetTenantId(principal));
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound(new { message = "Sale not found" });
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var tenantId = GetTenantId(principal);
        var result = await bus.InvokeForTenantAsync<CashPaymentResult>(tenantId, command);
        if (result.SaleCompleted)
            await bus.InvokeForTenantAsync<SaleCompletedEvent>(tenantId, new CompleteSaleCommand(command.SaleId));
        return Results.Ok(new { paymentId = result.PaymentId, change = result.Change, status = result.Status, amountApplied = result.AmountApplied, remainingBalance = result.RemainingBalance, saleCompleted = result.SaleCompleted });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

payments.MapPost("/mpesa/stk-push", async (InitiateMpesaStkCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        await using var session = store.QuerySession(GetTenantId(principal));
        var sale = await session.LoadAsync<Sale>(command.SaleId);
        if (sale is null) return Results.NotFound(new { message = "Sale not found" });
        if (!CanAccessBranch(principal, sale.BranchId)) return Results.Forbid();
        var result = await bus.InvokeForTenantAsync<MpesaStkResult>(GetTenantId(principal), command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

var mpesaSettings = app.MapGroup("/api/branches/{branchId:guid}/mpesa-settings").RequireAuthorization("AdminPortal");
mpesaSettings.MapGet("", async (Guid branchId, ClaimsPrincipal principal, IDocumentStore store) =>
{
    if (!CanManageBranchMpesa(principal) || !CanAccessBranch(principal, branchId)) return Results.Forbid();
    await using var session = store.QuerySession(GetTenantId(principal));
    var settings = await session.LoadAsync<BranchMpesaSettings>(branchId);
    return Results.Ok(new { configured = settings is not null, shortCode = settings?.ShortCode, environment = settings?.Environment });
});
mpesaSettings.MapPut("", async (Guid branchId, ConfigureBranchMpesaRequest request, ClaimsPrincipal principal, IDocumentStore store, IDataProtectionProvider protection) =>
{
    if (!CanManageBranchMpesa(principal) || !CanAccessBranch(principal, branchId)) return Results.Forbid();
    if (string.IsNullOrWhiteSpace(request.ConsumerKey) || string.IsNullOrWhiteSpace(request.ConsumerSecret) ||
        string.IsNullOrWhiteSpace(request.Passkey) || string.IsNullOrWhiteSpace(request.ShortCode) ||
        request.Environment is not ("sandbox" or "production"))
        return Results.BadRequest(new { message = "Valid M-Pesa credentials, shortcode and environment are required." });

    var tenantId = GetTenantId(principal);
    await using var session = store.LightweightSession(tenantId);
    var protector = protection.CreateProtector("DukaPoS.BranchMpesaCredentials.v1");
    var settings = await session.LoadAsync<BranchMpesaSettings>(branchId) ?? new BranchMpesaSettings
    {
        Id = branchId,
        TenantId = Guid.Parse(tenantId),
        BranchId = branchId,
    };
    settings.ProtectedCredentials = protector.Protect(System.Text.Json.JsonSerializer.Serialize(new { request.ConsumerKey, request.ConsumerSecret, request.Passkey }));
    settings.ShortCode = request.ShortCode.Trim();
    settings.Environment = request.Environment;
    settings.UpdatedAt = DateTimeOffset.UtcNow;
    session.Store(settings);
    await session.SaveChangesAsync();
    return Results.Ok(new { configured = true, shortCode = settings.ShortCode, environment = settings.Environment });
});

payments.MapPost("/mpesa/callback", async (HttpRequest request, IMessageBus bus, IDocumentStore store, ILogger<Program> logger) =>
{
    var rawPayload = await new StreamReader(request.Body).ReadToEndAsync();
    MpesaCallbackEvent callback;
    try
    {
        using var document = JsonDocument.Parse(rawPayload);
        callback = ParseMpesaCallback(document.RootElement);
    }
    catch (Exception ex) when (ex is JsonException or InvalidOperationException or FormatException)
    {
        await SaveMpesaCallbackLog(store, new MpesaCallbackLog
        {
            ProcessingStatus = "InvalidPayload",
            ResultDescription = "Could not parse M-Pesa callback payload.",
            Error = ex.Message,
            RawPayload = rawPayload.Length > 16000 ? rawPayload[..16000] : rawPayload,
        });
        logger.LogWarning(ex, "Rejected malformed M-Pesa callback payload");
        return Results.BadRequest(new { message = "Invalid M-Pesa callback payload" });
    }

    var route = await FindMpesaCallbackRoute(store, callback.CheckoutRequestId);
    var log = new MpesaCallbackLog
    {
        TenantId = route?.TenantId,
        BranchId = route?.BranchId,
        CheckoutRequestId = callback.CheckoutRequestId,
        MerchantRequestId = callback.MerchantRequestId,
        ResultCode = callback.ResultCode,
        ResultDescription = callback.ResultDesc,
        MpesaReceiptNumber = callback.MpesaReceiptNumber,
        RawPayload = rawPayload.Length > 16000 ? rawPayload[..16000] : rawPayload,
    };

    if (route is null)
    {
        log.ProcessingStatus = "Unmatched";
        log.Error = "No tenant routing record exists for this CheckoutRequestID.";
        await SaveMpesaCallbackLog(store, log);
        logger.LogError("M-Pesa callback could not be matched to a tenant. CheckoutRequestID: {CheckoutRequestId}", callback.CheckoutRequestId);
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }

    try
    {
        await bus.InvokeForTenantAsync<object[]>(route.TenantId, callback);
        log.ProcessingStatus = callback.ResultCode == 0 ? "Processed" : "PaymentFailed";
        log.ProcessedAt = DateTimeOffset.UtcNow;
        await SaveMpesaCallbackLog(store, log);
        logger.LogInformation("Processed M-Pesa callback for tenant {TenantId}, branch {BranchId}, result {ResultCode}", route.TenantId, route.BranchId, callback.ResultCode);
        return Results.Ok(new { received = true });
    }
    catch (Exception ex)
    {
        log.ProcessingStatus = "ProcessingError";
        log.Error = ex.Message;
        await SaveMpesaCallbackLog(store, log);
        logger.LogError(ex, "Failed to process M-Pesa callback for tenant {TenantId}, branch {BranchId}, checkout {CheckoutRequestId}", route.TenantId, route.BranchId, callback.CheckoutRequestId);
        return Results.StatusCode(StatusCodes.Status500InternalServerError);
    }
}).AllowAnonymous();

// ── Receipt ──
var receipt = app.MapGroup("/api/receipt").RequireAuthorization();

receipt.MapPost("/generate", async (GenerateReceiptCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<ReceiptResult>(command);
        return Results.Ok(new { data = Convert.ToBase64String(result.Data), saleNumber = result.SaleNumber, blobId = result.BlobId });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

receipt.MapGet("/by-sale/{saleId:guid}", async (Guid saleId, IQuerySession session) =>
{
    var blob = await session.Query<BlobEntry>()
        .Where(b => b.ReferenceId == saleId && b.Category == "receipt")
        .OrderByDescending(b => b.CreatedAt)
        .FirstOrDefaultAsync();

    if (blob == null)
        return Results.NotFound(new { message = "Receipt not found for this sale." });

    return Results.File(blob.Data, blob.ContentType, blob.FileName);
});

// ── Inventory ──
var inventory = app.MapGroup("/api/inventory").RequireAuthorization();

inventory.MapGet("/products", async (Guid branchId, string? search, Guid? categoryId, int? page, int? pageSize, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var query = new GetProductsQuery(branchId, search, categoryId, page ?? 1, pageSize ?? 50);
    var result = await bus.InvokeForTenantAsync<ProductsResult>(GetTenantId(principal), query);
    return Results.Ok(result);
});

inventory.MapGet("/products/barcode/{barcode}", async (string barcode, Guid branchId, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var result = await bus.InvokeForTenantAsync<ProductDto?>(GetTenantId(principal), new GetProductByBarcodeQuery(barcode, branchId));
    return result != null ? Results.Ok(result) : Results.NotFound();
});

inventory.MapGet("/categories", async (IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<IReadOnlyList<Category>>(GetTenantId(principal), new GetCategoriesQuery());
    return Results.Ok(result);
});

inventory.MapPost("/products", async (CreateProductCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<Product>(GetTenantId(principal), command);
    return Results.Created($"/api/inventory/products/{result.Id}", result);
}).RequireAuthorization("ManageInventory");

inventory.MapPut("/products", async (UpdateProductCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    try
    {
        var result = await bus.InvokeForTenantAsync<Product>(GetTenantId(principal), command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
}).RequireAuthorization("ManageInventory");

inventory.MapPost("/stock/adjust", async (AdjustStockCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, command.BranchId))
        return Results.Json(new { message = "You are not authorized to adjust stock for this branch." }, statusCode: StatusCodes.Status403Forbidden);
    var actorId = principal.FindFirstValue("sub") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!Guid.TryParse(actorId, out var userId)) return Results.Unauthorized();
    try
    {
        var result = await bus.InvokeForTenantAsync<StockDepletedEvent?>(GetTenantId(principal), command with { AdjustedBy = userId });
        if (result != null) await bus.PublishAsync(result);
        return Results.Ok(new { adjusted = true, lowStockAlert = result != null });
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { message = ex.Message }, statusCode: StatusCodes.Status403Forbidden);
    }
    catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
});

inventory.MapGet("/stock/levels", async (Guid branchId, bool? lowStockOnly, int? page, int? pageSize, string? search, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var query = new GetStockLevelsQuery(branchId, lowStockOnly ?? false, page ?? 1, pageSize ?? 10, search);
    var result = await bus.InvokeForTenantAsync<StockLevelsResult>(GetTenantId(principal), query);
    return Results.Ok(result);
}).RequireAuthorization("AdminPortal");

inventory.MapPost("/categories", async (CreateCategoryCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<Category>(GetTenantId(principal), command);
    return Results.Created($"/api/inventory/categories/{result.Id}", result);
}).RequireAuthorization("ManageInventory");

inventory.MapPut("/categories", async (UpdateCategoryCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    try
    {
        var result = await bus.InvokeForTenantAsync<Category>(GetTenantId(principal), command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
}).RequireAuthorization("ManageInventory");

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
var users = app.MapGroup("/api/users").RequireAuthorization().RequireAuthorization("AdminPortal");

users.MapGet("/", async (Guid? branchId, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var selectedBranchId = branchId ?? (Guid.TryParse(principal.FindFirstValue("branchId"), out var currentBranchId) ? currentBranchId : Guid.Empty);
    if (selectedBranchId == Guid.Empty || !CanAccessBranch(principal, selectedBranchId)) return Results.Forbid();
    var result = await bus.InvokeAsync<IReadOnlyList<UserDto>>(new GetUsersQuery(selectedBranchId));
    return Results.Ok(result);
});

users.MapPut("/{userId:guid}/permissions", async (Guid userId, UpdateUserPermissionsCommand command, ClaimsPrincipal principal, IMessageBus bus) =>
{
    if (!principal.IsInRole("Admin") && !principal.IsInRole("SuperAdmin"))
        return Results.Json(new { message = "An administrator role is required to manage permissions." }, statusCode: StatusCodes.Status403Forbidden);
    try
    {
        return Results.Ok(await bus.InvokeAsync<UserDto>(command with { UserId = userId }));
    }
    catch (InvalidOperationException ex) { return Results.NotFound(new { message = ex.Message }); }
});

users.MapPut("/{userId:guid}/branches", async (
    Guid userId,
    UpdateUserBranchAssignmentsCommand command,
    ClaimsPrincipal principal,
    IDocumentStore store,
    IMessageBus bus) =>
{
    if (!principal.IsInRole("Admin") && !principal.IsInRole("SuperAdmin")
        && !principal.HasClaim("permission", "users.manage"))
        return Results.Forbid();

    var tenantId = GetTenantId(principal);
    if (!Guid.TryParse(tenantId, out var tenantGuid)) return Results.Forbid();
    var branchIds = (command.BranchIds ?? []).Distinct().ToList();
    if (branchIds.Count == 0 || !branchIds.Contains(command.PrimaryBranchId))
        return Results.BadRequest(new { message = "Assign at least one branch and select an assigned primary branch." });

    await using var directorySession = store.QuerySession();
    var tenant = await directorySession.LoadAsync<Tenant>(tenantGuid);
    if (tenant is null || branchIds.Any(id => !tenant.Branches.Any(branch => branch.Id == id && branch.IsActive)))
        return Results.BadRequest(new { message = "Select active branches belonging to this store." });

    await using var tenantSession = store.QuerySession(tenantId);
    var actorId = principal.FindFirstValue("sub");
    if (!Guid.TryParse(actorId, out var actorGuid)) return Results.Forbid();
    var actor = await tenantSession.LoadAsync<User>(actorGuid);
    var target = await tenantSession.LoadAsync<User>(userId);
    if (actor is null || target is null || target.TenantId != tenantId || actor.Id == target.Id)
        return Results.Forbid();
    var accessibleBranchIds = GetAuthorizedBranchIds(actor, tenant);
    if (branchIds.Any(id => !accessibleBranchIds.Contains(id))) return Results.Forbid();

    try
    {
        var result = await bus.InvokeAsync<UserDto>(command with { UserId = userId, BranchIds = branchIds });
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

users.MapPost("/", async (CreateUserCommand command, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        if (!Guid.TryParse(tenantId, out var tenantGuid)) return Results.Forbid();
        var assignedBranchIds = (command.BranchIds ?? [command.BranchId]).Append(command.BranchId).Distinct().ToList();
        await using var directorySession = store.QuerySession();
        var tenant = await directorySession.LoadAsync<Tenant>(tenantGuid);
        if (tenant is null || assignedBranchIds.Any(id => !tenant.Branches.Any(branch => branch.Id == id && branch.IsActive)))
            return Results.BadRequest(new { message = "Select active branches belonging to this store." });

        await using var userSession = store.QuerySession(tenantId);
        var actorId = principal.FindFirstValue("sub");
        if (!Guid.TryParse(actorId, out var actorGuid)) return Results.Forbid();
        var actor = await userSession.LoadAsync<User>(actorGuid);
        if (actor is null || assignedBranchIds.Any(id => !GetAuthorizedBranchIds(actor, tenant).Contains(id)))
            return Results.Forbid();

        var result = await bus.InvokeAsync<UserDto>(command with { BranchIds = assignedBranchIds });
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

users.MapPost("/{userId:guid}/lock", async (Guid userId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<UserDto>(new LockUserCommand(userId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

users.MapPost("/{userId:guid}/unlock", async (Guid userId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<UserDto>(new UnlockUserCommand(userId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Branch ──
var branch = app.MapGroup("/api/branch").RequireAuthorization().RequireAuthorization("AdminPortal");

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
var expenses = app.MapGroup("/api/expenses").RequireAuthorization().RequireAuthorization("AdminPortal");

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
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
    var fromDate = from ?? today.AddDays(-30).ToString("yyyy-MM-dd");
    var toDate = to ?? today.ToString("yyyy-MM-dd");
    var result = await bus.InvokeAsync<ExpenseSummaryResult>(
        new GetExpenseSummaryQuery(branchId, fromDate, toDate));
    return Results.Ok(result);
});

expenses.MapPost("/{id:guid}/approve", async (Guid id, ApproveExpenseCommand command, IMessageBus bus) =>
{
    try
    {
        var cmd = command with { Id = id };
        var result = await bus.InvokeAsync<ExpenseDto>(cmd);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

expenses.MapPost("/{id:guid}/reject", async (Guid id, RejectExpenseCommand command, IMessageBus bus) =>
{
    try
    {
        var cmd = command with { Id = id };
        var result = await bus.InvokeAsync<ExpenseDto>(cmd);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Reports ──
var reports = app.MapGroup("/api/reports").RequireAuthorization();

reports.MapGet("/daily-summary", async (Guid branchId, DateOnly? date, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var result = await bus.InvokeForTenantAsync<DailySummaryResult>(GetTenantId(principal), new GetDailySummaryQuery(branchId, date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3))));
    return Results.Ok(result);
});

reports.MapGet("/top-products", async (Guid branchId, DateOnly? from, DateOnly? to, int? top, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
    var result = await bus.InvokeForTenantAsync<IReadOnlyList<TopProductDto>>(GetTenantId(principal), new GetTopProductsQuery(branchId, from ?? today.AddDays(-30), to ?? today, top ?? 10));
    return Results.Ok(result);
});

reports.MapGet("/payment-breakdown", async (Guid branchId, DateOnly? from, DateOnly? to, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!CanAccessBranch(principal, branchId)) return Results.Forbid();
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
    var result = await bus.InvokeForTenantAsync<IReadOnlyList<PaymentBreakdownDto>>(GetTenantId(principal), new GetPaymentBreakdownQuery(branchId, from ?? today.AddDays(-30), to ?? today));
    return Results.Ok(result);
});

reports.MapGet("/export/pdf", async (string reportType, Guid branchId, DateOnly? from, DateOnly? to, DateOnly? date, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var role = principal.FindFirstValue("role");
    var userBranch = principal.FindFirstValue("branchId");
    if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
        && !string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase)
        && (!Guid.TryParse(userBranch, out var allowedBranch) || allowedBranch != branchId))
        return Results.Forbid();
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
    var start = from ?? date ?? today;
    var end = to ?? date ?? today;
    var title = reportType.Equals("payments", StringComparison.OrdinalIgnoreCase) ? "Payment Summary" : "Daily Sales Report";
    var rows = new List<(string Label, string Value, string Detail)>();
    string summary;

    if (reportType.Equals("payments", StringComparison.OrdinalIgnoreCase))
    {
        var payments = await bus.InvokeAsync<IReadOnlyList<PaymentBreakdownDto>>(new GetPaymentBreakdownQuery(branchId, start, end));
        rows.AddRange(payments.Select(item => (item.Method, item.Total.ToString("N2", CultureInfo.GetCultureInfo("en-KE")), $"{item.TransactionCount} transactions · {item.SharePercent:N1}%")));
        summary = $"Total collected: KES {payments.Sum(item => item.Total).ToString("N2", CultureInfo.GetCultureInfo("en-KE"))}";
    }
    else
    {
        var reportDate = date ?? start;
        var daily = await bus.InvokeAsync<DailySummaryResult>(new GetDailySummaryQuery(branchId, reportDate));
        var topProducts = await bus.InvokeAsync<IReadOnlyList<TopProductDto>>(new GetTopProductsQuery(branchId, reportDate, reportDate, 10));
        rows.AddRange(new[] {
            ("Sales", daily.TotalSales.ToString("N0"), "Completed transactions"),
            ("Revenue", $"KES {daily.TotalRevenue.ToString("N2", CultureInfo.GetCultureInfo("en-KE"))}", "Gross collected"),
            ("Cash", $"KES {daily.CashTotal.ToString("N2", CultureInfo.GetCultureInfo("en-KE"))}", "Cash payments"),
            ("M-Pesa", $"KES {daily.MpesaTotal.ToString("N2", CultureInfo.GetCultureInfo("en-KE"))}", "Mobile payments"),
            ("Average basket", $"KES {daily.AverageBasket.ToString("N2", CultureInfo.GetCultureInfo("en-KE"))}", "Revenue per sale")
        });
        rows.AddRange(topProducts.Select(product => ($"Product · {product.ProductName}", $"KES {product.Revenue.ToString("N2", CultureInfo.GetCultureInfo("en-KE"))}", $"{product.QuantitySold:N2} units sold")));
        summary = $"Report date: {reportDate:dd MMM yyyy}  ·  Voided sales: {daily.VoidedCount}";
        start = reportDate; end = reportDate;
    }

    var pdf = Document.Create(document => document.Page(page =>
    {
        page.Size(PageSizes.A4);
        page.Margin(42);
        page.DefaultTextStyle(style => style.FontFamily("Arial").FontSize(10).FontColor("#263445"));
        page.Header().Column(header =>
        {
            header.Item().Text("DUKAPOS  /  REPORTS").FontSize(9).Bold().FontColor("#167D78").LetterSpacing(1.2f);
            header.Item().PaddingTop(12).Text(title).FontSize(25).Bold().FontColor("#142A3B");
            header.Item().PaddingTop(5).Text($"{start:dd MMM yyyy} – {end:dd MMM yyyy}").FontSize(11).FontColor("#657789");
            header.Item().PaddingTop(18).LineHorizontal(1).LineColor("#DCE5EB");
        });
        page.Content().PaddingVertical(22).Column(content =>
        {
            content.Item().PaddingBottom(16).Text(summary).FontSize(12).Bold().FontColor("#142A3B");
            content.Item().Table(table =>
            {
                table.ColumnsDefinition(columns => { columns.RelativeColumn(2); columns.RelativeColumn(1.3f); columns.RelativeColumn(2); });
                table.Header(header =>
                {
                    header.Cell().Background("#142A3B").Padding(10).Text("ITEM").Bold().FontColor(Colors.White).FontSize(9);
                    header.Cell().Background("#142A3B").Padding(10).AlignRight().Text("VALUE").Bold().FontColor(Colors.White).FontSize(9);
                    header.Cell().Background("#142A3B").Padding(10).Text("DETAIL").Bold().FontColor(Colors.White).FontSize(9);
                });
                foreach (var (label, value, detail) in rows)
                {
                    table.Cell().Background("#F4F7F9").Padding(10).Text(label).SemiBold();
                    table.Cell().Background("#F4F7F9").Padding(10).AlignRight().Text(value).SemiBold();
                    table.Cell().Background("#F4F7F9").Padding(10).Text(detail).FontColor("#657789");
                }
            });
        });
        page.Footer().Row(footer =>
        {
            footer.RelativeItem().Text($"Generated {DateTimeOffset.UtcNow:dd MMM yyyy HH:mm} UTC · DukaPoS").FontSize(8).FontColor("#657789");
            footer.ConstantItem(75).AlignRight().Text(text => { text.Span("Page ").FontSize(8); text.CurrentPageNumber().FontSize(8); });
        });
    })).GeneratePdf();
    return Results.File(pdf, "application/pdf", $"dukapos-{reportType}-{start:yyyyMMdd}-{end:yyyyMMdd}.pdf");
});

// ── Admin ──
var admin = app.MapGroup("/api/admin").RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

admin.MapGet("/tenants", async (IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<TenantDto>>(new GetTenantsQuery());
    return Results.Ok(result);
});

admin.MapPost("/tenants", async (CreateTenantCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<CreateTenantResult>(command);
        return Results.Created($"/api/admin/tenants/{result.Tenant.Id}", result);
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

admin.MapPost("/tenants/{tenantId:guid}/lock", async (Guid tenantId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TenantDto>(new LockTenantCommand(tenantId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

admin.MapPost("/tenants/{tenantId:guid}/unlock", async (Guid tenantId, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TenantDto>(new UnlockTenantCommand(tenantId));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

admin.MapGet("/users", async (IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<UserDto>>(new GetAllUsersQuery());
    return Results.Ok(result);
});

admin.MapGet("/tenants/{tenantId:guid}/users", async (Guid tenantId, IMessageBus bus) =>
{
    return Results.Ok(await bus.InvokeAsync<IReadOnlyList<UserDto>>(new GetTenantUsersQuery(tenantId)));
});

admin.MapPost("/tenants/{tenantId:guid}/users", async (Guid tenantId, CreateUserCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<UserDto>(new CreateTenantUserCommand(tenantId, command.FullName, command.Email, command.Password, command.Pin, command.Role, command.BranchId, command.BranchIds));
        return Results.Created($"/api/admin/tenants/{tenantId}/users/{result.Id}", result);
    }
    catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
});

admin.MapPut("/tenants/{tenantId:guid}/users/{userId:guid}/branches", async (
    Guid tenantId,
    Guid userId,
    UpdateTenantUserBranchAssignmentsCommand command,
    IMessageBus bus,
    IDocumentStore store) =>
{
    try
    {
        var branchIds = (command.BranchIds ?? []).Distinct().ToList();
        if (branchIds.Count == 0 || !branchIds.Contains(command.PrimaryBranchId))
            return Results.BadRequest(new { message = "Assign at least one branch and select an assigned primary branch." });

        await using var directorySession = store.QuerySession();
        var tenant = await directorySession.LoadAsync<Tenant>(tenantId);
        if (tenant is null || branchIds.Any(id => !tenant.Branches.Any(branch => branch.Id == id && branch.IsActive)))
            return Results.BadRequest(new { message = "Select active branches belonging to this tenant." });

        var result = await bus.InvokeAsync<UserDto>(command with
        {
            TenantId = tenantId,
            UserId = userId,
            BranchIds = branchIds,
        });
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

admin.MapPut("/users/{userId:guid}/permissions", async (Guid userId, UpdateTenantUserPermissionsCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<UserDto>(command with { UserId = userId });
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex) { return Results.NotFound(new { message = ex.Message }); }
});

admin.MapPost("/users/{userId:guid}/reset-password", async (Guid userId, ResetUserPasswordCommand command, IMessageBus bus) =>
{
    try
    {
        var cmd = command with { UserId = userId };
        var result = await bus.InvokeAsync<UserDto>(cmd);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Audit ──
var audit = app.MapGroup("/api/audit").RequireAuthorization().RequireAuthorization("AdminPortal");

audit.MapGet("/logs", async (Guid? userId, string? action, string? entityType,
    DateOnly? from, DateOnly? to, int? page, int? pageSize, IMessageBus bus, ClaimsPrincipal principal) =>
{
    DateTimeOffset? fromInstant = from.HasValue ? NairobiDayStart(from.Value) : null;
    DateTimeOffset? toInstantExclusive = to.HasValue ? NairobiDayStart(to.Value.AddDays(1)) : null;
    var result = await bus.InvokeForTenantAsync<AuditLogsResult>(
        GetTenantId(principal), new GetAuditLogsQuery(userId, action, entityType, fromInstant, toInstantExclusive, page ?? 1, pageSize ?? 50));
    return Results.Ok(result);
});

audit.MapPost("/archive", async (ArchiveAuditLogsCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<ArchiveAuditLogsResult>(GetTenantId(principal), command);
    return Results.Ok(result);
});

audit.MapGet("/archive", async (DateOnly? from, DateOnly? to, string? action,
    int? page, int? pageSize, IMessageBus bus, ClaimsPrincipal principal) =>
{
    DateTimeOffset? fromInstant = from.HasValue ? NairobiDayStart(from.Value) : null;
    DateTimeOffset? toInstantExclusive = to.HasValue ? NairobiDayStart(to.Value.AddDays(1)) : null;
    var result = await bus.InvokeForTenantAsync<ArchivedAuditLogsResult>(
        GetTenantId(principal), new GetArchivedAuditLogsQuery(fromInstant, toInstantExclusive, action, page ?? 1, pageSize ?? 50));
    return Results.Ok(result);
});

// ── Notifications ──
var notifications = app.MapGroup("/api/notifications").RequireAuthorization();

notifications.MapGet("/settings", async (IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<NotificationSettingsDto>(GetTenantId(principal), new GetNotificationSettingsQuery());
    return Results.Ok(result);
}).RequireAuthorization("AdminPortal");

notifications.MapPut("/settings", async (UpdateNotificationSettingsCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<NotificationSettingsDto>(GetTenantId(principal), command);
    return Results.Ok(result);
}).RequireAuthorization("AdminPortal");

notifications.MapPost("/push-token", async (RegisterExpoPushTokenCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    await bus.InvokeForTenantAsync(GetTenantId(principal), command);
    return Results.Ok(new { registered = true });
});

notifications.MapDelete("/push-token", async (string token, IMessageBus bus, ClaimsPrincipal principal) =>
{
    await bus.InvokeForTenantAsync(GetTenantId(principal), new RemoveExpoPushTokenCommand(token));
    return Results.Ok(new { removed = true });
});

notifications.MapPost("/send-push", async (SendPushNotificationCommand command, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var tenantId = Guid.TryParse(GetTenantId(principal), out var tid) ? tid : Guid.Empty;
    var delivery = await bus.InvokeForTenantAsync<NotificationDeliveryDto>(tenantId.ToString(), command with { TenantId = tenantId });
    return Results.Ok(delivery);
}).RequireAuthorization("AdminPortal");

notifications.MapGet("/history", async (int? page, int? pageSize, string? search, IMessageBus bus, ClaimsPrincipal principal) =>
{
    var result = await bus.InvokeForTenantAsync<NotificationHistoryResult>(GetTenantId(principal), new GetNotificationHistoryQuery(page ?? 1, pageSize ?? 10, search));
    return Results.Ok(result);
}).RequireAuthorization("AdminPortal");

notifications.MapPost("/{id:guid}/resend", async (Guid id, IMessageBus bus, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = Guid.Parse(GetTenantId(principal));
        var result = await bus.InvokeForTenantAsync<NotificationDeliveryDto>(tenantId.ToString(), new ResendNotificationCommand(tenantId, id));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
}).RequireAuthorization("AdminPortal");

// ── Tenant Settings ──
var tenantSettings = app.MapGroup("/api/tenant-settings").RequireAuthorization().RequireAuthorization("AdminPortal");

tenantSettings.MapGet("/{tenantId}", async (string tenantId, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<TenantSettingsDto>(new GetTenantSettingsQuery(tenantId));
    return Results.Ok(result);
});

tenantSettings.MapPut("/", async (UpdateTenantSettingsCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<TenantSettingsDto>(command);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// ── Auth extras ──
auth.MapPost("/change-password", async (ChangePasswordCommand command, HttpContext context, IMessageBus bus) =>
{
    var userIdValue = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!Guid.TryParse(userIdValue, out var authenticatedUserId))
        return Results.Unauthorized();

    var tenantId = context.User.FindFirstValue("tenantId");
    if (string.IsNullOrWhiteSpace(tenantId))
        return Results.Unauthorized();

    try
    {
        // Password changes always target the caller authenticated by the token;
        // ignore any user ID or tenant ID supplied in the request body.
        await bus.InvokeAsync(command with { UserId = authenticatedUserId, TenantId = tenantId });
        return Results.Ok(new { changed = true });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
}).RequireAuthorization();

// ── File Upload / Blob Storage ──
var blobs = app.MapGroup("/api/blobs").RequireAuthorization();

blobs.MapPost("/upload", async (HttpRequest request, IMessageBus bus, ClaimsPrincipal principal) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { message = "Expected multipart form data." });

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file == null || file.Length == 0)
        return Results.BadRequest(new { message = "No file provided." });

    if (file.Length > 5 * 1024 * 1024)
        return Results.BadRequest(new { message = "File too large. Maximum 5MB." });

    var category = form["category"].ToString();
    var referenceId = Guid.TryParse(form["referenceId"], out var refId) ? refId : (Guid?)null;

    using var ms = new MemoryStream();
    await file.CopyToAsync(ms);

    var command = new UploadBlobCommand(file.FileName, file.ContentType, ms.ToArray(), category, referenceId);
    var result = await bus.InvokeForTenantAsync<BlobDto>(GetTenantId(principal), command);

    return Results.Ok(new { id = result.Id, url = $"/api/blobs/{result.Id}", fileName = result.FileName, size = result.Size });
}).DisableAntiforgery();

blobs.MapGet("/{id:guid}", async (Guid id, IMessageBus bus, IDocumentStore store, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        BlobEntry? blob;
        await using (var tenantSession = store.QuerySession(tenantId))
            blob = await tenantSession.LoadAsync<BlobEntry>(id);

        if (blob is null)
        {
            var blobPath = $"/api/blobs/{id}";
            await using var tenantSession = store.QuerySession(tenantId);
            var isReferencedByTenantProduct = await tenantSession.Query<Product>()
                .AnyAsync(product => product.ImageUrl != null
                    && (product.ImageUrl == id.ToString()
                        || product.ImageUrl == blobPath
                        || product.ImageUrl.EndsWith(blobPath)));
            if (!isReferencedByTenantProduct) return Results.NotFound();

            await using var legacySession = store.QuerySession();
            blob = await legacySession.LoadAsync<BlobEntry>(id);
        }

        if (blob is null) return Results.NotFound();
        if (principal.FindFirstValue("role") != UserRole.SuperAdmin.ToString() && blob.TenantId != tenantId)
        {
            await using var tenantSession = store.QuerySession(tenantId);
            var isReferencedByTenantProduct = await tenantSession.Query<Product>()
                .AnyAsync(product => product.ImageUrl != null
                    && (product.ImageUrl == id.ToString()
                        || product.ImageUrl == $"/api/blobs/{id}"
                        || product.ImageUrl.EndsWith($"/api/blobs/{id}")));
            if (!isReferencedByTenantProduct) return Results.NotFound();
        }
        return Results.File(blob.Data, blob.ContentType, blob.FileName);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

blobs.MapDelete("/{id:guid}", async (Guid id, IMessageBus bus, ClaimsPrincipal principal) =>
{
    try
    {
        var tenantId = GetTenantId(principal);
        var blob = await bus.InvokeForTenantAsync<BlobEntry>(tenantId, new GetBlobQuery(id));
        if (principal.FindFirstValue("role") != UserRole.SuperAdmin.ToString() && blob.TenantId != tenantId)
            return Results.NotFound();
        await bus.InvokeForTenantAsync(tenantId, new DeleteBlobCommand(id));
        return Results.Ok(new { deleted = true });
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
});

blobs.MapGet("/by-reference/{referenceId:guid}", async (Guid referenceId, string? category, IDocumentStore store, ClaimsPrincipal principal) =>
{
    var tenantId = GetTenantId(principal);
    await using var session = store.QuerySession(tenantId);
    var query = session.Query<BlobEntry>()
        .Where(b => b.ReferenceId == referenceId && b.TenantId == tenantId);

    if (!string.IsNullOrEmpty(category))
        query = query.Where(b => b.Category == category);

    var items = await query
        .Select(b => new BlobDto(b.Id, b.FileName, b.ContentType, b.Size, b.Category, b.ReferenceId, b.CreatedAt))
        .ToListAsync();

    return Results.Ok(items);
});

// ── Subscriptions ──
app.MapGet("/api/subscriptions/packages", async (IMessageBus bus) =>
{
    var packages = await bus.InvokeAsync<IReadOnlyList<PackageDto>>(new GetPackagesQuery());
    return Results.Ok(packages);
}).AllowAnonymous();

app.MapGet("/api/subscriptions/current", async (ClaimsPrincipal principal, IMessageBus bus) =>
{
    var tenantId = GetTenantId(principal);
    var dto = await bus.InvokeAsync<SubscriptionDto?>(new GetSubscriptionQuery(Guid.Parse(tenantId)));
    return dto is not null ? Results.Ok(dto) : Results.NotFound();
}).RequireAuthorization();

app.MapGet("/api/subscriptions/payments", async (ClaimsPrincipal principal, IMessageBus bus, int page = 1, int pageSize = 20) =>
{
    var tenantId = GetTenantId(principal);
    var payments = await bus.InvokeAsync<IReadOnlyList<SubscriptionPaymentDto>>(
        new GetSubscriptionPaymentsQuery(Guid.Parse(tenantId), page, pageSize));
    return Results.Ok(payments);
}).RequireAuthorization();

// ── Admin Subscription Management ──
app.MapPost("/api/admin/packages", async (CreatePackageCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<PackageDto>(command);
    return Results.Created($"/api/subscriptions/packages/{result.Id}", result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapPut("/api/admin/packages", async (UpdatePackageCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<PackageDto>(command);
    return Results.Ok(result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapPost("/api/admin/subscriptions", async (CreateSubscriptionCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<SubscriptionDto>(command);
        return Results.Created($"/api/subscriptions/{result.Id}", result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapPost("/api/admin/subscriptions/renew", async (RenewSubscriptionCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<SubscriptionDto>(command);
    return Results.Ok(result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapPost("/api/admin/subscriptions/cancel", async (CancelSubscriptionCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<SubscriptionDto>(command);
    return Results.Ok(result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapPost("/api/admin/subscriptions/change-package", async (ChangePackageCommand command, IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<SubscriptionDto>(command);
    return Results.Ok(result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapGet("/api/admin/subscriptions", async (IMessageBus bus) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<AdminSubscriptionDto>>(new GetAdminSubscriptionsQuery());
    return Results.Ok(result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapGet("/api/admin/invoices", async (IMessageBus bus, int page = 1, int pageSize = 100, string? status = null) =>
{
    var result = await bus.InvokeAsync<IReadOnlyList<SubscriptionInvoiceDto>>(
        new GetSubscriptionInvoicesQuery(page, pageSize, status));
    return Results.Ok(result);
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapPost("/api/admin/invoices/{invoiceId:guid}/mark-paid", async (Guid invoiceId, MarkSubscriptionInvoicePaidCommand command, IMessageBus bus) =>
{
    try
    {
        var result = await bus.InvokeAsync<SubscriptionInvoiceDto>(command with { InvoiceId = invoiceId });
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.MapGet("/api/admin/subscriptions/{tenantId:guid}", async (Guid tenantId, IMessageBus bus) =>
{
    var dto = await bus.InvokeAsync<SubscriptionDto?>(new GetSubscriptionQuery(tenantId));
    return dto is not null ? Results.Ok(dto) : Results.NotFound();
}).RequireAuthorization(policy => policy.RequireRole("SuperAdmin"));

app.Run();

static bool CanAccessBranch(ClaimsPrincipal principal, Guid requestedBranchId)
{
    if (principal.IsInRole(UserRole.SuperAdmin.ToString()))
        return true;

    return Guid.TryParse(principal.FindFirstValue("branchId"), out var assignedBranchId)
           && assignedBranchId != Guid.Empty
           && assignedBranchId == requestedBranchId;
}

static bool CanManageBranchMpesa(ClaimsPrincipal principal) =>
    principal.IsInRole(UserRole.SuperAdmin.ToString()) ||
    principal.IsInRole(UserRole.Admin.ToString()) ||
    principal.IsInRole(UserRole.Manager.ToString());

static HashSet<Guid> GetAuthorizedBranchIds(User user, Tenant tenant)
{
    var activeBranchIds = tenant.Branches.Where(branch => branch.IsActive).Select(branch => branch.Id).ToHashSet();
    var hasExplicitAssignments = user.AssignedBranchIds is { Count: > 0 };
    var assigned = (user.AssignedBranchIds ?? []).Where(activeBranchIds.Contains).ToHashSet();
    if (hasExplicitAssignments) return assigned;

    var mayAccessAll = user.Role is UserRole.Admin or UserRole.Manager
                       || (user.Permissions ?? []).Contains("branch.switch", StringComparer.OrdinalIgnoreCase);
    return mayAccessAll
        ? activeBranchIds
        : activeBranchIds.Contains(user.BranchId) ? new HashSet<Guid> { user.BranchId } : new HashSet<Guid>();
}

static DateTimeOffset NairobiDayStart(DateOnly date) =>
    new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(3)).ToUniversalTime();

static string GetTenantId(ClaimsPrincipal principal)
{
    var tenantId = principal.FindFirstValue("tenantId");
    if (string.IsNullOrWhiteSpace(tenantId))
        throw new UnauthorizedAccessException("A tenant-scoped session is required.");
    return tenantId;
}

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

static async Task SeedDefaultPackages(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var store = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
    await using var session = store.LightweightSession();

    var existing = await session.Query<Package>().ToListAsync();
    if (existing.Count > 0)
    {
        var premium = new[]
        {
            WellKnownConstants.SubscriptionFeatures.MpesaStkPush,
            WellKnownConstants.SubscriptionFeatures.QrCodeScanning,
            WellKnownConstants.SubscriptionFeatures.ExpenseTracking,
            WellKnownConstants.SubscriptionFeatures.TopProductsReports,
        };
        foreach (var package in existing)
        {
            package.Features ??= [];
            if (package.Tier == PackageTier.Beginner)
                package.Features.RemoveAll(feature => premium.Contains(feature, StringComparer.OrdinalIgnoreCase));
            else if (package.Tier is PackageTier.Inter or PackageTier.Business)
                foreach (var feature in premium)
                    if (!package.Features.Contains(feature, StringComparer.OrdinalIgnoreCase)) package.Features.Add(feature);
            package.UpdatedAt = DateTimeOffset.UtcNow;
            session.Store(package);
        }
        await session.SaveChangesAsync();
        return;
    }

    var packages = new[]
    {
        new Package
        {
            Id = Guid.NewGuid(),
            Name = "Beginner",
            Tier = PackageTier.Beginner,
            Description = "Mobile POS app only — perfect for small shops",
            MonthlyPrice = 500,
            LifetimePrice = 15000,
            Features = [WellKnownConstants.SubscriptionFeatures.MobileApp],
            MaxBranches = 1,
            MaxUsers = 3,
        },
        new Package
        {
            Id = Guid.NewGuid(),
            Name = "Intermediate",
            Tier = PackageTier.Inter,
            Description = "Mobile app + inventory management + web portal",
            MonthlyPrice = 1500,
            LifetimePrice = 45000,
            Features =
            [
                WellKnownConstants.SubscriptionFeatures.MobileApp,
                WellKnownConstants.SubscriptionFeatures.InventoryPortal,
                WellKnownConstants.SubscriptionFeatures.PortalInventory,
                WellKnownConstants.SubscriptionFeatures.MpesaStkPush,
                WellKnownConstants.SubscriptionFeatures.QrCodeScanning,
                WellKnownConstants.SubscriptionFeatures.ExpenseTracking,
                WellKnownConstants.SubscriptionFeatures.TopProductsReports,
            ],
            MaxBranches = 3,
            MaxUsers = 10,
        },
        new Package
        {
            Id = Guid.NewGuid(),
            Name = "Business",
            Tier = PackageTier.Business,
            Description = "Full suite — barcode scanning, receipt printing, dedicated hosting",
            MonthlyPrice = 3500,
            LifetimePrice = 100000,
            Features =
            [
                WellKnownConstants.SubscriptionFeatures.MobileApp,
                WellKnownConstants.SubscriptionFeatures.InventoryPortal,
                WellKnownConstants.SubscriptionFeatures.PortalInventory,
                WellKnownConstants.SubscriptionFeatures.BarcodeScanning,
                WellKnownConstants.SubscriptionFeatures.ReceiptPrinting,
                WellKnownConstants.SubscriptionFeatures.DedicatedHosting,
                WellKnownConstants.SubscriptionFeatures.MpesaStkPush,
                WellKnownConstants.SubscriptionFeatures.QrCodeScanning,
                WellKnownConstants.SubscriptionFeatures.ExpenseTracking,
                WellKnownConstants.SubscriptionFeatures.TopProductsReports,
            ],
            MaxBranches = 10,
            MaxUsers = 50,
        },
    };

    session.Store<Package>(packages);
    await session.SaveChangesAsync();

    app.Logger.LogInformation("Seeded {Count} default packages", packages.Length);
}

static async Task<MpesaCallbackRoute?> FindMpesaCallbackRoute(IDocumentStore store, string checkoutRequestId)
{
    await using var session = store.QuerySession();
    return await session.LoadAsync<MpesaCallbackRoute>(checkoutRequestId);
}

static async Task SaveMpesaCallbackLog(IDocumentStore store, MpesaCallbackLog entry)
{
    await using var session = store.LightweightSession();
    session.Store(entry);
    await session.SaveChangesAsync();
}

static MpesaCallbackEvent ParseMpesaCallback(JsonElement root)
{
    var callbackRoot = TryGetProperty(root, "Body", out var body) && TryGetProperty(body, "stkCallback", out var nested)
        ? nested
        : root;

    var checkoutId = ReadString(callbackRoot, "CheckoutRequestID") ?? ReadString(callbackRoot, "CheckoutRequestId");
    var merchantId = ReadString(callbackRoot, "MerchantRequestID") ?? ReadString(callbackRoot, "MerchantRequestId") ?? string.Empty;
    var resultCode = ReadInt(callbackRoot, "ResultCode");
    var resultDesc = ReadString(callbackRoot, "ResultDesc") ?? "No result description supplied";
    string? receipt = null;
    string? phone = null;
    decimal? amount = null;
    DateTimeOffset? transactionDate = null;

    if (TryGetProperty(callbackRoot, "CallbackMetadata", out var metadata) &&
        TryGetProperty(metadata, "Item", out var items) && items.ValueKind == JsonValueKind.Array)
    {
        foreach (var item in items.EnumerateArray())
        {
            var name = ReadString(item, "Name");
            if (name is null || !TryGetProperty(item, "Value", out var value)) continue;
            var text = value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
            switch (name)
            {
                case "MpesaReceiptNumber": receipt = text; break;
                case "PhoneNumber": phone = text; break;
                case "Amount": if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedAmount)) amount = parsedAmount; break;
                case "TransactionDate":
                    if (DateTime.TryParseExact(text, "yyyyMMddHHmmss", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedDate))
                        transactionDate = new DateTimeOffset(DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc));
                    break;
            }
        }
    }

    if (string.IsNullOrWhiteSpace(checkoutId) || resultCode is null)
        throw new InvalidOperationException("CheckoutRequestID and ResultCode are required.");

    return new MpesaCallbackEvent(checkoutId, merchantId, resultCode.Value, resultDesc, receipt, amount, phone, transactionDate);
}

static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
{
    if (element.ValueKind == JsonValueKind.Object)
        foreach (var property in element.EnumerateObject())
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
    value = default;
    return false;
}

static string? ReadString(JsonElement element, string name) =>
    TryGetProperty(element, name, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;

static int? ReadInt(JsonElement element, string name) =>
    TryGetProperty(element, name, out var value) && int.TryParse(value.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var number) ? number : null;

public sealed record UpdateSaleCustomerRequest(string? CustomerName);
public sealed record ConfigureBranchMpesaRequest(string ConsumerKey, string ConsumerSecret, string Passkey, string ShortCode, string Environment);
