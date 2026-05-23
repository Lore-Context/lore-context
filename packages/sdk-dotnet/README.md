# LoreContext.Sdk for .NET

Source-preview .NET API client for Lore Context v2.0.7. NuGet publication is dry-run only until a human release gate approves it.

## Build and test

```bash
dotnet test packages/sdk-dotnet/LoreContext.Sdk.sln
```

## Package dry-run

```bash
node scripts/sdk/dotnet-dry-run.mjs
dotnet pack packages/sdk-dotnet/src/LoreContext.Sdk/LoreContext.Sdk.csproj --configuration Release --output packages/sdk-dotnet/artifacts --no-build
```

## Quick usage

```csharp
using LoreContext.Sdk;

var client = new LoreContextClient(new Uri("https://api.lorecontext.com"), Environment.GetEnvironmentVariable("LORE_API_KEY"));
using var request = client.CreateContextQueryRequest("What should this agent remember?");
Console.WriteLine(await request.Content!.ReadAsStringAsync());
```
