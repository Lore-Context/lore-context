package lorecontext

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGeneratedClientHealthAndMemoryShapes(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/health":
			_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "service": "lore-api"})
		case "/v1/memory/write":
			if r.Header.Get("x-lore-api-key") != "test-key" {
				t.Fatalf("missing api key header")
			}
			var payload MemoryWriteRequest
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatal(err)
			}
			if payload.Content == "" {
				t.Fatal("memory write content missing")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"id": "mem_123"})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	cfg := NewConfiguration()
	cfg.Servers = ServerConfigurations{{URL: server.URL, Description: "test server"}}
	client := NewAPIClient(cfg)
	ctx := context.WithValue(context.Background(), ContextAPIKeys, map[string]APIKey{
		"loreApiKey": {Key: "test-key"},
	})

	if _, _, err := client.DefaultAPI.GetHealth(context.Background()).Execute(); err != nil {
		t.Fatal(err)
	}
	if _, _, err := client.DefaultAPI.MemoryWrite(ctx).MemoryWriteRequest(*NewMemoryWriteRequest("remember the v2.0.7 dry-run gate")).Execute(); err != nil {
		t.Fatal(err)
	}
}
