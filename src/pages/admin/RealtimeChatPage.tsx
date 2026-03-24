/**
 * @fileoverview RealtimeChatPage — admin real-time team chat demo.
 *
 * ## What this page demonstrates
 *
 * 1. `useAdminSocket()` — connection status, subscribe/unsubscribe
 * 2. `useRealtimeStore` — granular selectors (rooms, messages, presence)
 * 3. Optimistic message rendering (status: 'sending' → 'sent' | 'failed')
 * 4. Typing indicators driven by socket events
 * 5. Auto-scroll to the latest message
 * 6. Retry sending failed messages
 * 7. Connecting skeleton while the socket handshake is in progress
 * 8. Reconnect banner when the connection drops mid-session
 *
 * ## Architecture boundary
 *
 * No business logic lives here. All state mutations happen in
 * `useRealtimeStore`. All I/O goes through `useAdminSocket().sendMessage`.
 *
 * @module pages/admin/RealtimeChatPage
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  MessageSquare,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAdminSocket } from '@/features/realtime/hooks/useAdminSocket';
import { useRealtimeStore } from '@/features/realtime/store/realtime.store';
import { useAuthStore } from '@/store/auth.store';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { ChatMessage } from '@/features/realtime/types/socket.types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConnectionBanner({ status }: { status: string }) {
  if (status === 'connected') return null;

  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    connecting:   { label: 'Connecting…',      color: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300', icon: <Loader2 size={14} className="animate-spin" /> },
    reconnecting: { label: 'Reconnecting…',    color: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300', icon: <RefreshCw size={14} className="animate-spin" /> },
    disconnected: { label: 'Disconnected',     color: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',                   icon: <WifiOff size={14} /> },
    error:        { label: 'Connection failed', color: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',                  icon: <AlertTriangle size={14} /> },
  };

  const cfg = config[status];
  if (!cfg) return null;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </div>
  );
}

function ConnectionDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected:    'bg-green-500',
    connecting:   'bg-yellow-400 animate-pulse',
    reconnecting: 'bg-orange-400 animate-pulse',
    disconnected: 'bg-red-500',
    error:        'bg-red-500',
    idle:         'bg-gray-400',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? 'bg-gray-400'}`} />
  );
}

const SKELETON_WIDTHS = ['w-2/5', 'w-1/2', 'w-2/3', 'w-1/2', 'w-3/5'] as const;

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          <div className={`flex flex-col gap-1 ${SKELETON_WIDTHS[i]}`}>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  onRetry,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onRetry: (msg: ChatMessage) => void;
}) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0 mb-4">
          {message.senderInitials}
        </div>
      )}

      <div className={`flex flex-col gap-0.5 max-w-[68%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && (
          <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
            {message.senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? message.status === 'failed'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-br-sm'
                : 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-sm shadow-sm'
          }`}
        >
          {message.text}
        </div>

        {/* Status row */}
        <div className={`flex items-center gap-1.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{time}</span>
          {isOwn && message.status === 'sending' && (
            <Loader2 size={10} className="text-gray-400 animate-spin" />
          )}
          {isOwn && message.status === 'failed' && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-medium"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return <div className="h-6" />;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 pb-1 h-6">
      <div className="flex gap-0.5">
        {(['', '[animation-delay:150ms]', '[animation-delay:300ms]'] as const).map((delay, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce ${delay}`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RealtimeChatPage() {
  usePageMeta('Realtime Chat', 'Admin realtime chat and live user monitoring.');
  const { connectionStatus, sendMessage } = useAdminSocket();
  const user = useAuthStore((s) => s.user);

  // Store selectors — granular to avoid unnecessary re-renders
  const rooms        = useRealtimeStore((s) => s.rooms);
  const activeRoomId = useRealtimeStore((s) => s.activeRoomId);
  const setActiveRoom = useRealtimeStore((s) => s.setActiveRoom);
  const onlineUsers  = useRealtimeStore((s) => s.onlineUsers);
  const addMessage   = useRealtimeStore((s) => s.addMessage);
  const updateStatus = useRealtimeStore((s) => s.updateMessageStatus);

  const activeRoom  = activeRoomId ? rooms[activeRoomId] : null;
  const messages    = activeRoom?.messages ?? [];
  const typingUsers = activeRoom?.typingUsers ?? [];

  const [inputText, setInputText] = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Send typing indicator
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);

      if (!isTyping && activeRoomId) {
        setIsTyping(true);
        sendMessage({ type: 'chat:typing_start', payload: { userId: user?._id, userName: user?.username, roomId: activeRoomId } });
      }

      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setIsTyping(false);
        if (activeRoomId) {
          sendMessage({ type: 'chat:typing_stop', payload: { userId: user?._id, roomId: activeRoomId } });
        }
      }, 2_000);
    },
    [isTyping, activeRoomId, sendMessage, user],
  );

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !activeRoomId || !user) return;

    const messageId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id:             messageId,
      roomId:         activeRoomId,
      senderId:       user._id,
      senderName:     user.username,
      senderInitials: user.username.slice(0, 2).toUpperCase(),
      text,
      timestamp:      Date.now(),
      status:         'sending',
    };

    // 1. Add optimistically to the store
    addMessage(optimistic);
    setInputText('');

    // 2. Send to socket (mock mode will echo back and update status)
    sendMessage({ type: 'chat:message', payload: optimistic, roomId: activeRoomId });

    // 3. Fail-safe: mark as failed after 8 s if still 'sending'
    setTimeout(() => {
      updateStatus(messageId, 'failed');
    }, 8_000);

    inputRef.current?.focus();
  }, [inputText, activeRoomId, user, addMessage, sendMessage, updateStatus]);

  const handleRetry = useCallback(
    (msg: ChatMessage) => {
      updateStatus(msg.id, 'sending');
      sendMessage({ type: 'chat:message', payload: { ...msg, status: 'sending' }, roomId: msg.roomId });
    },
    [sendMessage, updateStatus],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'idle';
  const canSend = connectionStatus === 'connected' && inputText.trim().length > 0;

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-3.5rem)] flex bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* ── Room sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Team Chat</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <ConnectionDot status={connectionStatus} />
            <span className="capitalize">{connectionStatus}</span>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Rooms</p>
          {Object.values(rooms).map((room) => {
            const unread   = 0; // TODO: track per-room unread if needed
            const isActive = room.id === activeRoomId;
            return (
              <button
                type="button"
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="truncate"># {room.name}</span>
                {unread > 0 && (
                  <span className="bg-indigo-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Online users */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <Users size={12} />
            <span>{onlineUsers.length} online</span>
          </div>
          <div className="flex flex-col gap-1">
            {onlineUsers.slice(0, 5).map((u) => (
              <div key={u.userId} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{u.userName}</span>
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <span className="text-xs text-gray-400">+{onlineUsers.length - 5} more</span>
            )}
          </div>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Connection banner */}
        <ConnectionBanner status={connectionStatus} />

        {/* Room header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              # {activeRoom?.name ?? '—'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{activeRoom?.description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'connected'
              ? <Wifi size={15} className="text-green-500" />
              : <WifiOff size={15} className="text-red-400" />}
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{connectionStatus}</span>
          </div>
        </header>

        {/* Message list */}
        <main className="flex-1 overflow-y-auto">
          {isConnecting ? (
            <MessageSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <MessageSquare size={40} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No messages yet in <strong># {activeRoom?.name}</strong>.
                <br />Say hello!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === user?._id}
                  onRetry={handleRetry}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* Typing indicator */}
        <TypingIndicator names={typingUsers.map((u) => u.userName)} />

        {/* Input bar */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-600 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 dark:focus-within:ring-indigo-800 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                connectionStatus === 'connected'
                  ? `Message # ${activeRoom?.name ?? ''}…`
                  : 'Waiting for connection…'
              }
              disabled={connectionStatus !== 'connected'}
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 px-1">
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] border border-gray-200 dark:border-gray-600">Enter</kbd> to send
          </p>
        </footer>
      </div>
    </div>
  );
}
