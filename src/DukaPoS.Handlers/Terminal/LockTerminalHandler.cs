using DukaPoS.Domain.Identity;
using DukaPoS.Messages.Terminal;
using Marten;

namespace DukaPoS.Handlers.Terminal;

public static class LockTerminalHandler
{
    public static async Task<TerminalLockedEvent> Handle(LockTerminalCommand command, IDocumentSession session)
    {
        var termSession = await session.LoadAsync<TerminalSession>(command.SessionId)
            ?? throw new InvalidOperationException("Terminal session not found");

        termSession.Status = TerminalStatus.Locked;
        termSession.LockedAt = DateTimeOffset.UtcNow;
        session.Store(termSession);

        return new TerminalLockedEvent(command.SessionId, termSession.UserId);
    }
}
