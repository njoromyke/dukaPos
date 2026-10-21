using DukaPoS.Messages.Subscriptions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Wolverine;

namespace DukaPoS.Infrastructure.Notifications;

public class SubscriptionExpiryScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionExpiryScheduler> _logger;
    private readonly IHostApplicationLifetime _applicationLifetime;
    private readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public SubscriptionExpiryScheduler(
        IServiceScopeFactory scopeFactory,
        ILogger<SubscriptionExpiryScheduler> logger,
        IHostApplicationLifetime applicationLifetime)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _applicationLifetime = applicationLifetime;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_applicationLifetime.ApplicationStarted.IsCancellationRequested)
        {
            var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            using var registration = _applicationLifetime.ApplicationStarted.Register(() => started.TrySetResult());
            await started.Task.WaitAsync(stoppingToken);
        }

        if (stoppingToken.IsCancellationRequested) return;

        _logger.LogInformation("Subscription expiry scheduler started, checking every {Interval}", _interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();
                await bus.InvokeAsync(new CheckExpiredSubscriptionsCommand(), stoppingToken);
                _logger.LogDebug("Subscription expiry check completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during subscription expiry check");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }
}
