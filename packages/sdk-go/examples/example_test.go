package examples_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	lorecontext "github.com/lore-context/lore-context-go-sdk"
)

func TestHealthOpenAPIMemoryAndContextExamplesCompile(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path != "/health" && r.URL.Path != "/openapi.json" && r.Header.Get("x-lore-api-key") != "test-key" {
			t.Fatalf("expected API key header for %s", r.URL.Path)
		}

		switch r.URL.Path {
		case "/health":
			_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "service": "lore-api"})
		case "/openapi.json":
			_ = json.NewEncoder(w).Encode(map[string]any{"openapi": "3.1.0", "info": map[string]any{"title": "Lore API", "version": "2.0.5"}})
		case "/v1/memory/write":
			var req lorecontext.MemoryWriteRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Fatal(err)
			}
			if req.Content == "" {
				t.Fatal("memory write content missing")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"id": "mem_123"})
		case "/v1/memory/search":
			var req lorecontext.MemorySearchRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Fatal(err)
			}
			if req.Query == "" {
				t.Fatal("memory search query missing")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"hits": []any{}})
		case "/v1/context/query":
			var req lorecontext.ContextQueryRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Fatal(err)
			}
			if req.Query == "" {
				t.Fatal("context query missing")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"context": "release checklist", "sources": []any{}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	configuration := lorecontext.NewConfiguration()
	configuration.Servers = lorecontext.ServerConfigurations{{URL: server.URL, Description: "example test server"}}
	client := lorecontext.NewAPIClient(configuration)
	ctx := context.WithValue(context.Background(), lorecontext.ContextAPIKeys, map[string]lorecontext.APIKey{
		"loreApiKey": {Key: "test-key"},
	})

	if _, _, err := client.DefaultAPI.GetHealth(context.Background()).Execute(); err != nil {
		t.Fatal(err)
	}
	if _, _, err := client.DefaultAPI.GetOpenApiDocument(context.Background()).Execute(); err != nil {
		t.Fatal(err)
	}
	if _, _, err := client.DefaultAPI.MemoryWrite(ctx).MemoryWriteRequest(*lorecontext.NewMemoryWriteRequest("remember the dry-run release gate")).Execute(); err != nil {
		t.Fatal(err)
	}

	search := lorecontext.NewMemorySearchRequest("dry-run release gate")
	search.SetTopK(5)
	if _, _, err := client.DefaultAPI.MemorySearch(ctx).MemorySearchRequest(*search).Execute(); err != nil {
		t.Fatal(err)
	}

	query := lorecontext.NewContextQueryRequest("What is the Go SDK release rule?")
	query.SetIncludeSources(true)
	if _, _, err := client.DefaultAPI.ContextQuery(ctx).ContextQueryRequest(*query).Execute(); err != nil {
		t.Fatal(err)
	}
}

func TestCodeGraphPayloadConstructionExample(t *testing.T) {
	payload := map[string]any{
		"repo": map[string]any{"name": "lore-cloud", "primary_lang": "go"},
		"files": []map[string]any{{
			"relative_path": "cmd/example/main.go",
			"language":      "go",
			"symbols":       []map[string]any{{"name": "main", "kind": "function", "start_line": 1, "end_line": 5}},
		}},
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	if len(encoded) == 0 {
		t.Fatal("expected payload bytes")
	}
}
