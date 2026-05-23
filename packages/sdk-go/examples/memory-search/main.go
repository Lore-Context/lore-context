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

	query := lorecontext.MemorySearchRequest{
		Query: "go sdk import example",
	}
	query.SetTopK(3)

	_ = client.DefaultAPI.MemorySearch(ctx).MemorySearchRequest(query)
	fmt.Println("go: memory search request constructed")
}
