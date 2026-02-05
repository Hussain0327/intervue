import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;

  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-fire onopen in next tick
    setTimeout(() => {
      this.onopen?.();
    }, 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  // Test helper to simulate incoming message
  simulateMessage(data: object) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

// Assign to global
Object.defineProperty(globalThis, "WebSocket", { value: MockWebSocket, writable: true });

// Also mock localStorage for getAccessToken
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    length: 0,
    key: () => null,
  },
});

import { WSClient } from "@/lib/wsClient";

let mockWs: MockWebSocket;

beforeEach(() => {
  vi.useFakeTimers();
  for (const k in store) delete store[k];
});

describe("WSClient", () => {
  it("connect opens WebSocket", () => {
    const client = new WSClient({ url: "ws://test/ws/interview/123" });
    client.connect();
    // @ts-ignore
    expect(client["ws"]).toBeTruthy();
  });

  it("token is appended to URL by createWSClient", async () => {
    // Test the URL construction logic
    store["intervue_access_token"] = "my-jwt-token";
    const { createWSClient } = await import("@/lib/wsClient");
    const client = createWSClient("test-session", {});
    // @ts-ignore access private field
    const url = client["options"].url;
    expect(url).toContain("token=my-jwt-token");
  });

  it("dispatches status messages to onStatusChange", () => {
    const handler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onStatusChange: handler,
    });
    client.connect();
    // @ts-ignore
    const ws: MockWebSocket = client["ws"];
    ws.simulateMessage({ type: "status", state: "ready" });
    expect(handler).toHaveBeenCalledWith("ready");
  });

  it("dispatches transcript messages to onTranscript", () => {
    const handler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onTranscript: handler,
    });
    client.connect();
    // @ts-ignore
    const ws: MockWebSocket = client["ws"];
    ws.simulateMessage({ type: "transcript", role: "candidate", text: "hello", sequence: 1 });
    expect(handler).toHaveBeenCalledWith("candidate", "hello", 1);
  });

  it("ignores unknown message types", () => {
    const errorHandler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onError: errorHandler,
    });
    client.connect();
    // @ts-ignore
    const ws: MockWebSocket = client["ws"];
    // This message has an unknown type — should be silently ignored
    ws.simulateMessage({ type: "nonexistent_type" });
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it("attempts reconnect on close", () => {
    const connHandler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onConnectionChange: connHandler,
    });
    client.connect();
    // @ts-ignore
    const ws: MockWebSocket = client["ws"];
    ws.simulateClose();

    // Advance timers for reconnect delay
    vi.advanceTimersByTime(5000);
    // Should have attempted reconnect
    expect(connHandler).toHaveBeenCalledWith(false);
  });

  it("fires error after max reconnect attempts", () => {
    const errorHandler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onError: errorHandler,
    });
    client.connect();

    // Manually increment reconnectAttempts past the max (8)
    // @ts-ignore - access private field for testing
    client["reconnectAttempts"] = 8;
    // @ts-ignore
    client["intentionalDisconnect"] = false;

    // Now call attemptReconnect which should fire MAX_RECONNECT
    // @ts-ignore - access private method
    client["attemptReconnect"]();

    expect(errorHandler).toHaveBeenCalledWith(
      "MAX_RECONNECT",
      expect.any(String),
      false
    );
  });

  it("intentional disconnect prevents reconnect", () => {
    const connHandler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onConnectionChange: connHandler,
    });
    client.connect();
    client.disconnect();

    vi.advanceTimersByTime(10000);
    // Only 2 calls: true (connect) + false (disconnect) — no more from reconnect
    const falseCalls = connHandler.mock.calls.filter(
      (c: boolean[]) => c[0] === false
    );
    // Should not have attempted reconnect after intentional disconnect
    expect(falseCalls.length).toBeLessThanOrEqual(1);
  });

  it("send methods require open connection", () => {
    const errorHandler = vi.fn();
    const client = new WSClient({
      url: "ws://test/ws",
      onError: errorHandler,
    });
    // Don't connect — ws is null
    client.sendAudio("data");
    expect(errorHandler).toHaveBeenCalledWith(
      "NOT_CONNECTED",
      expect.any(String),
      true
    );
  });
});
