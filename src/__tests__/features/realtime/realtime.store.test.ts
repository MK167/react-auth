/**
 * @fileoverview Unit tests for the WebSocket realtime store.
 *
 * ## Architecture note
 *
 * The realtime store is a pure state container — it knows nothing about
 * WebSockets. The SocketManager fires events; those events call store actions.
 * By testing the store in isolation we verify:
 * - State transitions are correct when actions are called
 * - Invariants are maintained (message cap, presence deduplication, etc.)
 *
 * ## Key invariants tested
 *
 * 1. **Message cap (200 per room)** — Keeps memory bounded. Messages beyond
 *    200 cause the oldest to be dropped (sliding window).
 *
 * 2. **Notification cap (50)** — Same pattern for the notification queue.
 *
 * 3. **Presence deduplication** — `addOnlineUser` must not add the same user
 *    twice. If the user's WebSocket reconnects, they send a presence:join event
 *    again — we must not create a duplicate entry in the online users list.
 *
 * 4. **Typing deduplication** — Same principle: `setTyping` must not add
 *    a user to the typing list if they're already there.
 *
 * ## Room model
 *
 * Rooms are a flat `Record<roomId, RoomState>` for O(1) lookup by ID.
 * The default rooms ('general', 'ops', 'dev') are seeded at construction.
 * `initRooms(rooms)` replaces the default rooms with a server-provided list.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRealtimeStore, DEFAULT_ROOMS } from '@/features/realtime/store/realtime.store';
import type {
  ChatMessage,
  NotificationPayload,
  PresenceUser,
  TypingIndicator,
} from '@/features/realtime/types/socket.types';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: `msg-${Math.random()}`,
    roomId: 'general',
    senderId: 'user-1',
    senderName: 'Alice',
    senderInitials: 'A',
    text: 'Hello!',
    timestamp: Date.now(),
    status: 'sent',
    ...overrides,
  };
}

function makeNotification(overrides?: Partial<NotificationPayload>): NotificationPayload {
  return {
    id: `notif-${Math.random()}`,
    title: 'New Order',
    body: 'You have a new order',
    type: 'info',
    timestamp: Date.now(),
    read: false,
    ...overrides,
  };
}

function makePresenceUser(overrides?: Partial<PresenceUser>): PresenceUser {
  return {
    userId: 'user-1',
    userName: 'Alice',
    role: 'ADMIN',
    joinedAt: Date.now(),
    ...overrides,
  };
}

function makeTypingIndicator(overrides?: Partial<TypingIndicator>): TypingIndicator {
  return {
    userId: 'user-1',
    userName: 'Alice',
    roomId: 'general',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset helper
// ---------------------------------------------------------------------------

function resetStore() {
  useRealtimeStore.getState().reset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('realtime store', () => {
  beforeEach(resetStore);

  describe('initial state', () => {
    it('starts with connectionStatus = idle', () => {
      expect(useRealtimeStore.getState().connectionStatus).toBe('idle');
    });

    it('starts with the three default rooms seeded', () => {
      // WHY: Default rooms ('general', 'ops', 'dev') exist before any server
      //      message arrives so the UI can render room tabs immediately.
      const rooms = useRealtimeStore.getState().rooms;
      expect(Object.keys(rooms)).toEqual(DEFAULT_ROOMS.map((r) => r.id));
    });

    it('starts with activeRoomId = general (first default room)', () => {
      expect(useRealtimeStore.getState().activeRoomId).toBe('general');
    });

    it('starts with empty messages for each room', () => {
      const rooms = useRealtimeStore.getState().rooms;
      Object.values(rooms).forEach((room) => {
        expect(room.messages).toHaveLength(0);
      });
    });

    it('starts with unreadCount = 0', () => {
      expect(useRealtimeStore.getState().unreadCount).toBe(0);
    });
  });

  describe('setConnectionStatus', () => {
    it('updates the connectionStatus', () => {
      useRealtimeStore.getState().setConnectionStatus('connected');
      expect(useRealtimeStore.getState().connectionStatus).toBe('connected');
    });

    it('cycles through valid statuses', () => {
      useRealtimeStore.getState().setConnectionStatus('connecting');
      expect(useRealtimeStore.getState().connectionStatus).toBe('connecting');
      useRealtimeStore.getState().setConnectionStatus('reconnecting');
      expect(useRealtimeStore.getState().connectionStatus).toBe('reconnecting');
      useRealtimeStore.getState().setConnectionStatus('disconnected');
      expect(useRealtimeStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('initRooms', () => {
    it('replaces default rooms with the provided server rooms', () => {
      const serverRooms = [
        { id: 'room-a', name: 'Room A', description: 'First room' },
        { id: 'room-b', name: 'Room B', description: 'Second room' },
      ];
      useRealtimeStore.getState().initRooms(serverRooms);

      const roomIds = Object.keys(useRealtimeStore.getState().rooms);
      expect(roomIds).toEqual(['room-a', 'room-b']);
    });

    it('sets activeRoomId to the first server room', () => {
      const serverRooms = [{ id: 'support', name: 'Support', description: '' }];
      useRealtimeStore.getState().initRooms(serverRooms);
      expect(useRealtimeStore.getState().activeRoomId).toBe('support');
    });

    it('initialises each room with empty messages and typingUsers', () => {
      useRealtimeStore.getState().initRooms([{ id: 'new-room', name: 'New', description: '' }]);
      const room = useRealtimeStore.getState().rooms['new-room'];
      expect(room.messages).toHaveLength(0);
      expect(room.typingUsers).toHaveLength(0);
    });
  });

  describe('setActiveRoom', () => {
    it('changes the active room id', () => {
      useRealtimeStore.getState().setActiveRoom('ops');
      expect(useRealtimeStore.getState().activeRoomId).toBe('ops');
    });
  });

  describe('addMessage', () => {
    it('appends a message to the correct room', () => {
      const msg = makeMessage({ roomId: 'general', text: 'Hello!' });
      useRealtimeStore.getState().addMessage(msg);

      expect(useRealtimeStore.getState().rooms['general'].messages).toHaveLength(1);
      expect(useRealtimeStore.getState().rooms['general'].messages[0].text).toBe('Hello!');
    });

    it('does not affect other rooms when adding to one room', () => {
      useRealtimeStore.getState().addMessage(makeMessage({ roomId: 'general' }));
      expect(useRealtimeStore.getState().rooms['ops'].messages).toHaveLength(0);
    });

    it('is a no-op for a message with an unknown roomId', () => {
      // WHY: The store should never crash when it receives a message for an
      //      unrecognised room — defensive against server-side bugs.
      const msg = makeMessage({ roomId: 'nonexistent-room' });
      expect(() => useRealtimeStore.getState().addMessage(msg)).not.toThrow();
    });

    it('caps messages at 200 per room (sliding window)', () => {
      // WHY: Keeping all messages in memory would cause a memory leak in
      //      long-running admin sessions. The cap keeps memory bounded.
      for (let i = 0; i < 205; i++) {
        useRealtimeStore.getState().addMessage(makeMessage({ roomId: 'general' }));
      }
      expect(useRealtimeStore.getState().rooms['general'].messages).toHaveLength(200);
    });
  });

  describe('updateMessageStatus', () => {
    it('updates the status of a specific message', () => {
      const msg = makeMessage({ id: 'msg-123', status: 'sending', roomId: 'general' });
      useRealtimeStore.getState().addMessage(msg);
      useRealtimeStore.getState().updateMessageStatus('msg-123', 'sent');

      const updated = useRealtimeStore.getState().rooms['general'].messages[0];
      expect(updated.status).toBe('sent');
    });

    it('marks a failed message correctly', () => {
      const msg = makeMessage({ id: 'msg-fail', status: 'sending', roomId: 'general' });
      useRealtimeStore.getState().addMessage(msg);
      useRealtimeStore.getState().updateMessageStatus('msg-fail', 'failed');

      expect(useRealtimeStore.getState().rooms['general'].messages[0].status).toBe('failed');
    });
  });

  describe('typing indicators', () => {
    it('adds a typing indicator to the correct room', () => {
      const indicator = makeTypingIndicator({ roomId: 'general' });
      useRealtimeStore.getState().setTyping(indicator);

      expect(useRealtimeStore.getState().rooms['general'].typingUsers).toHaveLength(1);
    });

    it('does not add a duplicate typing indicator for the same user', () => {
      // WHY: The server may send repeated typing:start events. We must only
      //      show the user once in the "... is typing" indicator.
      const indicator = makeTypingIndicator({ userId: 'user-1', roomId: 'general' });
      useRealtimeStore.getState().setTyping(indicator);
      useRealtimeStore.getState().setTyping(indicator);

      expect(useRealtimeStore.getState().rooms['general'].typingUsers).toHaveLength(1);
    });

    it('removes a typing indicator via clearTyping', () => {
      const indicator = makeTypingIndicator({ userId: 'user-1', roomId: 'general' });
      useRealtimeStore.getState().setTyping(indicator);
      useRealtimeStore.getState().clearTyping({ userId: 'user-1', roomId: 'general' });

      expect(useRealtimeStore.getState().rooms['general'].typingUsers).toHaveLength(0);
    });
  });

  describe('presence', () => {
    it('adds an online user', () => {
      const user = makePresenceUser({ userId: 'user-1' });
      useRealtimeStore.getState().addOnlineUser(user);
      expect(useRealtimeStore.getState().onlineUsers).toHaveLength(1);
    });

    it('does not add a duplicate user (presence deduplication)', () => {
      // WHY: If a user reconnects, another presence:join arrives. Without
      //      deduplication, the online count would show 2 for the same person.
      const user = makePresenceUser({ userId: 'user-1' });
      useRealtimeStore.getState().addOnlineUser(user);
      useRealtimeStore.getState().addOnlineUser(user);
      expect(useRealtimeStore.getState().onlineUsers).toHaveLength(1);
    });

    it('removes an online user by userId', () => {
      useRealtimeStore.getState().addOnlineUser(makePresenceUser({ userId: 'user-1' }));
      useRealtimeStore.getState().addOnlineUser(makePresenceUser({ userId: 'user-2' }));
      useRealtimeStore.getState().removeOnlineUser('user-1');

      expect(useRealtimeStore.getState().onlineUsers).toHaveLength(1);
      expect(useRealtimeStore.getState().onlineUsers[0].userId).toBe('user-2');
    });
  });

  describe('notifications', () => {
    it('adds a notification and increments unreadCount', () => {
      useRealtimeStore.getState().pushNotification(makeNotification());
      expect(useRealtimeStore.getState().notifications).toHaveLength(1);
      expect(useRealtimeStore.getState().unreadCount).toBe(1);
    });

    it('prepends notifications (newest first)', () => {
      // WHY: slice(0, 50) on a prepended array keeps the newest notifications.
      useRealtimeStore.getState().pushNotification(makeNotification({ title: 'First' }));
      useRealtimeStore.getState().pushNotification(makeNotification({ title: 'Second' }));

      expect(useRealtimeStore.getState().notifications[0].title).toBe('Second');
    });

    it('caps notifications at 50', () => {
      for (let i = 0; i < 55; i++) {
        useRealtimeStore.getState().pushNotification(makeNotification());
      }
      expect(useRealtimeStore.getState().notifications).toHaveLength(50);
    });

    it('markAllRead sets all read = true and unreadCount = 0', () => {
      useRealtimeStore.getState().pushNotification(makeNotification());
      useRealtimeStore.getState().pushNotification(makeNotification());
      useRealtimeStore.getState().markAllRead();

      expect(useRealtimeStore.getState().unreadCount).toBe(0);
      useRealtimeStore.getState().notifications.forEach((n) => {
        expect(n.read).toBe(true);
      });
    });

    it('clearNotifications empties the list and resets unreadCount', () => {
      useRealtimeStore.getState().pushNotification(makeNotification());
      useRealtimeStore.getState().clearNotifications();

      expect(useRealtimeStore.getState().notifications).toHaveLength(0);
      expect(useRealtimeStore.getState().unreadCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('restores all state to initial values', () => {
      // Mutate the store
      useRealtimeStore.getState().setConnectionStatus('connected');
      useRealtimeStore.getState().addMessage(makeMessage());
      useRealtimeStore.getState().addOnlineUser(makePresenceUser());

      // Reset
      useRealtimeStore.getState().reset();

      expect(useRealtimeStore.getState().connectionStatus).toBe('idle');
      expect(useRealtimeStore.getState().onlineUsers).toHaveLength(0);
      expect(useRealtimeStore.getState().rooms['general'].messages).toHaveLength(0);
    });
  });
});
