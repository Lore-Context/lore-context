using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LoreContext.Sdk;

/// <summary>Small API-client-first .NET SDK for Lore Context.</summary>
public sealed class LoreContextClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public LoreContextClient(Uri baseUri, string? apiKey = null, HttpClient? httpClient = null)
    {
        BaseUri = baseUri ?? throw new ArgumentNullException(nameof(baseUri));
        ApiKey = apiKey;
        HttpClient = httpClient ?? new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public Uri BaseUri { get; }
    public string? ApiKey { get; }
    public HttpClient HttpClient { get; }

    public static LoreContextClient Create(string baseUrl = "https://api.lorecontext.com", string? apiKey = null, HttpClient? httpClient = null) =>
        new(new Uri(baseUrl.TrimEnd('/') + "/"), apiKey, httpClient);

    public HttpRequestMessage CreateHealthRequest() => CreateRequest(HttpMethod.Get, "health");

    public HttpRequestMessage CreateOpenApiMetadataRequest() => CreateRequest(HttpMethod.Get, "openapi.json");

    public HttpRequestMessage CreateContextQueryRequest(string query, string mode = "memory", int tokenBudget = 2048) =>
        CreateJsonRequest(HttpMethod.Post, "v1/context/query", new { query, mode, token_budget = tokenBudget });

    public HttpRequestMessage CreateMemoryWriteRequest(object content, string source) =>
        CreateJsonRequest(HttpMethod.Post, "v1/memory/write", new { content, source });

    public HttpRequestMessage CreateMemorySearchRequest(string query) =>
        CreateJsonRequest(HttpMethod.Post, "v1/memory/search", new { query });

    public HttpRequestMessage CreateCodeGraphSearchRequest(string repo, string query) =>
        CreateJsonRequest(HttpMethod.Post, "v1/memory/search", new { query, filters = new { repo, memory_type = "code" } });

    public HttpRequestMessage CreateCodeGraphUpsertRequest(string repo, object symbols) =>
        CreateJsonRequest(HttpMethod.Post, "v1/memory/write", new { source = "code-indexer", memory_type = "code", content = new { repo, symbols } });

    public async Task<HealthResponse> GetHealthAsync(CancellationToken cancellationToken = default) =>
        await SendJsonAsync<HealthResponse>(CreateHealthRequest(), cancellationToken).ConfigureAwait(false);

    public async Task<T> SendJsonAsync<T>(HttpRequestMessage request, CancellationToken cancellationToken = default)
    {
        using HttpResponseMessage response = await HttpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        string body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw new LoreContextApiException((int)response.StatusCode, body);
        }
        return JsonSerializer.Deserialize<T>(body, JsonOptions)
            ?? throw new LoreContextApiException((int)response.StatusCode, "Lore API returned an empty response body.");
    }

    private HttpRequestMessage CreateJsonRequest(HttpMethod method, string path, object body)
    {
        HttpRequestMessage request = CreateRequest(method, path);
        request.Content = new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json");
        return request;
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        HttpRequestMessage request = new(method, new Uri(BaseUri, path));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (!string.IsNullOrWhiteSpace(ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
        }
        return request;
    }
}

public sealed record HealthResponse(string Status, string? Service = null, string? Version = null);

public sealed class LoreContextApiException(int statusCode, string responseBody) : Exception($"Lore API returned HTTP {statusCode}: {responseBody}")
{
    public int StatusCode { get; } = statusCode;
    public string ResponseBody { get; } = responseBody;
}
