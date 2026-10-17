namespace DukaPoS.Messages.Terminal;

public record LockTerminalCommand(Guid SessionId);
public record UnlockTerminalWithPinCommand(Guid SessionId, string Pin);
public record UnlockTerminalWithCardCommand(Guid SessionId, string CardToken);
public record StartTerminalSessionCommand(Guid UserId, string TerminalId, Guid BranchId);
public record TerminalSessionResult(Guid SessionId, string Status);
