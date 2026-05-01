/**
 * @fileoverview Shared type contracts for the WebSocket realtime layer.
 *
 * All event payloads, connection states, and message envelopes are defined
 * here and shared between the SocketManager, Zustand store, hook, and UI
 * components. No business logic lives in this file.
 *
 * ## Event envelope format (server ↔ client)
 *
 * ```json
 * { "type": "chat:message", "payload": {...}, "roomId": "general", "timestamp": 1700000000000 }
 * ```
 *
 * @module features/realtime/types/socket.types
 */

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export type SocketConnectionStatus =
  | 'idle'         // not yet connected
  | 'connecting'   // WebSocket opening
  | 'connected'    // handshake complete, messages flowing
  | 'reconnecting' // connection dropped, attempting reconnect
  | 'disconnected' // intentionally closed (e.g. admin module unmounted)
  | 'error';       // unrecoverable error (auth failure, max retries)

// ---------------------------------------------------------------------------
// Event types (client → server and server → client)
// ---------------------------------------------------------------------------

export type SocketEventType =
  // Chat
  | 'chat:message'
  | 'chat:typing_start'
  | 'chat:typing_stop'
  // Presence
  | 'presence:join'
  | 'presence:leave'
  | 'presence:list'
  // Notifications
  | 'notification:new'
  // Rooms
  | 'room:subscribe'
  | 'room:unsubscribe'
  // System
  | 'system:ping'
  | 'system:pong'
  | 'system:error'
  | 'system:auth';

// ---------------------------------------------------------------------------
// Payload shapes
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  text: string;
  timestamp: number;
  /** Optimistic status — only meaningful for messages sent by the local user. */
  status: 'sending' | 'sent' | 'failed';
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  role: string;
  joinedAt: number;
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Generic event envelope
// ---------------------------------------------------------------------------

/** Every message travelling over the socket is wrapped in this envelope. */
export interface SocketEvent<T = unknown> {
  type: SocketEventType;
  payload: T;
  roomId?: string;
  timestamp: number;
}

/** Shape of a message the client sends to the server. */
export interface OutboundSocketMessage {
  type: SocketEventType;
  payload: unknown;
  roomId?: string;
}

/** Typed handler function registered via `socketManager.subscribe()`. */
export type EventHandler<T = unknown> = (event: SocketEvent<T>) => void;

// ---------------------------------------------------------------------------
// Reconnect config
// ---------------------------------------------------------------------------

export interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;   // ms — delay before first retry
  maxDelay: number;    // ms — cap on exponential growth
  factor: number;      // exponential base (e.g. 2 → 1s, 2s, 4s, 8s…)
}
