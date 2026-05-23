import type { LoreProfile, ProfileItem } from "./types.js";
import type { MemoryInboxItem } from "./inbox.js";
import type { MemoryEdge } from "./edges.js";
import type { EvidenceLedgerTrace } from "./evidence-ledger.js";
import type { MemoryLifecycleRecord, MemoryLifecycleState } from "./memory-lifecycle.js";

/**
 * Repository interfaces for the v0.8 profile lane.
 *
 * The cloud-platform lane will swap these in-memory implementations for
 * Postgres-backed ones (`apps/api/src/db/repositories/*`). Keeping the
 * interfaces here means the API can construct concrete repos without taking
 * a runtime dependency on the package, and tests can use the in-memory
 * versions without a database.
 */

export interface InboxRepository {
  upsert(item: MemoryInboxItem): Promise<MemoryInboxItem>;
  get(id: string): Promise<MemoryInboxItem | undefined>;
  listByVault(vaultId: string): Promise<MemoryInboxItem[]>;
  listByState(vaultId: string, state: MemoryInboxItem["state"]): Promise<MemoryInboxItem[]>;
}

export interface ProfileRepository {
  load(vaultId: string): Promise<LoreProfile | undefined>;
  save(profile: LoreProfile): Promise<LoreProfile>;
  upsertItem(vaultId: string, item: ProfileItem): Promise<ProfileItem>;
  deleteItem(vaultId: string, itemId: string): Promise<void>;
}

export interface MemoryEdgeRepository {
  add(edge: MemoryEdge): Promise<MemoryEdge>;
  listForMemory(memoryId: string): Promise<MemoryEdge[]>;
  listByRelation(vaultId: string, relation: MemoryEdge["relation"]): Promise<MemoryEdge[]>;
}

export interface EvidenceLedgerRepository {
  save(trace: EvidenceLedgerTrace): Promise<EvidenceLedgerTrace>;
  get(traceId: string): Promise<EvidenceLedgerTrace | undefined>;
  listByVault(vaultId: string, limit?: number): Promise<EvidenceLedgerTrace[]>;
}

export class InMemoryInboxRepository implements InboxRepository {
  private readonly byId = new Map<string, MemoryInboxItem>();

  async upsert(item: MemoryInboxItem): Promise<MemoryInboxItem> {
    this.byId.set(item.id, item);
    return item;
  }

  async get(id: string): Promise<MemoryInboxItem | undefined> {
    return this.byId.get(id);
  }

  async listByVault(vaultId: string): Promise<MemoryInboxItem[]> {
    return [...this.byId.values()].filter((i) => i.vaultId === vaultId);
  }

  async listByState(vaultId: string, state: MemoryInboxItem["state"]): Promise<MemoryInboxItem[]> {
    return [...this.byId.values()].filter((i) => i.vaultId === vaultId && i.state === state);
  }
}

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly byVault = new Map<string, LoreProfile>();

  async load(vaultId: string): Promise<LoreProfile | undefined> {
    return this.byVault.get(vaultId);
  }

  async save(profile: LoreProfile): Promise<LoreProfile> {
    this.byVault.set(profile.vaultId, profile);
    return profile;
  }

  async upsertItem(vaultId: string, item: ProfileItem): Promise<ProfileItem> {
    const profile = this.byVault.get(vaultId);
    if (!profile) throw new Error(`profile for vault ${vaultId} not found`);
    const updated: LoreProfile = {
      ...profile,
      static: profile.static.some((i) => i.id === item.id)
        ? profile.static.map((i) => (i.id === item.id ? item : i))
        : profile.static,
      dynamic: profile.dynamic.some((i) => i.id === item.id)
        ? profile.dynamic.map((i) => (i.id === item.id ? item : i))
        : profile.dynamic
    };
    this.byVault.set(vaultId, updated);
    return item;
  }

  async deleteItem(vaultId: string, itemId: string): Promise<void> {
    const profile = this.byVault.get(vaultId);
    if (!profile) return;
    this.byVault.set(vaultId, {
      ...profile,
      static: profile.static.filter((i) => i.id !== itemId),
      dynamic: profile.dynamic.filter((i) => i.id !== itemId),
      projects: profile.projects.map((p) => ({
        ...p,
        items: p.items.filter((i) => i.id !== itemId)
      }))
    });
  }
}

export class InMemoryMemoryEdgeRepository implements MemoryEdgeRepository {
  private readonly byId = new Map<string, MemoryEdge>();

  async add(edge: MemoryEdge): Promise<MemoryEdge> {
    this.byId.set(edge.id, edge);
    return edge;
  }

  async listForMemory(memoryId: string): Promise<MemoryEdge[]> {
    return [...this.byId.values()].filter((e) => e.fromMemoryId === memoryId || e.toMemoryId === memoryId);
  }

  async listByRelation(_vaultId: string, relation: MemoryEdge["relation"]): Promise<MemoryEdge[]> {
    return [...this.byId.values()].filter((e) => e.relation === relation);
  }
}

export class InMemoryEvidenceLedgerRepository implements EvidenceLedgerRepository {
  private readonly byId = new Map<string, EvidenceLedgerTrace>();

  async save(trace: EvidenceLedgerTrace): Promise<EvidenceLedgerTrace> {
    this.byId.set(trace.traceId, trace);
    return trace;
  }

  async get(traceId: string): Promise<EvidenceLedgerTrace | undefined> {
    return this.byId.get(traceId);
  }

  async listByVault(vaultId: string, limit?: number): Promise<EvidenceLedgerTrace[]> {
    const results = [...this.byId.values()]
      .filter((t) => t.vaultId === vaultId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return typeof limit === "number" ? results.slice(0, limit) : results;
  }
}

export interface MemoryLifecycleRepository {
  upsert(record: MemoryLifecycleRecord): Promise<MemoryLifecycleRecord>;
  get(id: string): Promise<MemoryLifecycleRecord | undefined>;
  listByVault(vaultId: string, options?: { state?: MemoryLifecycleState; limit?: number }): Promise<MemoryLifecycleRecord[]>;
  listBySource(vaultId: string, sourceApp: string): Promise<MemoryLifecycleRecord[]>;
}

export class InMemoryMemoryLifecycleRepository implements MemoryLifecycleRepository {
  private readonly byId = new Map<string, MemoryLifecycleRecord>();

  async upsert(record: MemoryLifecycleRecord): Promise<MemoryLifecycleRecord> {
    this.byId.set(record.id, record);
    return record;
  }

  async get(id: string): Promise<MemoryLifecycleRecord | undefined> {
    return this.byId.get(id);
  }

  async listByVault(
    vaultId: string,
    options: { state?: MemoryLifecycleState; limit?: number } = {}
  ): Promise<MemoryLifecycleRecord[]> {
    let results = [...this.byId.values()]
      .filter((r) => r.vaultId === vaultId)
      .filter((r) => options.state === undefined || r.state === options.state)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (options.limit !== undefined) results = results.slice(0, options.limit);
    return results;
  }

  async listBySource(vaultId: string, sourceApp: string): Promise<MemoryLifecycleRecord[]> {
    return [...this.byId.values()].filter(
      (r) => r.vaultId === vaultId && r.source.app === sourceApp
    );
  }
}
