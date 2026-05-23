import type { QdrantScoredPoint } from "./memory-search.js";
import type { MemorySearchInputV12 } from "./memory-search-v12.js";

export function resolveSystemTimeParam(input: MemorySearchInputV12): string | null {
  return input.asOfSystemTime ?? null;
}

export function isVisibleAtSystemTime(
  createdAt: string | null | undefined,
  expiredAt: string | null | undefined,
  systemTimeIso: string | null | undefined
): boolean {
  if (!systemTimeIso) return true;
  const systemTime = Date.parse(systemTimeIso);
  if (!Number.isFinite(systemTime)) return false;
  if (createdAt !== null && createdAt !== undefined && Date.parse(createdAt) > systemTime) {
    return false;
  }
  if (expiredAt !== null && expiredAt !== undefined && Date.parse(expiredAt) <= systemTime) {
    return false;
  }
  return true;
}

export function isPointVisibleAtSystemTime(
  point: QdrantScoredPoint,
  systemTimeIso: string | null | undefined
): boolean {
  const payload = point.payload ?? {};
  const createdAt = firstString(payload.t_created, payload.created_at);
  const expiredAt = firstString(payload.t_expired, payload.expired_at);
  return isVisibleAtSystemTime(createdAt, expiredAt, systemTimeIso);
}

export function filterQdrantPointsBySystemTime(
  points: ReadonlyArray<QdrantScoredPoint>,
  systemTimeIso: string | null | undefined
): QdrantScoredPoint[] {
  if (!systemTimeIso) return [...points];
  return points.filter((point) => isPointVisibleAtSystemTime(point, systemTimeIso));
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}
