import { describe, it, expect, beforeEach } from "vitest";
import { createCounter } from "./counter.js";

describe("Counter", () => {
  let counter: ReturnType<typeof createCounter>;

  beforeEach(() => {
    counter = createCounter(0);
  });

  it("初始值为 0", () => {
    expect(counter.value()).toBe(0);
  });

  it("increment 每次加 1", () => {
    counter.increment();
    counter.increment();
    expect(counter.value()).toBe(2);
  });

  it("decrement 每次减 1", () => {
    counter.increment();
    counter.decrement();
    expect(counter.value()).toBe(0);
  });

  it("reset 归零", () => {
    counter.increment();
    counter.increment();
    counter.reset();
    expect(counter.value()).toBe(0);
  });

  it("支持自定义初始值", () => {
    const c = createCounter(10);
    expect(c.value()).toBe(10);
  });
});
