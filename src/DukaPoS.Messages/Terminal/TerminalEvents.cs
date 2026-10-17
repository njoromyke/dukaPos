namespace DukaPoS.Messages.Terminal;

public record TerminalLockedEvent(Guid SessionId, Guid UserId);
public record TerminalUnlockedEvent(Guid SessionId, Guid UnlockedByUserId, string Method);
