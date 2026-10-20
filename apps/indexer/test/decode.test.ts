import { nativeToScVal } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { decodeScVal, tryDecodeScVal } from "../src/decode.js";

// An scvI128 type tag with no body, so reading the i128 parts runs off the end of the buffer.
const MALFORMED_XDR = "AAAACg==";

describe("decodeScVal", () => {
  it("decodes symbols and i128 values into JSON-safe natives", () => {
    expect(decodeScVal(nativeToScVal("fee", { type: "symbol" }).toXdr("base64"))).toBe("fee");
    expect(decodeScVal(nativeToScVal(-9741n, { type: "i128" }).toXdr("base64"))).toBe("-9741");
  });

  it("throws on a malformed payload", () => {
    expect(() => decodeScVal(MALFORMED_XDR)).toThrow();
  });
});

describe("tryDecodeScVal", () => {
  it("returns the decoded value for valid input", () => {
    const result = tryDecodeScVal(nativeToScVal(42n, { type: "i128" }).toXdr("base64"));
    expect(result).toEqual({ ok: true, value: "42" });
  });

  it("returns an error result instead of throwing for malformed input", () => {
    const result = tryDecodeScVal(MALFORMED_XDR);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/incomplete XDR data/);
  });
});
