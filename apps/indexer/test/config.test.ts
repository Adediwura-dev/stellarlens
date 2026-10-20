import { afterEach, describe, expect, it, vi } from "vitest";

describe("indexer configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a recognized Stellar network", async () => {
    vi.stubEnv("SOROBAN_RPC_URL", "https://rpc.example.com");
    vi.stubEnv("STELLAR_NETWORK", "testnet");
    vi.resetModules();

    const config = await import("../src/config.js");

    expect(config.STELLAR_NETWORK).toBe("testnet");
  });

  it("fails startup with a clear error for an unknown Stellar network", async () => {
    vi.stubEnv("SOROBAN_RPC_URL", "https://rpc.example.com");
    vi.stubEnv("STELLAR_NETWORK", "testnetwork");
    vi.resetModules();

    await expect(import("../src/config.js")).rejects.toThrow(
      'STELLAR_NETWORK must be one of: testnet, futurenet, mainnet, standalone; received "testnetwork"'
    );
  });
});
