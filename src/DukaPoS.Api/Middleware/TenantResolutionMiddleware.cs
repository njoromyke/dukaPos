namespace DukaPoS.Api.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        // Try X-Tenant-Id header first (mobile/desktop clients)
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId))
        {
            tenantContext.TenantId = headerTenantId.ToString();
        }
        else
        {
            // Try subdomain: {slug}.dukapos.co.ke
            var host = context.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length >= 3 && parts[1].Equals("dukapos", StringComparison.OrdinalIgnoreCase))
            {
                tenantContext.TenantId = parts[0];
            }
        }

        // Also check JWT claims for tenantId
        if (string.IsNullOrEmpty(tenantContext.TenantId))
        {
            var tenantClaim = context.User.FindFirst("tenantId");
            if (tenantClaim != null)
                tenantContext.TenantId = tenantClaim.Value;
        }

        await _next(context);
    }
}
