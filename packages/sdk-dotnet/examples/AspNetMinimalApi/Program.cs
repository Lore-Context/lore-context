using LoreContext.Sdk;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton(_ => LoreContextClient.Create(
    builder.Configuration["Lore:BaseUrl"] ?? "https://api.lorecontext.com",
    builder.Configuration["Lore:ApiKey"] ?? Environment.GetEnvironmentVariable("LORE_API_KEY")));

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/lore/context", async (ContextRequest input, LoreContextClient lore, CancellationToken cancellationToken) =>
{
    using var request = lore.CreateContextQueryRequest(input.Query);
    using var response = await lore.HttpClient.SendAsync(request, cancellationToken);
    string body = await response.Content.ReadAsStringAsync(cancellationToken);
    return Results.Content(body, "application/json", statusCode: (int)response.StatusCode);
});

app.Run();

public sealed record ContextRequest(string Query);
