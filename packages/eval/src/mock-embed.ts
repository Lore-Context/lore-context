export const MOCK_EMBED_DIM = 1024;

/**
 * Deterministic embedder: FNV-1a seed → LCG-filled Float32Array → L2-normalized.
 * Byte-reproducible across machines; no real model needed in CI.
 */
export function mockEmbed(text: string, dim: number = MOCK_EMBED_DIM): Float32Array {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash ^ text.charCodeAt(i)) >>> 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const vec = new Float32Array(dim);
  let state = hash;
  for (let i = 0; i < dim; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    vec[i] = (state / 0xffffffff) * 2 - 1;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }

  return vec;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error("Vector dimension mismatch");
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function rankByCosine(
  queryText: string,
  candidates: Array<{ memoryId: string; text: string }>,
  k: number,
  dim: number = MOCK_EMBED_DIM
): Array<{ memoryId: string; score: number }> {
  const queryVec = mockEmbed(queryText, dim);
  const scored = candidates.map((c) => ({
    memoryId: c.memoryId,
    score: cosineSimilarity(queryVec, mockEmbed(c.text, dim)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
