import { get } from './http';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws';

type Callback = (data: unknown) => void;

class WSManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<Callback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20; // after 20 failures (~5min total) give up until user action

  connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

    this.isConnecting = true;
    // Fetch short-lived WS token via cookie-authed API call
    this.getWSToken().then((token) => {
      const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
      this.ws = new WebSocket(url);
      this.setupHandlers();
    }).catch(() => {
      this.ws = new WebSocket(WS_URL);
      this.setupHandlers();
    });
  }

  private async getWSToken(): Promise<string | null> {
    // Routed through axios so 401 → refresh → retry stays consistent with the
    // rest of the app. Returns null on any failure; caller falls back to no-token.
    const res = await get<{ token: string }>('/auth/ws-token');
    return res.success && res.data?.token ? res.data.token : null;
  }

  private setupHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectDelay = 1000;
      this.reconnectAttempts = 0;
      // Re-subscribe to all channels on reconnect
      this.subscribers.forEach((_, channel) => {
        this.ws?.send(JSON.stringify({ action: 'subscribe', channel }));
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { channel: string; data: unknown };
        const subs = this.subscribers.get(msg.channel);
        if (subs) {
          subs.forEach((cb) => cb(msg.data));
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.reconnect();
    };

    this.ws.onerror = () => {
      this.isConnecting = false;
      this.ws?.close();
    };
  }

  subscribe(channel: string, callback: Callback): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', channel }));
    } else {
      this.connect();
    }
  }

  unsubscribe(channel: string, callback: Callback): void {
    const subs = this.subscribers.get(channel);
    if (!subs) return;
    subs.delete(callback);
    if (subs.size === 0) {
      this.subscribers.delete(channel);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'unsubscribe', channel }));
      }
    }
  }

  private reconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      // Stop reconnecting — server is likely down for a while
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  resetReconnect(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect();
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.subscribers.clear();
  }
}

export const wsManager = new WSManager();
