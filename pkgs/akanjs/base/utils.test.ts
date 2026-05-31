import { describe, expect, test } from "bun:test";
import { applyFnToArrayObjects, arraiedModel, getNonArrayModel } from ".";

describe("array model utilities", () => {
  test("unwraps array-shaped model references and reports array depth", () => {
    const modelRef = { refName: "TestModel" };

    expect(getNonArrayModel(modelRef)).toEqual([modelRef, 0]);
    expect(getNonArrayModel([modelRef])).toEqual([modelRef, 1]);
    expect(getNonArrayModel([[modelRef]] as unknown as typeof modelRef)).toEqual([modelRef, 2]);
  });

  test("wraps model references by requested array depth", () => {
    const modelRef = { refName: "TestModel" };

    expect(arraiedModel(modelRef)).toBe(modelRef);
    expect(arraiedModel(modelRef, 1)).toEqual([modelRef]);
    expect(arraiedModel<unknown>(modelRef, 3)).toEqual([[[modelRef]]]);
  });

  test("applies a function to nested array leaf values while preserving shape", () => {
    const result = applyFnToArrayObjects([1, [2, 3], [[4]]] as const, (value: number) => value * 10);

    expect(result).toEqual([10, [20, 30], [[40]]]);
  });

  test("applies a function directly to non-array values", () => {
    expect(applyFnToArrayObjects("akan", (value: string) => value.toUpperCase())).toBe("AKAN");
  });
});
