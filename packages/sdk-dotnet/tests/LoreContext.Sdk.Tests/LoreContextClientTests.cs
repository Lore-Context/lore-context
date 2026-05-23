using System.Text.Json;
using Xunit;
using LoreContext.Sdk;

namespace LoreContext.Sdk.Tests;

public sealed class LoreContextClientTests
{
    [Fact]
    public void ContextQueryRequest_UsesExpectedPathAndBody()
    {
        var client = LoreContextClient.Create("https://api.lorecontext.com", "test-token");
        using var request = client.CreateContextQueryRequest("release notes");

        Assert.Equal(HttpMethod.Post, request.Method);
        Assert.Equal("https://api.lorecontext.com/v1/context/query", request.RequestUri!.ToString());
        Assert.Equal("Bearer", request.Headers.Authorization!.Scheme);
        Assert.Equal("test-token", request.Headers.Authorization.Parameter);

        var body = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
        using var json = JsonDocument.Parse(body);
        Assert.Equal("release notes", json.RootElement.GetProperty("query").GetString());
        Assert.Equal(2048, json.RootElement.GetProperty("token_budget").GetInt32());
    }

    [Fact]
    public void CodeGraphRequestBuilders_AreJsonPostRequests()
    {
        var client = LoreContextClient.Create();
        using var search = client.CreateCodeGraphSearchRequest("repo", "Client");
        using var upsert = client.CreateCodeGraphUpsertRequest("repo", new[] { new { name = "Client" } });

        Assert.Equal("/v1/memory/search", search.RequestUri!.AbsolutePath);
        Assert.Equal("/v1/memory/write", upsert.RequestUri!.AbsolutePath);
        Assert.Equal("application/json", search.Content!.Headers.ContentType!.MediaType);
        Assert.Equal("application/json", upsert.Content!.Headers.ContentType!.MediaType);
    }
}
