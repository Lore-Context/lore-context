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

	query := lorecontext.ContextQueryRequest{
		Query: "What did we discuss last?",
	}
	query.SetMode("memory")
	query.SetProjectId("vault-id")

	_ = client.DefaultAPI.ContextQuery(ctx).ContextQueryRequest(query)
	fmt.Println("go: context query request constructed")
}
