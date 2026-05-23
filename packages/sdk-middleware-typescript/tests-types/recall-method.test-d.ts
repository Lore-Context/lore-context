/**
 * S10 type-level assertion: `recallMethod` accepts "facts" only in v0.1.0.
 * Passing "reflect" (or any other string) must NOT typecheck without an `as any` cast.
 *
 * This file is loaded by `tsconfig.types-test.json` and runs under
 * `pnpm typecheck:types`. The @ts-expect-error directives MUST be satisfied
 * (i.e. the line below them must actually be a type error). If TypeScript
 * widens recallMethod to accept "reflect", the @ts-expect-error directive
 * itself becomes an error ("unused expect-error"), failing the typecheck.
 */
import type { MiddlewareOptions, RecallMethod } from "../src/types.js";

// "facts" is the only allowed value in v0.1.0
const allowed: RecallMethod = "facts";
void allowed;

// "reflect" must fail — see plan §10 carry-forward (lands in v2.1)
// @ts-expect-error — "reflect" is intentionally NOT in the v0.1.0 union
const reflectAttempt: RecallMethod = "reflect";
void reflectAttempt;

// MiddlewareOptions.recallMethod is also narrowed
const goodOptions: MiddlewareOptions = { recallMethod: "facts" };
void goodOptions;

// @ts-expect-error — same narrowing applied at MiddlewareOptions level
const badOptions: MiddlewareOptions = { recallMethod: "reflect" };
void badOptions;

// Double-cast escape hatch (intentional — used in S10 acceptance test fixture).
// Single-cast `"reflect" as RecallMethod` is rejected by TS because narrowed
// union has no overlap; double-cast through `unknown` opens the door.
const cast: RecallMethod = "reflect" as unknown as RecallMethod;
void cast;
