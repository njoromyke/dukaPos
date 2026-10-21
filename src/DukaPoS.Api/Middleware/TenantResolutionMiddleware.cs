using DukaPoS.Domain;

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
        var tenantClaim = context.User.FindFirst("tenantId");
        if (tenantClaim != null)
        {
            tenantContext.TenantId = tenantClaim.Value;
        }
        else if (context.Request.Headers.TryGetValue(WellKnownConstants.TenantHeaderName, out var headerTenantId))
        {
            tenantContext.TenantId = headerTenantId.ToString();
        }
        else
        {
            var host = context.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length >= 3 && parts[1].Equals("dukapos", StringComparison.OrdinalIgnoreCase))
            {
                tenantContext.TenantId = parts[0];
            }
        }

        await _next(context);
    }
}
