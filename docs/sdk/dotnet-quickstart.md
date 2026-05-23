# .NET SDK Quickstart

The v2.0.7 .NET SDK source preview lives in `packages/sdk-dotnet`. NuGet publication is dry-run only until a human release gate approves it.

## Install from source

```bash
dotnet add package LoreContext.Sdk --prerelease
```

Until the NuGet package is approved, reference the project directly from this repository:

```xml
<ProjectReference Include="../packages/sdk-dotnet/src/LoreContext.Sdk/LoreContext.Sdk.csproj" />
```

## Verify locally

```bash
dotnet test packages/sdk-dotnet/LoreContext.Sdk.sln
dotnet build packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj
node scripts/sdk/dotnet-dry-run.mjs
```

## Basic C# usage

```csharp
using LoreContext.Sdk;

var client = LoreContextClient.Create("https://api.lorecontext.com", Environment.GetEnvironmentVariable("LORE_API_KEY"));
using var request = client.CreateContextQueryRequest("What did we decide?");
Console.WriteLine(await request.Content!.ReadAsStringAsync());
```

## ASP.NET Core minimal API sample

`packages/sdk-dotnet/examples/AspNetMinimalApi` exposes a small `/lore/context` route that forwards a context query through `LoreContextClient`. It reads `Lore:BaseUrl`, `Lore:ApiKey`, or `LORE_API_KEY` and does not require production configuration changes.

```bash
dotnet run --project packages/sdk-dotnet/examples/AspNetMinimalApi/AspNetMinimalApi.csproj
curl -s http://localhost:5000/health
```

## Dry-run packaging notes

The GitHub SDK publish workflow accepts `sdk-dotnet-v*` tags but refuses live NuGet publication unless the workflow input `dry_run` is `true`. Local dry-run structure checks use:

```bash
node scripts/sdk/dotnet-dry-run.mjs
```

If `dotnet` is unavailable locally, record the exact toolchain gap and use the GitHub Actions dry-run build before publishing.
