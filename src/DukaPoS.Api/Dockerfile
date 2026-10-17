FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["DukaPoS.Api/DukaPoS.Api.csproj", "DukaPoS.Api/"]
COPY ["DukaPoS.Domain/DukaPoS.Domain.csproj", "DukaPoS.Domain/"]
COPY ["DukaPoS.Messages/DukaPoS.Messages.csproj", "DukaPoS.Messages/"]
COPY ["DukaPoS.Handlers/DukaPoS.Handlers.csproj", "DukaPoS.Handlers/"]
COPY ["DukaPoS.Infrastructure/DukaPoS.Infrastructure.csproj", "DukaPoS.Infrastructure/"]
RUN dotnet restore "DukaPoS.Api/DukaPoS.Api.csproj"
COPY . .
WORKDIR "/src/DukaPoS.Api"
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DukaPoS.Api.dll"]
