# Go SDK quickstart

The Go SDK is a v2.0.7 beta API client. It is intended for server-side Go
services that need direct Lore REST API access without wrapping an LLM provider
SDK. Publishing remains dry-run only until a human release gate approves the
public module.

## Install target

```bash
go get github.com/lore-context/lore-context-go-sdk
```

For local repository verification:

```bash
cd packages/sdk-go
go test ./...
cd examples
go test ./...
```

## Health and OpenAPI metadata

```go
cfg := lorecontext.NewConfiguration()
cfg.Host = "api.lorecontext.com"
cfg.Scheme = "https"

apiKey := os.Getenv("LORE_API_KEY")
cfg.AddDefaultHeader("x-lore-api-key", apiKey)
client := lorecontext.NewAPIClient(cfg)

ctx := context.WithValue(context.Background(), lorecontext.ContextAPIKeys, map[string]lorecontext.APIKey{
    "loreApiKey": {Key: apiKey},
})

_ = client.DefaultAPI.GetHealth(ctx)
fmt.Println("go: health check request constructed")
```

## Memory search and context query

```go
search := lorecontext.MemorySearchRequest{
    Query: "launch checklist",
}
search.SetLimit(5)

_ = client.DefaultAPI.MemorySearch(ctx).MemorySearchRequest(search)

query := lorecontext.ContextQueryRequest{
    Query: "what is next?",
}
query.SetMode("memory")
query.SetProjectId("vault-id")

_ = client.DefaultAPI.ContextQuery(ctx).ContextQueryRequest(query)
```

## Release dry-run

No Go module is published by unattended team work. The dry-run bar is:

```bash
cd packages/sdk-go && go test ./...
cd examples && go test ./...
```

After human approval, a release operator can tag and publish the module from the
same source tree. Until then, downstream consumers should treat this as a beta
client surface.
