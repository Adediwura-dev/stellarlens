import { nativeToScVal } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { decodeScVal } from "../src/decode.js";

function encode(value: unknown, type?: "symbol" | "string" | "i128"): string {
  return nativeToScVal(value, type ? { type } : undefined).toXdr("base64");
}

describe("decodeScVal", () => {
  it("decodes symbol and string values", () => {
    expect(decodeScVal(encode("transfer", "symbol"))).toBe("transfer");
    expect(decodeScVal(encode("hello", "string"))).toBe("hello");
  });

  it("converts i128 bigint values to strings", () => {
    const decoded = decodeScVal(encode(12345678901234567890n, "i128"));

    expect(decoded).toBe("12345678901234567890");
    expect(typeof decoded).toBe("string");
  });

  it("decodes vectors", () => {
    expect(decodeScVal(encode(["first", "second"]))).toEqual(["first", "second"]);
  });

  it("decodes maps", () => {
    expect(decodeScVal(encode({ key: "value" }))).toEqual({ key: "value" });
  });
});
