import type { WebEvidence } from "@lore/shared";

export interface SearchInput {
  query: string;
  limit?: number;
  freshness?: "none" | "recent" | "latest";
}

export interface FetchInput {
  url: string;
}

export interface FetchedPage {
  url: string;
  title?: string;
  content: string;
  fetchedAt: string;
}

export interface SearchProvider {
  name: string;
  search(input: SearchInput): Promise<WebEvidence[]>;
  fetch?(input: FetchInput): Promise<FetchedPage>;
}

export const noopSearchProvider: SearchProvider = {
  name: "noop",
  async search() {
    return [];
  }
};

export interface StaticSearchProviderOptions {
  results: WebEvidence[];
}

export class StaticSearchProvider implements SearchProvider {
  readonly name = "static";

  constructor(private readonly options: StaticSearchProviderOptions) {}

  async search(input: SearchInput): Promise<WebEvidence[]> {
    const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
    const limit = input.limit ?? 10;

    return this.options.results
      .filter((item) => {
        const haystack = `${item.title} ${item.snippet}`.toLowerCase();
        return terms.length === 0 || terms.some((term) => haystack.includes(term));
      })
      .slice(0, limit);
  }
}

export interface ZapfetchSearchProviderConfig {
  apiUrl: string;
  apiKey?: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
}

export class ZapfetchSearchProvider implements SearchProvider {
  readonly name = "zapfetch";
  private readonly fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;

  constructor(private readonly config: ZapfetchSearchProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async search(input: SearchInput): Promise<WebEvidence[]> {
    const response = await this.fetchImpl(`${this.config.apiUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {})
      },
      body: JSON.stringify({
        query: input.query,
        freshness: input.freshness,
        top_k: input.limit ?? 5
      })
    });

    if (!response.ok) {
      throw new Error(`search provider failed: ${response.status}`);
    }

    const payload = (await response.json()) as { results?: Array<Partial<WebEvidence>> };
    return (payload.results ?? []).map((item, index) => ({
      id: item.id ?? `web_${index}`,
      title: item.title ?? "Untitled source",
      url: item.url,
      snippet: item.snippet ?? "",
      source: item.source ?? this.name,
      fetchedAt: item.fetchedAt
    }));
  }
}
