import { describe, expect, test } from "vitest";
import { add, Calculator } from "../src/math";

describe("math", () => {
  test("add returns a total", () => {
    expect(add(1, 2)).toBe(3);
  });

  test("calculator totals values", () => {
    expect(new Calculator().total([1, 2, 3])).toBe(6);
  });
});
