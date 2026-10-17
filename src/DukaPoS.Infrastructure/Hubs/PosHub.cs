using Microsoft.AspNetCore.SignalR;

namespace DukaPoS.Infrastructure.Hubs;

public class PosHub : Hub
{
    public async Task JoinBranch(string branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"branch_{branchId}");
    }

    public async Task LeaveBranch(string branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"branch_{branchId}");
    }
}

public static class PosHubExtensions
{
    public static async Task NotifySaleCompleted(this IHubContext<PosHub> hub, Guid branchId, object saleData)
    {
        await hub.Clients.Group($"branch_{branchId}").SendAsync("SaleCompleted", saleData);
    }

    public static async Task NotifyTabParked(this IHubContext<PosHub> hub, Guid branchId, object tabData)
    {
        await hub.Clients.Group($"branch_{branchId}").SendAsync("TabParked", tabData);
    }

    public static async Task NotifyTabRecalled(this IHubContext<PosHub> hub, Guid branchId, object tabData)
    {
        await hub.Clients.Group($"branch_{branchId}").SendAsync("TabRecalled", tabData);
    }

    public static async Task NotifyPaymentReceived(this IHubContext<PosHub> hub, Guid branchId, object paymentData)
    {
        await hub.Clients.Group($"branch_{branchId}").SendAsync("PaymentReceived", paymentData);
    }
}
