using System.Security.Claims;
using System.Text.Json;
using DukaPoS.Domain;
using DukaPoS.Domain.Identity;
using Marten;
using Microsoft.AspNetCore.Routing;

namespace DukaPoS.Api.Middleware;

/// <summary>Writes a compact audit record for API requests without storing request bodies or credentials.</summary>
public sealed class ApiAuditMiddleware(RequestDelegate next, ILogger<ApiAuditMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, IDocumentStore store, TenantContext tenantContext)
    {
        var path = context.Request.Path;
        if (!path.StartsWithSegments("/api") || HttpMethods.IsOptions(context.Request.Method))
        {
            await next(context);
            return;
        }

        try
        {
            await next(context);
        }
        catch
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            throw;
        }
        finally
        {
            await PersistAuditEntry(context, store, tenantContext, path);
        }
    }

    private async Task PersistAuditEntry(HttpContext context, IDocumentStore store, TenantContext tenantContext, PathString path)
    {
        try
        {
            var userIdValue = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var hasUser = Guid.TryParse(userIdValue, out var userId);
            var tenantId = context.User.FindFirstValue("tenantId") ?? tenantContext.TenantId ?? "system";
            var route = context.GetEndpoint() is RouteEndpoint endpoint
                ? endpoint.RoutePattern.RawText
                : path.Value;
            var table = ResolveTable(path);
            var action = ResolveAction(context.Request.Method, path);
            var entityId = Guid.TryParse(path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries).LastOrDefault(), out var parsedId)
                ? parsedId
                : Guid.Empty;
            var details = JsonSerializer.Serialize(new
            {
                statusCode = context.Response.StatusCode,
                route,
            });

            var remoteIp = context.Connection.RemoteIpAddress;
            var ipAddress = remoteIp?.IsIPv4MappedToIPv6 == true
                ? remoteIp.MapToIPv4().ToString()
                : remoteIp?.ToString();

            await using var session = store.LightweightSession(tenantId);
            session.Store(new AuditLogEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = hasUser ? userId : Guid.Empty,
                UserName = context.User.Identity?.Name
                    ?? context.User.FindFirstValue(ClaimTypes.Email)
                    ?? context.User.FindFirstValue("email")
                    ?? (hasUser ? userId.ToString() : "Anonymous"),
                Action = action,
                EntityType = table,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress,
                UserAgent = context.Request.Headers.UserAgent.ToString(),
                RequestPath = path.Value,
                HttpMethod = context.Request.Method,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await session.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Audit persistence must not turn an otherwise successful request into an API failure.
            logger.LogError(ex, "Failed to persist API audit record for {Method} {Path}", context.Request.Method, path);
        }
    }

    private static string ResolveAction(string method, PathString path)
    {
        var normalizedPath = path.Value?.TrimEnd('/').ToLowerInvariant() ?? string.Empty;
        if (normalizedPath.EndsWith("/login")) return "Login";
        if (normalizedPath.Contains("/stock/adjust")) return "AdjustStock";
        if (normalizedPath.EndsWith("/cash")) return "RecordCashPayment";
        if (normalizedPath.Contains("/stk-push")) return "InitiateMpesaPayment";
        if (normalizedPath.EndsWith("/open")) return "OpenSale";
        if (normalizedPath.EndsWith("/add-item")) return "AddSaleItem";
        if (normalizedPath.EndsWith("/remove-item")) return "RemoveSaleItem";
        if (normalizedPath.EndsWith("/void")) return "VoidSale";
        if (normalizedPath.Contains("/unlock")) return "Unlock";
        if (normalizedPath.Contains("/lock")) return "Lock";
        if (normalizedPath.Contains("/reset-password")) return "ResetPassword";
        return method.ToUpperInvariant() switch
        {
            "GET" or "HEAD" => "Query",
            "POST" => "Create",
            "PUT" or "PATCH" => "Update",
            "DELETE" => "Delete",
            _ => method.ToUpperInvariant(),
        };
    }

    private static string ResolveTable(PathString path)
    {
        var segments = path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? [];
        if (segments.Length < 2) return "dukapos_api_requests";
        var resource = segments[1].ToLowerInvariant();
        var subresource = segments.Length > 2 ? segments[2].ToLowerInvariant() : string.Empty;
        var table = (resource, subresource) switch
        {
            ("inventory", "products") => "products",
            ("inventory", "categories") => "categories",
            ("inventory", "stock") => segments.Length > 3 && segments[3].Equals("levels", StringComparison.OrdinalIgnoreCase)
                ? "stock_levels"
                : "stock_movements",
            ("sales", "tabs") => "tabs",
            ("sales", _) => "sales",
            ("payments", _) => "payments",
            ("expenses", _) => "expenses",
            ("users", _) => "users",
            ("admin", "users") => "users",
            ("admin", "tenants") => "tenants",
            ("tenant-settings", _) => "tenant_settings",
            ("branch", _) => "branches",
            ("blobs", _) => "blob_entries",
            ("receipt", _) => "fiscal_invoices",
            ("terminal", _) => "terminal_sessions",
            ("reports", _) => "sales",
            ("auth", _) => "users",
            ("audit", _) => "audit_log_entries",
            _ => resource,
        };
        return $"{WellKnownConstants.TablePrefix}{table}";
    }
}
