import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    store[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const k in store) delete store[k];
  }),
  length: 0,
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Now import the module under test
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  apiFetch,
} from "@/lib/apiClient";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

describe("Token CRUD", () => {
  it("getAccessToken returns null when no token stored", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("setTokens stores both tokens", () => {
    setTokens("access-123", "refresh-456");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "intervue_access_token",
      "access-123"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "intervue_refresh_token",
      "refresh-456"
    );
  });

  it("clearTokens removes both tokens", () => {
    setTokens("a", "r");
    clearTokens();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "intervue_access_token"
    );
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "intervue_refresh_token"
    );
  });
});

describe("apiFetch", () => {
  it("adds Authorization header when token exists", async () => {
    store["intervue_access_token"] = "my-token";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });

    await apiFetch("/test");

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders["Authorization"]).toBe("Bearer my-token");
  });

  it("does not add auth header without token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test");

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders["Authorization"]).toBeUndefined();
  });

  it("auto-refreshes on 401 response", async () => {
    store["intervue_access_token"] = "expired-token";
    store["intervue_refresh_token"] = "refresh-token";

    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "new-access",
          refresh_token: "new-refresh",
        }),
    });

    // Retry succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "success" }),
    });

    const result = await apiFetch("/test");
    expect(result).toEqual({ data: "success" });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("clears tokens on refresh failure", async () => {
    store["intervue_access_token"] = "expired";
    store["intervue_refresh_token"] = "bad-refresh";

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    await expect(apiFetch("/test")).rejects.toThrow();
    expect(localStorageMock.removeItem).toHaveBeenCalled();
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: "Server error" }),
    });

    await expect(apiFetch("/test")).rejects.toThrow("Server error");
  });
});
