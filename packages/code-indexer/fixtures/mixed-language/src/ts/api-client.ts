/**
 * TypeScript API client — part of mixed-language fixture for M4 cross-language detection test.
 */

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export class ApiClient {
  constructor(private config: ApiConfig) {}

  async get(path: string): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(this.config.timeout) });
    return response.json();
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    });
    return response.json();
  }
}

export function createClient(baseUrl: string, timeout = 5000): ApiClient {
  return new ApiClient({ baseUrl, timeout });
}
