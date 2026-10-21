using DukaPoS.Domain.Subscriptions;
using DukaPoS.Messages.Subscriptions;
using Marten;

namespace DukaPoS.Handlers.Subscriptions;

public static class CreatePackageHandler
{
    public static async Task<PackageDto> Handle(CreatePackageCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var package = new Package
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            Tier = command.Tier,
            Description = command.Description,
            MonthlyPrice = command.MonthlyPrice,
            LifetimePrice = command.LifetimePrice,
            Features = command.Features,
            MaxBranches = command.MaxBranches,
            MaxUsers = command.MaxUsers,
        };

        session.Store(package);
        await session.SaveChangesAsync();

        return ToDto(package);
    }

    internal static PackageDto ToDto(Package p) =>
        new(p.Id, p.Name, p.Tier, p.Description, p.MonthlyPrice, p.LifetimePrice,
            p.Features, p.MaxBranches, p.MaxUsers, p.IsActive);
}

public static class UpdatePackageHandler
{
    public static async Task<PackageDto> Handle(UpdatePackageCommand command, IDocumentStore store)
    {
        await using var session = store.LightweightSession();

        var package = await session.LoadAsync<Package>(command.Id)
            ?? throw new InvalidOperationException("Package not found.");

        package.Name = command.Name;
        package.Description = command.Description;
        package.MonthlyPrice = command.MonthlyPrice;
        package.LifetimePrice = command.LifetimePrice;
        package.Features = command.Features;
        package.MaxBranches = command.MaxBranches;
        package.MaxUsers = command.MaxUsers;
        package.IsActive = command.IsActive;
        package.UpdatedAt = DateTimeOffset.UtcNow;

        session.Store(package);
        await session.SaveChangesAsync();

        return CreatePackageHandler.ToDto(package);
    }
}

public static class GetPackagesHandler
{
    public static async Task<IReadOnlyList<PackageDto>> Handle(GetPackagesQuery query, IDocumentStore store)
    {
        await using var session = store.QuerySession();

        var packages = await session.Query<Package>()
            .OrderBy(p => p.Tier)
            .ToListAsync();

        return packages.Select(CreatePackageHandler.ToDto).ToList();
    }
}
