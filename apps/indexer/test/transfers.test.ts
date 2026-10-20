import { describe, expect, it } from "vitest";
import { detectTransfer } from "../src/transfers.js";

describe("detectTransfer", () => {
  it("detects a plain transfer", () => {
    expect(detectTransfer(["transfer", "GFROM", "GTO"], "250")).toEqual({
      from: "GFROM",
      to: "GTO",
      amount: "250"
    });
  });

  it("detects a muxed transfer", () => {
    expect(detectTransfer(["transfer", "GFROM", "GTO"], { amount: "500", to_muxed_id: "42" })).toEqual({
      from: "GFROM",
      to: "GTO",
      amount: "500"
    });
  });

  it("rejects a different topic name", () => {
    expect(detectTransfer(["mint", "GFROM", "GTO"], "250")).toBeUndefined();
  });

  it("rejects topics with too few elements", () => {
    expect(detectTransfer(["transfer", "GFROM"], "250")).toBeUndefined();
  });

  it("rejects non-string from and to values", () => {
    expect(detectTransfer(["transfer", 42, "GTO"], "250")).toBeUndefined();
    expect(detectTransfer(["transfer", "GFROM", null], "250")).toBeUndefined();
  });

  it("rejects a transfer value without a string amount", () => {
    expect(detectTransfer(["transfer", "GFROM", "GTO"], { amount: 250 })).toBeUndefined();
  });
});
