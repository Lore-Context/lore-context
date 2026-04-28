import { createMemoryRecord, type MemoryRecord, type MemoryScope, type MemoryStatus, type MemoryType } from "@lore/shared";

export interface LoreMemoryExport {
  format: "lore-memory-export";
  version: "0.1";
  exportedAt: string;
  memories: MemoryRecord[];
}

export function createLoreExport(memories: MemoryRecord[], exportedAt = new Date()): LoreMemoryExport {
  return {
    format: "lore-memory-export",
    version: "0.1",
    exportedAt: exportedAt.toISOString(),
    memories
  };
}

export function exportLoreJson(memories: MemoryRecord[], exportedAt = new Date()): string {
  return JSON.stringify(createLoreExport(memories, exportedAt), null, 2);
}

export function importLoreJson(input: string): MemoryRecord[] {
  const payload = JSON.parse(input) as Partial<LoreMemoryExport>;
  if (payload.format !== "lore-memory-export" || !Array.isArray(payload.memories)) {
    throw new Error("invalid Lore memory export");
  }

  return payload.memories.map((record) => {
    const createdAt = readString(record.createdAt);
    const memory = createMemoryRecord({
      id: record.id,
      content: record.content,
      memoryType: record.memoryType,
      scope: record.scope,
      projectId: record.projectId,
      agentId: record.agentId,
      sourceProvider: record.sourceProvider,
      sourceOriginalId: record.sourceOriginalId,
      sourceRefs: record.sourceRefs,
      confidence: record.confidence,
      riskTags: record.riskTags,
      now: createdAt ? new Date(createdAt) : undefined
    });

    const imported: MemoryRecord = {
      ...memory,
      organizationId: readString(record.organizationId),
      userId: readString(record.userId),
      repoId: readString(record.repoId),
      visibility: normalizeVisibility(record.visibility, memory.visibility),
      status: normalizeStatus(record.status, memory.status),
      validFrom: readString(record.validFrom) ?? memory.validFrom,
      validUntil: readNullableString(record.validUntil),
      supersededBy: readNullableString(record.supersededBy),
      metadata: isRecord(record.metadata) ? record.metadata : {},
      lastUsedAt: readNullableString(record.lastUsedAt),
      useCount: readNumber(record.useCount) ?? 0,
      createdAt: readString(record.createdAt) ?? memory.createdAt,
      updatedAt: readString(record.updatedAt) ?? memory.updatedAt
    };
    return imported;
  });
}

export function exportLoreMarkdown(memories: MemoryRecord[], exportedAt = new Date()): string {
  const header = [
    "---",
    "format: lore-memory-export",
    "version: 0.1",
    `exported_at: ${exportedAt.toISOString()}`,
    "---",
    "",
    "# Lore Memory Export"
  ];

  const body = memories.flatMap((memory) => [
    "",
    `## ${memory.id}`,
    "",
    `Type: ${memory.memoryType}`,
    `Scope: ${memory.scope}`,
    `Status: ${memory.status}`,
    `Confidence: ${memory.confidence}`,
    `Valid From: ${memory.validFrom ?? ""}`,
    `Valid Until: ${memory.validUntil ?? ""}`,
    `Superseded By: ${memory.supersededBy ?? ""}`,
    `Source Provider: ${memory.sourceProvider ?? "manual"}`,
    `Source Original ID: ${memory.sourceOriginalId ?? ""}`,
    `Risk Tags: ${memory.riskTags.join(", ")}`,
    "",
    memory.content
  ]);

  return [...header, ...body, ""].join("\n");
}

export function importSimpleMarkdown(input: string): MemoryRecord[] {
  const sections = input.split(/\n## /).slice(1);

  return sections
    .map((section): MemoryRecord | undefined => {
      const [rawId, ...lines] = section.split("\n");
      const fields = parseMarkdownFields(lines);
      const content = lines
        .filter((line) => !/^(Type|Scope|Status|Confidence|Valid From|Valid Until|Superseded By|Source Provider|Source Original ID|Risk Tags):/.test(line))
        .join("\n")
        .trim();

      if (!content) {
        return undefined;
      }

      const memory = createMemoryRecord({
        id: rawId.trim(),
        content,
        memoryType: normalizeMemoryType(fields.get("type")),
        scope: normalizeScope(fields.get("scope")),
        confidence: readNumber(Number(fields.get("confidence"))) ?? undefined,
      riskTags: parseCsv(fields.get("risk tags")),
      sourceProvider: fields.get("source provider") || "markdown_import",
      sourceOriginalId: fields.get("source original id") || undefined,
      sourceRefs: [{ type: "import", id: rawId.trim() }]
    });

      return {
        ...memory,
        status: normalizeStatus(fields.get("status"), memory.status),
        validFrom: fields.get("valid from") || memory.validFrom,
        validUntil: fields.get("valid until") || null,
        supersededBy: fields.get("superseded by") || null
      };
    })
    .filter((record): record is MemoryRecord => Boolean(record));
}

function parseMarkdownFields(lines: string[]): Map<string, string> {
  const fields = new Map<string, string>();
  lines.forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      fields.set(match[1].trim().toLowerCase(), match[2].trim());
    }
  });
  return fields;
}

function parseCsv(value: string | undefined): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function normalizeMemoryType(value: unknown): MemoryType | undefined {
  const allowed: MemoryType[] = ["preference", "project_rule", "task_state", "procedure", "entity", "episode"];
  return allowed.includes(value as MemoryType) ? (value as MemoryType) : undefined;
}

function normalizeScope(value: unknown): MemoryScope | undefined {
  const allowed: MemoryScope[] = ["user", "project", "repo", "team", "org"];
  return allowed.includes(value as MemoryScope) ? (value as MemoryScope) : undefined;
}

function normalizeStatus(value: unknown, fallback: MemoryStatus): MemoryStatus {
  const allowed: MemoryStatus[] = ["candidate", "active", "confirmed", "superseded", "expired", "deleted"];
  return allowed.includes(value as MemoryStatus) ? (value as MemoryStatus) : fallback;
}

function normalizeVisibility(value: unknown, fallback: MemoryRecord["visibility"]): MemoryRecord["visibility"] {
  const allowed: Array<MemoryRecord["visibility"]> = ["private", "project", "team", "org"];
  return allowed.includes(value as MemoryRecord["visibility"]) ? (value as MemoryRecord["visibility"]) : fallback;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
