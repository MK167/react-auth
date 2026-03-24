/**
 * @fileoverview Zustand realtime store — UI state driven by WebSocket events.
 *
 * ## Separation of concerns
 *
 * The SocketManager handles I/O (connection, framing, reconnect). This store
 * handles state derived from that I/O (messages, presence, notifications).
 * Components subscribe to this store and never talk to the SocketManager
 * directly — they use the `useAdminSocket` hook.
 *
 * ## Room model
 *
 * Rooms are keyed by `roomId` in a flat Record for O(1) lookups. Each room
 * holds its own message list and typing indicators so components can subscribe
 * to only the room they care about.
 *
 * @module features/realtime/store/realtime.store
 */

import { create } from 'zustand';
import type {
  ChatMessage,
  ChatRoom,
  NotificationPayload,
  PresenceUser,
  SocketConnectionStatus,
  TypingIndicator,
} from '../types/socket.types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

/** Per-room state bucket. */
type RoomState = ChatRoom & {
  messages:    ChatMessage[];
  typingUsers: TypingIndicator[];
};

type RealtimeState = {
  // ── Connection ──────────────────────────────────────────────────────────
  connectionStatus: SocketConnectionStatus;

  // ── Rooms ───────────────────────────────────────────────────────────────
  /** Flat map of roomId → room state. */
  rooms:          Record<string, RoomState>;
  activeRoomId:   string | null;

  // ── Presence ────────────────────────────────────────────────────────────
  onlineUsers:    PresenceUser[];

  // ── Notifications ────────────────────────────────────────────────────────
  notifications:  NotificationPayload[];
  unreadCount:    number;

  // ── Meta ─────────────────────────────────────────────────────────────────
  lastServerTimestamp: number | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  setConnectionStatus:  (status: SocketConnectionStatus) => void;

  // Rooms
  initRooms:            (rooms: ChatRoom[]) => void;
  setActiveRoom:        (roomId: string) => void;

  // Messages
  addMessage:           (message: ChatMessage) => void;
  updateMessageStatus:  (messageId: string, status: ChatMessage['status']) => void;

  // Typing
  setTyping:            (indicator: TypingIndicator) => void;
  clearTyping:          (args: { userId: string; roomId: string }) => void;

  // Presence
  addOnlineUser:        (user: PresenceUser) => void;
  removeOnlineUser:     (userId: string) => void;

  // Notifications
  pushNotification:     (notification: NotificationPayload) => void;
  markAllRead:          () => void;
  clearNotifications:   () => void;

  // Meta
  setLastServerTimestamp: (ts: number) => void;

  // Cleanup
  reset:                () => void;
};

// ---------------------------------------------------------------------------
// Default rooms (seeded at init — real app would fetch from backend)
// ---------------------------------------------------------------------------

export const DEFAULT_ROOMS: ChatRoom[] = [
  { id: 'general',    name: 'General',     description: 'Team-wide announcements and chat' },
  { id: 'ops',        name: 'Operations',  description: 'Orders, inventory, and logistics'  },
  { id: 'dev',        name: 'Dev Team',    description: 'Technical discussion and deploys'  },
];

function buildInitialRooms(): Record<string, RoomState> {
  const result: Record<string, RoomState> = {};
  DEFAULT_ROOMS.forEach((r) => {
    result[r.id] = { ...r, messages: [], typingUsers: [] };
  });
  return result;
}

const INITIAL_STATE = {
  connectionStatus:    'idle' as SocketConnectionStatus,
  rooms:               buildInitialRooms(),
  activeRoomId:        DEFAULT_ROOMS[0].id,
  onlineUsers:         [] as PresenceUser[],
  notifications:       [] as NotificationPayload[],
  unreadCount:         0,
  lastServerTimestamp: null as number | null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRealtimeStore = create<RealtimeState>((set) => ({
  ...INITIAL_STATE,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // ── Rooms ──────────────────────────────────────────────────────────────

  initRooms: (rooms) => {
    const result: Record<string, RoomState> = {};
    rooms.forEach((r) => {
      result[r.id] = { ...r, messages: [], typingUsers: [] };
    });
    set({ rooms: result, activeRoomId: rooms[0]?.id ?? null });
  },

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  // ── Messages ───────────────────────────────────────────────────────────

  addMessage: (message) =>
    set((state) => {
      const room = state.rooms[message.roomId];
      if (!room) return state;
      return {
        rooms: {
          ...state.rooms,
          [message.roomId]: {
            ...room,
            // Keep last 200 messages per room to cap memory
            messages: [...room.messages.slice(-199), message],
          },
        },
      };
    }),

  updateMessageStatus: (messageId, status) =>
    set((state) => {
      const updatedRooms = { ...state.rooms };
      for (const roomId in updatedRooms) {
        const room = updatedRooms[roomId];
        const idx = room.messages.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const msgs = [...room.messages];
          msgs[idx] = { ...msgs[idx], status };
          updatedRooms[roomId] = { ...room, messages: msgs };
          break;
        }
      }
      return { rooms: updatedRooms };
    }),

  // ── Typing ─────────────────────────────────────────────────────────────

  setTyping: (indicator) =>
    set((state) => {
      const room = state.rooms[indicator.roomId];
      if (!room) return state;
      const existing = room.typingUsers.some((u) => u.userId === indicator.userId);
      return {
        rooms: {
          ...state.rooms,
          [indicator.roomId]: {
            ...room,
            typingUsers: existing
              ? room.typingUsers
              : [...room.typingUsers, indicator],
          },
        },
      };
    }),

  clearTyping: ({ userId, roomId }) =>
    set((state) => {
      const room = state.rooms[roomId];
      if (!room) return state;
      return {
        rooms: {
          ...state.rooms,
          [roomId]: {
            ...room,
            typingUsers: room.typingUsers.filter((u) => u.userId !== userId),
          },
        },
      };
    }),

  // ── Presence ───────────────────────────────────────────────────────────

  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.some((u) => u.userId === user.userId)
        ? state.onlineUsers
        : [...state.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId),
    })),

  // ── Notifications ──────────────────────────────────────────────────────

  pushNotification: (notification) =>
    set((state) => ({
      // Cap at 50 notifications
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount:   state.unreadCount + 1,
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount:   0,
    })),

  clearNotifications: () =>
    set({ notifications: [], unreadCount: 0 }),

  // ── Meta ───────────────────────────────────────────────────────────────

  setLastServerTimestamp: (ts) => set({ lastServerTimestamp: ts }),

  // ── Cleanup ────────────────────────────────────────────────────────────

  reset: () => set({ ...INITIAL_STATE, rooms: buildInitialRooms() }),
}));
