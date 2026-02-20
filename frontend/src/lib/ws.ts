import type { WSServerMessage } from '../types'

export type WSMessageHandler = (msg: WSServerMessage) => void
export type WSBinaryHandler = (data: ArrayBuffer) => void

const MAX_RECONNECT_DELAY = 15_000
const BASE_RECONNECT_DELAY = 1_000

export class InterviewWebSocket {
  private ws: WebSocket | null = null
  private onMessage: WSMessageHandler
  private onBinary: WSBinaryHandler
  private onDisconnect: () => void
  private sessionId: string | null = null
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private pendingJSON: Record<string, unknown>[] = []

  constructor(
    onMessage: WSMessageHandler,
    onBinary: WSBinaryHandler,
    onDisconnect: () => void,
  ) {
    this.onMessage = onMessage
    this.onBinary = onBinary
    this.onDisconnect = onDisconnect
  }

  connect(sessionId: string): void {
    this.sessionId = sessionId
    this.closed = false
    this._connect()
  }

  private _connect(): void {
    if (this.closed || !this.sessionId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}//${host}/ws/interview/${this.sessionId}`)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      // Flush any queued messages
      for (const msg of this.pendingJSON) {
        this.ws?.send(JSON.stringify(msg))
      }
      this.pendingJSON = []
    }

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data) as WSServerMessage
          this.onMessage(msg)
        } catch (e) {
          console.error('Failed to parse WS message:', e)
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.onBinary(event.data)
      }
    }

    this.ws.onclose = () => {
      this.onDisconnect()
      this._scheduleReconnect()
    }

    this.ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }
  }

  private _scheduleReconnect(): void {
    if (this.closed) return

    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY,
    )
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this._connect()
    }, delay)
  }

  sendJSON(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.pendingJSON.push(data)
    }
  }

  sendBinary(data: ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }

  close(): void {
    this.closed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.pendingJSON = []
    this.ws?.close()
    this.ws = null
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
