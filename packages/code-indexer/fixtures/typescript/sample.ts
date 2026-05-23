/**
 * Sample TypeScript fixture for Lane M recall/precision testing.
 * Hand-labeled: 17 expected symbols, 8 expected call relations.
 */

import { EventEmitter } from "events";
import type { ReadStream } from "fs";

/** Describes a vault entity. */
export interface Vault {
  id: string;
  name: string;
  createdAt: Date;
}

/** Symbol kind discriminator. */
export type SymbolKind = "function" | "class" | "interface" | "type" | "enum" | "const" | "method";

/** Severity levels for logging. */
export enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

export const DEFAULT_PAGE_SIZE = 50;

/**
 * Base repository interface.
 * @template T - The entity type.
 */
export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

/** Vault repository implementation backed by in-memory store. */
export class VaultRepository implements BaseRepository<Vault> {
  private store: Map<string, Vault> = new Map();

  async findById(id: string): Promise<Vault | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Vault[]> {
    return Array.from(this.store.values());
  }

  async save(vault: Vault): Promise<Vault> {
    this.store.set(vault.id, vault);
    return vault;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

/** Vault service orchestrates business logic. */
export class VaultService extends EventEmitter {
  constructor(private readonly repo: VaultRepository) {
    super();
  }

  async getVault(id: string): Promise<Vault | null> {
    const vault = await this.repo.findById(id);
    return vault;
  }

  async listVaults(): Promise<Vault[]> {
    return this.repo.findAll();
  }

  async createVault(name: string): Promise<Vault> {
    const vault: Vault = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    const saved = await this.repo.save(vault);
    this.emit("created", saved);
    return saved;
  }

  async removeVault(id: string): Promise<void> {
    await this.repo.delete(id);
    this.emit("deleted", id);
  }
}

/** Helper: paginate an array. */
export function paginate<T>(items: T[], page: number, size: number = DEFAULT_PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

/** Helper: format a vault name for display. */
export function formatVaultName(vault: Vault): string {
  return `[${vault.id.slice(0, 8)}] ${vault.name}`;
}
