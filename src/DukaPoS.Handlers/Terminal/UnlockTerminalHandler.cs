using DukaPoS.Domain.Identity;
using DukaPoS.Infrastructure.Auth;
using DukaPoS.Messages.Terminal;
using Marten;

namespace DukaPoS.Handlers.Terminal;

public static class UnlockTerminalHandler
{
    public static async Task<TerminalUnlockedEvent> Handle(
        UnlockTerminalWithPinCommand command,
        IDocumentSession session,
        IPasswordService passwordService)
    {
        var users = await session.Query<User>()
            .Where(u => u.IsActive && u.PinHash != null)
            .ToListAsync();

        var user = users.FirstOrDefault(u => passwordService.Verify(command.Pin, u.PinHash!))
            ?? throw new InvalidOperationException("Invalid PIN");

        var termSession = await session.LoadAsync<TerminalSession>(command.SessionId)
            ?? throw new InvalidOperationException("Terminal session not found");

        termSession.Status = TerminalStatus.Active;
        termSession.UnlockedAt = DateTimeOffset.UtcNow;
        termSession.UnlockedByUserId = user.Id;
        termSession.UnlockMethod = "PIN";
        session.Store(termSession);

        return new TerminalUnlockedEvent(command.SessionId, user.Id, "PIN");
    }
}
