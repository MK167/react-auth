/**
 * @fileoverview SocketManager — singleton WebSocket lifecycle manager.
 *
 * ## Responsibilities
 *
 * 1. **Singleton** — one connection per browser tab, shared across all hooks.
 * 2. **Auto-reconnect** — exponential backoff + ±30% jitter (thundering-herd
 *    prevention) up to `maxAttempts`.
 * 3. **Heartbeat** — client-side ping every 25 s; server is expected to pong.
 *    If no pong arrives within 10 s the connection is considered dead.
 *    Heartbeat is **paused** while the tab is hidden (Page Visibility API)
 *    and resumed when the tab becomes visible again.
 * 4. **Offline queue** — messages sent while disconnected are queued (capped
 *    at 50) and drained in order once the connection is restored.
 *    Reconnect is **suspended** while the browser reports offline, and
 *    re-triggered immediately when the browser comes back online.
 * 5. **Mock simulation** — when `apiSource === 'mock'` (or when the real WS
 *    connection fails after all retries) the manager enters simulation mode.
 *    Simulation drives the same handler/store API so all UI components are
 *    unaware of whether they're talking to a real server.
 *    Mock timers are stored in a `Set` and self-remove after firing —
 *    no memory leak from accumulating completed timer IDs.
 * 6. **Error integration** — connection failures push to `useErrorStore`
 *    (TOAST for transient, PAGE for unrecoverable auth errors).
 * 7. **Zero GlobalLoader** — WebSocket activity never touches the Axios
 *    loading semaphore (`useUiStore.activeApiRequestsCount`).
 * 8. **Status deduplication** — `setStatus()` is a no-op when the new status
 *    equals the current one, preventing spurious Zustand re-renders.
 * 9. **Structured logging** — every significant event logs a timestamped,
 *    colour-coded line to the browser console for easy debugging.
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
// Constants
// ---------------------------------------------------------------------------

const RECONNECT_CONFIG: ReconnectConfig = {
  maxAttempts: 5,
  baseDelay:   1_000,
  maxDelay:    30_000,
  factor:      2,
};

const HEARTBEAT_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS       = 10_000;
const MAX_QUEUE_SIZE        = 50;
const MAX_MESSAGE_BYTES     = 64 * 1024; // 64 KB — drop oversized frames

// ---------------------------------------------------------------------------
// SocketManager class
// ---------------------------------------------------------------------------

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

  /**
   * Mock timer handles stored in a Set.
   * Each timer removes itself from the Set when it fires — no stale ID leak.
   */
  private mockTimers = new Set<ReturnType<typeof setTimeout>>();
  private isMockMode = false;

  // ── Singleton ─────────────────────────────────────────────────────────────

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  private constructor() { /* private — use getInstance() */ }

  // ── Structured logging ────────────────────────────────────────────────────

  private log(message: string, ...args: unknown[]): void {
    const time = new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm
    console.log(
      `%c[Socket ${time}] ${message}`,
      'color:#4f9cf9;font-weight:bold',
      ...args,
    );
  }

  private warn(message: string, ...args: unknown[]): void {
    const time = new Date().toISOString().slice(11, 23);
    console.warn(`[Socket ${time}] ⚠ ${message}`, ...args);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Start connection. Call once from RealtimeProvider on admin mount. */
  connect(url: string): void {
    if (this.status === 'connected' || this.status === 'connecting') {
      this.log(`connect() skipped — already ${this.status}`);
      return;
    }
    this.url = url;
    this.log(`connect() called  url=${url}`);

    // Register browser-level event listeners for network awareness
    window.addEventListener('online',           this.handleOnline);
    window.addEventListener('offline',          this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    if (environment.apiSource === 'mock') {
      this.startMockMode();
      return;
    }

    this.openWebSocket();
  }

  /** Tear down connection. Call from RealtimeProvider on admin unmount. */
  disconnect(): void {
    this.log('disconnect() called — intentional close');

    window.removeEventListener('online',           this.handleOnline);
    window.removeEventListener('offline',          this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.clearTimers();
    this.isMockMode        = false;
    this.reconnectAttempts = 0;
    this.offlineQueue      = [];

    if (this.ws) {
      this.ws.onclose = null; // prevent auto-reconnect on intentional close
      this.ws.close(1000, 'Admin module unmounted');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /** Send a message. Queues it (up to MAX_QUEUE_SIZE) if currently offline. */
  send(message: OutboundSocketMessage): void {
    if (this.isMockMode) {
      this.handleMockEcho(message);
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.log(`→ ${message.type}`);
    } else {
      if (this.offlineQueue.length >= MAX_QUEUE_SIZE) {
        this.warn(`offline queue full (${MAX_QUEUE_SIZE}) — dropping oldest message`);
        this.offlineQueue.shift();
      }
      this.offlineQueue.push(message);
      this.log(`message queued  (queue: ${this.offlineQueue.length}/${MAX_QUEUE_SIZE})  type=${message.type}`);
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

  // ── Browser network / visibility events ───────────────────────────────────

  /**
   * Browser came back online — reset attempt counter and reconnect immediately
   * instead of waiting for the next scheduled backoff tick.
   */
  private handleOnline = (): void => {
    this.log('browser online — triggering immediate reconnect');
    if (this.status === 'disconnected' || this.status === 'reconnecting') {
      this.reconnectAttempts = 0;
      this.openWebSocket();
    }
  };

  /**
   * Browser went offline — suspend the pending reconnect timer so we don't
   * burn through retry attempts while there is no network.
   */
  private handleOffline = (): void => {
    this.warn('browser offline — suspending reconnect timer');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  };

  /**
   * Page Visibility API — pause heartbeat when the tab is hidden to avoid
   * waking the server/client unnecessarily and to prevent false pong-timeouts
   * caused by throttled background timers in Chromium.
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.log('tab hidden — pausing heartbeat');
      this.stopHeartbeat();
    } else {
      this.log('tab visible — resuming');
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.startHeartbeat();
      } else if (this.status !== 'connecting' && this.status !== 'reconnecting') {
        this.scheduleReconnect();
      }
    }
  };

  // ── Real WebSocket lifecycle ───────────────────────────────────────────────

  private openWebSocket(): void {
    this.setStatus('connecting');

    const token      = cookieService.getToken();
    const urlWithAuth = token ? `${this.url}?token=${token}` : this.url;
    this.log(`opening WebSocket  token=${token ? 'present' : 'missing'}`);

    try {
      this.ws = new WebSocket(urlWithAuth);
    } catch {
      this.handleConnectionError('open_failed');
      return;
    }

    this.ws.onopen = () => {
      this.log('connected ✓  (reconnect attempts reset to 0)');
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();
      this.drainQueue();
      this.emit({
        type:      'system:auth',
        payload:   { token: cookieService.getToken() },
        timestamp: Date.now(),
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      // Ignore binary frames — this protocol is text-only
      if (typeof event.data !== 'string') {
        this.warn('binary frame received — ignored');
        return;
      }
      this.handleRawMessage(event.data);
    };

    this.ws.onerror = () => {
      // onerror always fires before onclose — handle cleanup there
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.log(
        `closed  code=${event.code}  reason="${event.reason || 'none'}"  wasClean=${event.wasClean}`,
      );
      this.stopHeartbeat();

      if (event.code === 4001) {
        // Custom auth failure code from the server — unrecoverable
        this.warn('auth failure (4001) — session expired, not retrying');
        useErrorStore.getState().pushError('SESSION_EXPIRED', { displayModeOverride: 'PAGE' });
        this.setStatus('error');
        return;
      }

      if (event.code !== 1000) {
        this.handleConnectionError('abnormal_close');
      } else {
        this.setStatus('disconnected');
      }
    };
  }

  private handleRawMessage(raw: string): void {
    // Guard: drop oversized frames before parsing
    if (raw.length > MAX_MESSAGE_BYTES) {
      this.warn(`oversized frame dropped  (${raw.length} B > ${MAX_MESSAGE_BYTES} B limit)`);
      return;
    }

    let event: SocketEvent;
    try {
      event = JSON.parse(raw) as SocketEvent;
    } catch {
      this.warn('malformed JSON frame — ignored');
      return;
    }

    if (event.type === 'system:pong') {
      this.log('← pong  (server alive)');
      if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
      return;
    }

    this.log(`← ${event.type}`);
    this.dispatchToHandlers(event);
    this.routeEventToStore(event);
  }

  private handleConnectionError(reason: string): void {
    this.warn(
      `connection error: ${reason}  (attempt ${this.reconnectAttempts + 1}/${RECONNECT_CONFIG.maxAttempts})`,
    );
    this.ws = null;

    if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
      this.warn('max reconnect attempts reached — falling back to mock simulation');
      useErrorStore.getState().pushError('NETWORK_ERROR', {
        displayModeOverride: 'TOAST',
        onRetry: () => {
          this.log('user triggered retry — resetting attempt counter');
          this.reconnectAttempts = 0;
          this.openWebSocket();
        },
      });
      this.startMockMode();
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting');

    const base  = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.factor, this.reconnectAttempts),
      RECONNECT_CONFIG.maxDelay,
    );
    // ±30% jitter prevents thundering-herd when multiple tabs reconnect simultaneously
    const jitter = base * 0.3 * Math.random();
    const delay  = Math.round(base + jitter);

    this.reconnectAttempts += 1;
    this.log(`reconnect ${this.reconnectAttempts}/${RECONNECT_CONFIG.maxAttempts} in ${delay} ms  (base=${base} ms, jitter=${Math.round(jitter)} ms)`);
    this.reconnectTimer = setTimeout(() => this.openWebSocket(), delay);
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat(); // guard: never double-start the interval
    this.log(`heartbeat started  (ping every ${HEARTBEAT_INTERVAL_MS / 1000}s, pong timeout ${PONG_TIMEOUT_MS / 1000}s)`);

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      this.log('→ ping');
      this.ws.send(JSON.stringify({ type: 'system:ping', payload: {}, timestamp: Date.now() }));

      // If no pong arrives within PONG_TIMEOUT_MS, treat the socket as dead
      this.pongTimer = setTimeout(() => {
        this.warn(`pong timeout after ${PONG_TIMEOUT_MS} ms — closing dead socket`);
        this.ws?.close();
      }, PONG_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.pongTimer)      { clearTimeout(this.pongTimer);       this.pongTimer      = null; }
  }

  // ── Offline queue ─────────────────────────────────────────────────────────

  private drainQueue(): void {
    if (this.offlineQueue.length === 0) return;
    this.log(`draining ${this.offlineQueue.length} queued message(s)`);
    let sent = 0;
    while (this.offlineQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.offlineQueue.shift()!;
      this.ws.send(JSON.stringify(msg));
      sent++;
    }
    this.log(`queue drained ✓  (${sent} sent, ${this.offlineQueue.length} remaining)`);
  }

  // ── Event dispatch ────────────────────────────────────────────────────────

  private dispatchToHandlers(event: SocketEvent): void {
    this.handlers.get(event.type)?.forEach((h) => {
      try { h(event); } catch { /* handler errors must not crash the manager */ }
    });
  }

  /**
   * Routes parsed server events into the Zustand realtime store.
   * This keeps stores up-to-date even when no component has subscribed to
   * an event type (e.g. notification badge count updates while on chat page).
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
   *
   * Timer IDs are kept in a `Set` and each timer removes itself from the Set
   * when it fires, preventing an ever-growing array of stale IDs.
   */
  private startMockMode(): void {
    this.isMockMode = true;
    this.log('mock mode: starting — simulating server events via local timers');
    this.setStatus('connecting');

    this.addMockTimer(800, () => {
      this.log('mock mode: connected ✓');
      this.setStatus('connected');

      // Seed initial presence with staggered arrivals
      MOCK_USERS.forEach((u, i) => {
        this.addMockTimer(i * 400, () => {
          this.log(`mock: presence:join  user=${u.name}`);
          this.emitMock('presence:join', {
            userId: u.id, userName: u.name, role: u.role, joinedAt: Date.now(),
          } satisfies PresenceUser);
        });
      });

      this.scheduleMockMessages();
      this.scheduleMockNotifications();
    });
  }

  private stopMockMode(): void {
    this.log(`mock mode: stopping  (clearing ${this.mockTimers.size} pending timer(s))`);
    this.mockTimers.forEach(clearTimeout);
    this.mockTimers.clear();
  }

  /**
   * Schedule a mock timer. The timer ID is stored in `this.mockTimers` and
   * automatically removed from the Set once the callback fires — no memory leak
   * from accumulating resolved timer IDs in the Set.
   */
  private addMockTimer(ms: number, fn: () => void): void {
    // `id` will be assigned before the callback can possibly fire
    // eslint-disable-next-line prefer-const
    let id: ReturnType<typeof setTimeout>;
    id = setTimeout(() => {
      this.mockTimers.delete(id); // self-remove — keep the Set lean
      fn();
    }, ms);
    this.mockTimers.add(id);
  }

  private scheduleMockMessages(): void {
    const schedule = () => {
      this.addMockTimer(randomInt(4_000, 10_000), () => {
        if (!this.isMockMode) return;

        const user    = randomFrom(MOCK_USERS);
        const rooms   = useRealtimeStore.getState().rooms;
        const roomIds = Object.keys(rooms);
        if (roomIds.length === 0) { schedule(); return; }
        const roomId  = randomFrom(roomIds);

        // Emit typing start → wait → typing stop → wait → message
        this.emitMock('chat:typing_start', {
          userId: user.id, userName: user.name, roomId,
        } satisfies TypingIndicator);

        this.addMockTimer(randomInt(1_500, 3_000), () => {
          if (!this.isMockMode) return;
          this.emitMock('chat:typing_stop', { userId: user.id, roomId });

          this.addMockTimer(500, () => {
            if (!this.isMockMode) return;
            const text = randomFrom(MOCK_MESSAGES);
            this.log(`mock: chat:message  from=${user.name}  room=#${roomId}  text="${text.slice(0, 40)}…"`);
            this.emitMock('chat:message', {
              id:             crypto.randomUUID(),
              roomId,
              senderId:       user.id,
              senderName:     user.name,
              senderInitials: user.initials,
              text,
              timestamp:      Date.now(),
              status:         'sent',
            } satisfies ChatMessage);
          });
        });

        schedule(); // schedule the next message
      });
    };
    schedule();
  }

  private scheduleMockNotifications(): void {
    const schedule = () => {
      this.addMockTimer(randomInt(15_000, 35_000), () => {
        if (!this.isMockMode) return;
        const n = randomFrom(MOCK_NOTIFICATIONS);
        this.log(`mock: notification:new  title="${n.title}"  type=${n.type}`);
        this.emitMock('notification:new', {
          id:        crypto.randomUUID(),
          title:     n.title,
          body:      n.body,
          type:      n.type,
          timestamp: Date.now(),
          read:      false,
        } satisfies NotificationPayload);
        schedule();
      });
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
      const payload = message.payload as ChatMessage;
      const delay   = randomInt(300, 800);
      this.log(`mock: echo  id=${payload.id.slice(0, 8)}…  confirming in ${delay} ms`);
      this.addMockTimer(delay, () => {
        useRealtimeStore.getState().updateMessageStatus(payload.id, 'sent');
        this.log(`mock: echo confirmed  id=${payload.id.slice(0, 8)}…`);
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Update connection status.
   * No-op when the new value equals the current one — prevents spurious
   * Zustand state updates and unnecessary React re-renders.
   */
  private setStatus(status: SocketConnectionStatus): void {
    if (this.status === status) return;
    this.log(`status: ${this.status} → ${status}`);
    this.status = status;
    useRealtimeStore.getState().setConnectionStatus(status);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.stopHeartbeat();
    this.stopMockMode();
  }
}

// ---------------------------------------------------------------------------
// Export singleton
// ---------------------------------------------------------------------------

/** Pre-created singleton. Import this everywhere — do NOT call `new SocketManager()`. */
export const socketManager = SocketManager.getInstance();
