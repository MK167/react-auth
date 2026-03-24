/**
 * @fileoverview SocketManager — singleton WebSocket lifecycle manager.
 *
 * ## Responsibilities
 *
 * 1. **Singleton** — one connection per browser tab, shared across all hooks.
 * 2. **Auto-reconnect** — exponential backoff up to `maxAttempts`.
 * 3. **Heartbeat** — client-side ping every 25 s; server is expected to pong.
 *    If no pong arrives within 10 s the connection is considered dead.
 * 4. **Offline queue** — messages sent while disconnected are queued and
 *    drained in order once the connection is restored.
 * 5. **Mock simulation** — when `apiSource === 'mock'` (or when the real WS
 *    connection fails after all retries) the manager enters simulation mode.
 *    Simulation drives the same handler/store API so all UI components are
 *    unaware of whether they're talking to a real server.
 * 6. **Error integration** — connection failures push to `useErrorStore`
 *    (TOAST for transient, PAGE for unrecoverable auth errors).
 * 7. **Zero GlobalLoader** — WebSocket activity never touches the Axios
 *    loading semaphore (`useUiStore.activeApiRequestsCount`).
 *
 * ## Usage
 *
 * ```ts
 * import { socketManager } from '@/features/realtime/socket/socket.manager';
 *
 * // In AdminLayout / RealtimeProvider:
 * socketManager.connect(wsUrl);   // on mount
 * socketManager.disconnect();     // on unmount
 *
 * // In components (via useAdminSocket hook):
 * socketManager.subscribe('chat:message', handler);
 * socketManager.send({ type: 'chat:message', payload: {...}, roomId: 'general' });
 * ```
 *
 * @module features/realtime/socket/socket.manager
 */

import { environment } from '@/environments/environment';
import { cookieService } from '@/utils/cookie.service';
import { useErrorStore } from '@/core/errors/error.store';
import { useRealtimeStore } from '@/features/realtime/store/realtime.store';
import type {
  ChatMessage,
  EventHandler,
  NotificationPayload,
  OutboundSocketMessage,
  PresenceUser,
  ReconnectConfig,
  SocketConnectionStatus,
  SocketEvent,
  SocketEventType,
  TypingIndicator,
} from '../types/socket.types';

// ---------------------------------------------------------------------------
// Mock data — used in simulation mode only
// ---------------------------------------------------------------------------

const MOCK_USERS: Array<{ id: string; name: string; initials: string; role: string }> = [
  { id: 'bot-1', name: 'Alice Chen',    initials: 'AC', role: 'MANAGER' },
  { id: 'bot-2', name: 'Bob Martinez',  initials: 'BM', role: 'ADMIN'   },
  { id: 'bot-3', name: 'Sara Ahmed',    initials: 'SA', role: 'MANAGER' },
];

const MOCK_MESSAGES: string[] = [
  'Hey team, just pushed the new product import feature 🚀',
  'The dashboard looks great. Nice work on the charts!',
  'Anyone seen the order volume spike this morning?',
  'Running the daily sync now — should be done in 5 min.',
  'Quick heads up: the payment gateway is being upgraded tonight at 2am.',
  'New bulk-upload template is in the shared drive.',
  'Can someone review PR #142? It unblocks the categories refactor.',
  'Inventory low alert: "Wireless Headphones Pro" — only 3 units left.',
  'Just onboarded 2 new vendors. Their products need approval.',
  'Server response time is back to normal after the cache flush.',
];

const MOCK_NOTIFICATIONS: Array<{ title: string; body: string; type: NotificationPayload['type'] }> = [
  { title: 'New Order',        body: 'Order #8821 placed — $248.00',            type: 'success' },
  { title: 'Low Stock Alert',  body: '"Smart Watch Elite" has 2 units left',    type: 'warning' },
  { title: 'System Update',    body: 'Scheduled maintenance in 2 hours',        type: 'info'    },
  { title: 'Payment Failed',   body: 'Order #8815 payment declined',            type: 'error'   },
  { title: 'New Vendor',       body: 'TechGear Inc. completed registration',    type: 'info'    },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// SocketManager class
// ---------------------------------------------------------------------------

const RECONNECT_CONFIG: ReconnectConfig = {
  maxAttempts: 5,
  baseDelay:   1_000,
  maxDelay:    30_000,
  factor:      2,
};

const HEARTBEAT_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS       = 10_000;

class SocketManager {
  private static instance: SocketManager | null = null;

  private ws:               WebSocket | null = null;
  private status:           SocketConnectionStatus = 'idle';
  private reconnectAttempts = 0;
  private reconnectTimer:   ReturnType<typeof setTimeout>  | null = null;
  private heartbeatTimer:   ReturnType<typeof setInterval> | null = null;
  private pongTimer:        ReturnType<typeof setTimeout>  | null = null;
  private offlineQueue:     OutboundSocketMessage[] = [];
  private url =             '';

  /** Per-event-type handler registry. */
  private handlers = new Map<SocketEventType, Set<EventHandler<unknown>>>();

  // Mock simulation state
  private mockTimers: ReturnType<typeof setTimeout>[] = [];
  private isMockMode = false;

  // ── Singleton ─────────────────────────────────────────────────────────────

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  private constructor() { /* private — use getInstance() */ }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Start connection. Call once from RealtimeProvider on admin mount. */
  connect(url: string): void {
    if (this.status === 'connected' || this.status === 'connecting') return;
    this.url = url;

    if (environment.apiSource === 'mock') {
      this.startMockMode();
      return;
    }

    this.openWebSocket();
  }

  /** Tear down connection. Call from RealtimeProvider on admin unmount. */
  disconnect(): void {
    this.clearTimers();
    this.isMockMode = false;
    this.reconnectAttempts = 0;
    this.offlineQueue = [];

    if (this.ws) {
      this.ws.onclose = null; // prevent auto-reconnect on intentional close
      this.ws.close(1000, 'Admin module unmounted');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /** Send a message. Queues it if currently offline. */
  send(message: OutboundSocketMessage): void {
    if (this.isMockMode) {
      this.handleMockEcho(message);
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.offlineQueue.push(message);
    }
  }

  /** Register a typed event handler. */
  subscribe<T>(type: SocketEventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler<unknown>);
  }

  /** Remove a previously registered handler. */
  unsubscribe(type: SocketEventType, handler: EventHandler<unknown>): void {
    this.handlers.get(type)?.delete(handler);
  }

  getStatus(): SocketConnectionStatus {
    return this.status;
  }

  // ── Real WebSocket lifecycle ───────────────────────────────────────────────

  private openWebSocket(): void {
    this.setStatus('connecting');

    const token = cookieService.getToken();
    const urlWithAuth = token ? `${this.url}?token=${token}` : this.url;

    try {
      this.ws = new WebSocket(urlWithAuth);
    } catch {
      this.handleConnectionError('open_failed');
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();
      this.drainQueue();
      this.emit({ type: 'system:auth', payload: { token: cookieService.getToken() }, timestamp: Date.now() });
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      this.handleRawMessage(event.data);
    };

    this.ws.onerror = () => {
      // onerror always fires before onclose — we handle cleanup in onclose
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.stopHeartbeat();

      if (event.code === 4001) {
        // Custom auth failure code — unrecoverable
        useErrorStore.getState().pushError('SESSION_EXPIRED', { displayModeOverride: 'PAGE' });
        this.setStatus('error');
        return;
      }

      if (event.code !== 1000) {
        // Abnormal close — attempt reconnect
        this.handleConnectionError('closed_abnormally');
      } else {
        this.setStatus('disconnected');
      }
    };
  }

  private handleRawMessage(raw: string): void {
    let event: SocketEvent;
    try {
      event = JSON.parse(raw) as SocketEvent;
    } catch {
      return; // ignore malformed frames
    }

    if (event.type === 'system:pong') {
      // Clear the pong timeout — server is alive
      if (this.pongTimer) {
        clearTimeout(this.pongTimer);
        this.pongTimer = null;
      }
      return;
    }

    this.dispatchToHandlers(event);
    this.routeEventToStore(event);
  }

  private handleConnectionError(reason: string): void {
    console.warn(`[SocketManager] Connection error: ${reason}`);
    this.ws = null;

    if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
      useErrorStore.getState().pushError('NETWORK_ERROR', {
        displayModeOverride: 'TOAST',
        onRetry: () => {
          this.reconnectAttempts = 0;
          this.openWebSocket();
        },
      });
      // Fall back to mock mode so the UI stays functional
      this.startMockMode();
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting');
    const delay = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.factor, this.reconnectAttempts),
      RECONNECT_CONFIG.maxDelay,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => this.openWebSocket(), delay);
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      this.ws.send(JSON.stringify({ type: 'system:ping', payload: {}, timestamp: Date.now() }));

      // If no pong arrives within PONG_TIMEOUT_MS, assume the connection is dead
      this.pongTimer = setTimeout(() => {
        this.ws?.close();
      }, PONG_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.pongTimer)      { clearTimeout(this.pongTimer);       this.pongTimer = null;      }
  }

  // ── Offline queue ─────────────────────────────────────────────────────────

  private drainQueue(): void {
    while (this.offlineQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.offlineQueue.shift()!;
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ── Event dispatch ────────────────────────────────────────────────────────

  private dispatchToHandlers(event: SocketEvent): void {
    this.handlers.get(event.type)?.forEach((h) => {
      try { h(event); } catch { /* handler errors must not crash the manager */ }
    });
  }

  /**
   * Routes parsed server events into the Zustand realtime store.
   * This keeps stores up-to-date even when no component has subscribed to an
   * event type (e.g. notification badge count updates while on the chat page).
   */
  private routeEventToStore(event: SocketEvent): void {
    const store = useRealtimeStore.getState();

    switch (event.type) {
      case 'chat:message':
        store.addMessage((event as SocketEvent<ChatMessage>).payload);
        break;
      case 'chat:typing_start':
        store.setTyping((event as SocketEvent<TypingIndicator>).payload);
        break;
      case 'chat:typing_stop':
        store.clearTyping(event.payload as { userId: string; roomId: string });
        break;
      case 'presence:join':
        store.addOnlineUser((event as SocketEvent<PresenceUser>).payload);
        break;
      case 'presence:leave':
        store.removeOnlineUser((event.payload as { userId: string }).userId);
        break;
      case 'notification:new':
        store.pushNotification((event as SocketEvent<NotificationPayload>).payload);
        break;
      default:
        break;
    }

    store.setLastServerTimestamp(event.timestamp);
  }

  private emit(event: SocketEvent): void {
    this.dispatchToHandlers(event);
    this.routeEventToStore(event);
  }

  // ── Mock simulation ───────────────────────────────────────────────────────

  /**
   * Simulates a live WebSocket server using local timers.
   * Produces the exact same events as a real server would, driving the same
   * store updates and handler calls. Components can't tell the difference.
   */
  private startMockMode(): void {
    this.isMockMode = true;
    this.setStatus('connecting');

    // Simulate connection handshake delay
    const connectTimer = setTimeout(() => {
      this.setStatus('connected');

      // Seed initial presence
      MOCK_USERS.forEach((u, i) => {
        const t = setTimeout(() => {
          this.emitMock('presence:join', {
            userId: u.id, userName: u.name, role: u.role, joinedAt: Date.now(),
          } satisfies PresenceUser);
        }, i * 400);
        this.mockTimers.push(t);
      });

      this.scheduleMockMessages();
      this.scheduleMockNotifications();
    }, 800);

    this.mockTimers.push(connectTimer);
  }

  private stopMockMode(): void {
    this.mockTimers.forEach(clearTimeout);
    this.mockTimers = [];
  }

  private scheduleMockMessages(): void {
    const schedule = () => {
      const delay = randomInt(4_000, 10_000);
      const t = setTimeout(() => {
        if (!this.isMockMode) return;

        const user    = randomFrom(MOCK_USERS);
        const rooms   = useRealtimeStore.getState().rooms;
        const roomIds = Object.keys(rooms);
        if (roomIds.length === 0) { schedule(); return; }

        const roomId  = randomFrom(roomIds);

        // Fire typing indicator first
        this.emitMock('chat:typing_start', { userId: user.id, userName: user.name, roomId } satisfies TypingIndicator);

        const typingStop = setTimeout(() => {
          if (!this.isMockMode) return;
          this.emitMock('chat:typing_stop', { userId: user.id, roomId });

          const msgTimer = setTimeout(() => {
            if (!this.isMockMode) return;
            this.emitMock('chat:message', {
              id:             crypto.randomUUID(),
              roomId,
              senderId:       user.id,
              senderName:     user.name,
              senderInitials: user.initials,
              text:           randomFrom(MOCK_MESSAGES),
              timestamp:      Date.now(),
              status:         'sent',
            } satisfies ChatMessage);
          }, 500);
          this.mockTimers.push(msgTimer);
        }, randomInt(1_500, 3_000));

        this.mockTimers.push(typingStop);
        schedule(); // schedule next
      }, delay);
      this.mockTimers.push(t);
    };
    schedule();
  }

  private scheduleMockNotifications(): void {
    const schedule = () => {
      const delay = randomInt(15_000, 35_000);
      const t = setTimeout(() => {
        if (!this.isMockMode) return;
        const n = randomFrom(MOCK_NOTIFICATIONS);
        this.emitMock('notification:new', {
          id:        crypto.randomUUID(),
          title:     n.title,
          body:      n.body,
          type:      n.type,
          timestamp: Date.now(),
          read:      false,
        } satisfies NotificationPayload);
        schedule();
      }, delay);
      this.mockTimers.push(t);
    };
    schedule();
  }

  private emitMock<T>(type: SocketEventType, payload: T): void {
    const event: SocketEvent<T> = { type, payload, timestamp: Date.now() };
    this.dispatchToHandlers(event as SocketEvent<unknown>);
    this.routeEventToStore(event as SocketEvent<unknown>);
  }

  /**
   * Echo outbound messages back into the store so optimistic messages can be
   * "confirmed" immediately in mock mode (simulates server acknowledgement).
   */
  private handleMockEcho(message: OutboundSocketMessage): void {
    if (message.type === 'chat:message') {
      // Mark optimistic message as sent after a short delay
      const payload = message.payload as ChatMessage;
      const t = setTimeout(() => {
        useRealtimeStore.getState().updateMessageStatus(payload.id, 'sent');
      }, randomInt(300, 800));
      this.mockTimers.push(t);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private setStatus(status: SocketConnectionStatus): void {
    this.status = status;
    useRealtimeStore.getState().setConnectionStatus(status);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer);  this.reconnectTimer = null; }
    this.stopHeartbeat();
    this.stopMockMode();
  }
}

// ---------------------------------------------------------------------------
// Export singleton
// ---------------------------------------------------------------------------

/** Pre-created singleton. Import this everywhere — do NOT call `new SocketManager()`. */
export const socketManager = SocketManager.getInstance();
