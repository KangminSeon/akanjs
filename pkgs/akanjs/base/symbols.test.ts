import {
  ACTION_META,
  ENDPOINT_META,
  FIELD_META,
  FILTER_META,
  INJECT_META,
  INTERNAL_META,
  LOADER_META,
  SLICE_META,
  STATE_DERIVED_META,
  STATE_INIT_META,
  STATE_META,
} from ".";

describe("metadata symbols", () => {
  test("exports stable global symbols", () => {
    expect(Symbol.keyFor(FIELD_META)).toBe("akanjs.field");
    expect(Symbol.keyFor(SLICE_META)).toBe("akanjs.slice");
    expect(Symbol.keyFor(FILTER_META)).toBe("akanjs.filter");
    expect(Symbol.keyFor(LOADER_META)).toBe("akanjs.loader");
    expect(Symbol.keyFor(INJECT_META)).toBe("akanjs.inject");
    expect(Symbol.keyFor(ENDPOINT_META)).toBe("akanjs.endpoint");
    expect(Symbol.keyFor(INTERNAL_META)).toBe("akanjs.internal");
    expect(Symbol.keyFor(STATE_META)).toBe("akanjs.state");
    expect(Symbol.keyFor(STATE_INIT_META)).toBe("akanjs.state.init");
    expect(Symbol.keyFor(STATE_DERIVED_META)).toBe("akanjs.state.derived");
    expect(Symbol.keyFor(ACTION_META)).toBe("akanjs.action");
  });
});
