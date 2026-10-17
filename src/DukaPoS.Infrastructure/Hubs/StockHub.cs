using Microsoft.AspNetCore.SignalR;

namespace DukaPoS.Infrastructure.Hubs;

public class StockHub : Hub
{
    public async Task JoinBranch(string branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"stock_{branchId}");
    }

    public async Task LeaveBranch(string branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"stock_{branchId}");
    }
}

public static class StockHubExtensions
{
    public static async Task NotifyStockUpdated(this IHubContext<StockHub> hub, Guid branchId, object stockData)
    {
        await hub.Clients.Group($"stock_{branchId}").SendAsync("StockUpdated", stockData);
    }

    public static async Task NotifyLowStock(this IHubContext<StockHub> hub, Guid branchId, object alertData)
    {
        await hub.Clients.Group($"stock_{branchId}").SendAsync("LowStockAlert", alertData);
    }
}
