# Lore Go SDK

Beta Go API SDK for Lore Context. This package is part of the v2.0.7 SDK
coverage lane and is dry-run only until a human publish gate approves a public
module release.

## Install target

```bash
go get github.com/lore-context/lore-context-go-sdk
```

For local development in this repository:

```bash
cd packages/sdk-go
go test ./...
```

## Quick start

```go
package main

import (
    "context"
    "fmt"
    "os"

    lorecontext "github.com/lore-context/lore-context-go-sdk"
)

func main() {
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
}
```

See `examples/` for compile-checked health, memory/context, and code graph
request construction.
