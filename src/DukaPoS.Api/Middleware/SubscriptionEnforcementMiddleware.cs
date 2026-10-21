using DukaPoS.Domain;
using DukaPoS.Domain.Subscriptions;
using Marten;

namespace DukaPoS.Api.Middleware;

public class SubscriptionEnforcementMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly HashSet<string> ExemptPrefixes =
    [
        "/health",
        "/hubs/",
        "/api/auth/",
        "/api/admin/",
        "/api/subscriptions",
        "/swagger",
    ];

    public SubscriptionEnforcementMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        var path = context.Request.Path.Value ?? "";

        if (ExemptPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            await _next(context);
            return;
        }

        var role = context.User.FindFirst("role")?.Value;
        if (role == UserRole.SuperAdmin.ToString())
        {
            await _next(context);
            return;
        }

        if (string.IsNullOrEmpty(tenantContext.TenantId) || !Guid.TryParse(tenantContext.TenantId, out var tenantGuid))
        {
            await _next(context);
            return;
        }

        var store = context.RequestServices.GetRequiredService<IDocumentStore>();
        await using var session = store.QuerySession();

        var subscription = await session.Query<Subscription>()
            .FirstOrDefaultAsync(s => s.TenantId == tenantGuid
                && s.Status != SubscriptionStatus.Cancelled);

        if (subscription == null)
        {
            await _next(context);
            return;
        }

        if (subscription.Status == SubscriptionStatus.Expired)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Subscription expired",
                message = "Your subscription has expired. Please renew to continue using DukaPoS.",
                code = "SUBSCRIPTION_EXPIRED"
            });
            return;
        }

        var requiredFeature = path.StartsWith("/api/payments/mpesa", StringComparison.OrdinalIgnoreCase)
            ? WellKnownConstants.SubscriptionFeatures.MpesaStkPush
            : path.StartsWith("/api/expenses", StringComparison.OrdinalIgnoreCase)
                ? WellKnownConstants.SubscriptionFeatures.ExpenseTracking
                : path.StartsWith("/api/reports/top-products", StringComparison.OrdinalIgnoreCase)
                    ? WellKnownConstants.SubscriptionFeatures.TopProductsReports
                    : path.StartsWith("/api/inventory/products/barcode", StringComparison.OrdinalIgnoreCase)
                        ? WellKnownConstants.SubscriptionFeatures.QrCodeScanning
                        : null;
        var package = await session.LoadAsync<Package>(subscription.PackageId);
        var effectiveFeatures = package?.Features is { Count: > 0 } ? package.Features : subscription.Features;
        if (requiredFeature is not null && effectiveFeatures is { Count: > 0 } &&
            !effectiveFeatures.Contains(requiredFeature, StringComparer.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Feature unavailable",
                message = "This feature is available on the Intermediate and Business plans. Contact the seller to upgrade: 0729842998.",
                code = "SUBSCRIPTION_FEATURE_REQUIRED",
                requiredFeature
            });
            return;
        }

        await _next(context);
    }
}
