import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { indexRepository } from "../src/index.js";

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/basic-ts");

describe("indexRepository", () => {
  it("extracts deterministic files, symbols, imports, calls, routes, tests, and processes from a TS fixture", async () => {
    const artifact = await indexRepository({ rootDir: fixtureRoot, projectId: "project-fixture", repoId: "repo-fixture", commitSha: "abc123" });

    expect(artifact.files.map((file) => file.path)).toEqual(["src/math.ts", "src/routes.ts", "tests/math.test.ts"]);
    expect(artifact.indexRun).toMatchObject({
      projectId: "project-fixture",
      repoId: "repo-fixture",
      status: "succeeded",
      fileCount: 3,
      commitSha: "abc123"
    });

    expect(artifact.symbols.map((symbol) => [symbol.kind, symbol.name, symbol.filePath])).toEqual(
      expect.arrayContaining([
        ["function", "add", "src/math.ts"],
        ["function", "multiply", "src/math.ts"],
        ["class", "Calculator", "src/math.ts"],
        ["method", "Calculator.total", "src/math.ts"],
        ["interface", "MiniApp", "src/routes.ts"],
        ["function", "sumHandler", "src/routes.ts"],
        ["function", "registerRoutes", "src/routes.ts"],
        ["function", "GET /sum", "src/routes.ts"],
        ["function", "add returns a total", "tests/math.test.ts"],
        ["function", "calculator totals values", "tests/math.test.ts"]
      ])
    );

    expect(artifact.symbols.find((symbol) => symbol.name === "GET /sum")?.metadata).toMatchObject({ repoGraphKind: "route" });
    expect(artifact.symbols.find((symbol) => symbol.name === "add returns a total")?.metadata).toMatchObject({ repoGraphKind: "test" });
    expect(new Set(artifact.symbols.map((symbol) => symbol.kind))).toEqual(new Set(["module", "function", "class", "method", "interface"]));

    expect(artifact.relations.map((relation) => relation.relationType)).toEqual(
      expect.arrayContaining(["references", "imports", "calls"])
    );
    expect(new Set(artifact.relations.map((relation) => relation.relationType))).toEqual(new Set(["references", "imports", "calls"]));

    const imports = artifact.relations.filter((relation) => relation.relationType === "imports");
    expect(imports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFileId: expect.stringContaining("src/routes.ts"),
          targetFileId: expect.stringContaining("src/math.ts"),
          metadata: expect.objectContaining({ moduleSpecifier: "./math" })
        }),
        expect.objectContaining({
          sourceFileId: expect.stringContaining("tests/math.test.ts"),
          targetFileId: expect.stringContaining("src/math.ts"),
          metadata: expect.objectContaining({ moduleSpecifier: "../src/math" })
        })
      ])
    );

    const callTargets = new Set(
      artifact.relations
        .filter((relation) => relation.relationType === "calls")
        .map((relation) => artifact.symbols.find((symbol) => symbol.id === relation.targetSymbolId)?.name)
    );
    expect([...callTargets]).toEqual(expect.arrayContaining(["add", "Calculator.total"]));

    const routeRelation = artifact.relations.find((relation) => relation.metadata.repoRelationKind === "handles_route");
    expect(routeRelation?.metadata).toMatchObject({ method: "GET", path: "/sum", handlerName: "sumHandler" });

    const testedTargets = artifact.relations
      .filter((relation) => relation.metadata.repoRelationKind === "tests")
      .map((relation) => artifact.symbols.find((symbol) => symbol.id === relation.targetSymbolId)?.name);
    expect(testedTargets).toEqual(expect.arrayContaining(["add", "Calculator"]));

    expect(artifact.processes.map((process) => process.processType)).toEqual(expect.arrayContaining(["route_flow", "test_flow"]));
  });

  it("is deterministic for unchanged fixture input", async () => {
    const first = await indexRepository({ rootDir: fixtureRoot, projectId: "project-fixture", repoId: "repo-fixture" });
    const second = await indexRepository({ rootDir: fixtureRoot, projectId: "project-fixture", repoId: "repo-fixture" });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
