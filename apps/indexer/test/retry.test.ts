import { afterEach, describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/retry.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("withRetry", () => {
  it("gives up after maxRetries attempts and rethrows the last error", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const firstError = new Error("first failure");
    const lastError = new Error("last failure");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(new Error("second failure"))
      .mockRejectedValue(lastError);

    const result = withRetry("test", fn, { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 100 });
    const rejection = expect(result).rejects.toBe(lastError);
    await vi.runAllTimersAsync();

    await rejection;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("returns the result when a later attempt succeeds without further retries", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fn = vi.fn().mockRejectedValueOnce(new Error("temporary failure")).mockResolvedValue("success");

    const result = withRetry("test", fn, { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 100 });
    const resolution = expect(result).resolves.toBe("success");
    await vi.runAllTimersAsync();

    await resolution;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
