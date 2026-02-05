import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
    length: 0,
    key: () => null,
  },
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { register, login, logout, getMe } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  for (const k in store) delete store[k];
});

describe("auth module", () => {
  it("register calls /auth/register and stores tokens", async () => {
    // First call: register
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "acc",
          refresh_token: "ref",
          token_type: "bearer",
          expires_in: 3600,
        }),
    });
    // Second call: getMe
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "user-1",
          email: "test@test.com",
          full_name: "Test",
          created_at: "2024-01-01",
        }),
    });

    const user = await register("test@test.com", "password123", "Test");
    expect(user.email).toBe("test@test.com");
    expect(store["intervue_access_token"]).toBe("acc");
    expect(store["intervue_refresh_token"]).toBe("ref");
  });

  it("login calls /auth/login and stores tokens", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "acc2",
          refresh_token: "ref2",
          token_type: "bearer",
          expires_in: 3600,
        }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "user-2",
          email: "login@test.com",
          full_name: null,
          created_at: "2024-01-01",
        }),
    });

    const user = await login("login@test.com", "password");
    expect(user.email).toBe("login@test.com");
    expect(store["intervue_access_token"]).toBe("acc2");
  });

  it("logout clears tokens", async () => {
    store["intervue_access_token"] = "old";
    store["intervue_refresh_token"] = "old-ref";

    await logout();

    expect(store["intervue_access_token"]).toBeUndefined();
    expect(store["intervue_refresh_token"]).toBeUndefined();
  });

  it("getMe calls /auth/me", async () => {
    store["intervue_access_token"] = "valid-token";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "user-3",
          email: "me@test.com",
          full_name: "Me",
          created_at: "2024-01-01",
        }),
    });

    const user = await getMe();
    expect(user.email).toBe("me@test.com");
    // Verify the fetch was called with /auth/me
    expect(mockFetch.mock.calls[0][0]).toContain("/auth/me");
  });
});
