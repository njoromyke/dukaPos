namespace DukaPoS.Messages.Tenancy;

public record GetBranchQuery(Guid BranchId);
public record UpdateBranchCommand(Guid Id, string Name, string Address, string Phone);
public record BranchDto(Guid Id, string Name, string Address, string Phone, bool IsActive);
