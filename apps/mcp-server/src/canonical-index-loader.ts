import type { CanonicalEpisode } from "./instructions-builder.js";

export interface CanonicalIndexLoaderDeps {
  pg: {
    query<R>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
  };
}

export async function loadCanonicalEpisodes(
  vaultId: string,
  deps: CanonicalIndexLoaderDeps
): Promise<CanonicalEpisode[]> {
  try {
    const result = await deps.pg.query<{ episodes: unknown }>(
      "SELECT episodes FROM vault_canonical_index WHERE vault_id=$1",
      [vaultId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    const episodes = result.rows[0].episodes;
    if (!Array.isArray(episodes) || episodes.length === 0) {
      return [];
    }

    return episodes as CanonicalEpisode[];
  } catch (error) {
    console.warn(
      "[lore-mcp] loadCanonicalEpisodes: failed to load canonical index, falling back to empty",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}
