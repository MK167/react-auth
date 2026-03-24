/**
 * @fileoverview useAdminSocket — React hook that exposes the WebSocket layer.
 *
 * ## Design decisions
 *
 * - **No duplicate instances** — the hook wraps the module-level singleton
 *   `socketManager`. Multiple calls to `useAdminSocket()` share one connection.
 * - **Selective re-renders** — the hook only subscribes to `connectionStatus`
 *   and `lastServerTimestamp` from the store. Callers that need message data
 *   subscribe to `useRealtimeStore` directly with granular selectors.
 * - **Typed event subscription** — `subscribe<T>()` is generic so handlers
 *   receive a properly typed `SocketEvent<T>` without unsafe casts.
 * - **Stable callbacks** — all returned functions are memoised with
 *   `useCallback` so they are safe to include in `useEffect` dependency arrays.
 *
 * ## Usage
 *
 * ```tsx
 * const { connectionStatus, sendMessage, subscribe, unsubscribe } = useAdminSocket();
 *
 * useEffect(() => {
 *   const handler = (event: SocketEvent<ChatMessage>) => { ... };
 *   subscribe('chat:message', handler);
 *   return () => unsubscribe('chat:message', handler);
 * }, [subscribe, unsubscribe]);
 * ```
 *
 * @module features/realtime/hooks/useAdminSocket
 */

import { useCallback } from 'react';
import { socketManager } from '../socket/socket.manager';
import { useRealtimeStore } from '../store/realtime.store';
import type { EventHandler, OutboundSocketMessage, SocketEventType } from '../types/socket.types';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminSocket() {
  // Derive connection status from store (socketManager writes to it)
  const connectionStatus   = useRealtimeStore((s) => s.connectionStatus);
  const lastServerTimestamp = useRealtimeStore((s) => s.lastServerTimestamp);

  /** Send a message to the server. Queued automatically if offline. */
  const sendMessage = useCallback(
    (message: OutboundSocketMessage) => socketManager.send(message),
    [],
  );

  /** Register a typed handler for a specific event type. */
  const subscribe = useCallback(
    <T>(type: SocketEventType, handler: EventHandler<T>) =>
      socketManager.subscribe<T>(type, handler),
    [],
  );

  /** Remove a previously registered handler. */
  const unsubscribe = useCallback(
    (type: SocketEventType, handler: EventHandler<unknown>) =>
      socketManager.unsubscribe(type, handler),
    [],
  );

  return {
    /** Current WebSocket connection state. */
    connectionStatus,
    /** Epoch-ms timestamp of the last event received from the server. */
    lastServerTimestamp,
    /** Send a typed message (or queue it if offline). */
    sendMessage,
    /** Subscribe to a specific event type. Always unsubscribe on cleanup. */
    subscribe,
    /** Remove a specific handler from the event registry. */
    unsubscribe,
  };
}
