/**
 * @fileoverview RealtimeProvider — manages WebSocket connection lifecycle
 * for the admin module.
 *
 * Mount this as a wrapper around the admin `<Outlet />`. It connects the
 * `socketManager` when the admin module mounts and disconnects it when it
 * unmounts (e.g. user navigates away or logs out). This keeps the WebSocket
 * alive for as long as the user is inside the admin panel regardless of which
 * admin page they are on.
 *
 * ## Why a provider component (not a hook)?
 *
 * Connection lifecycle must be tied to the AdminLayout mount/unmount cycle,
 * not to individual page components. A provider in the layout tree is the
 * cleanest boundary for this: no page component needs to know about connect
 * or disconnect.
 *
 * @module features/realtime/providers/RealtimeProvider
 */

import { useEffect } from 'react';
import { socketManager } from '../socket/socket.manager';
import { useRealtimeStore } from '../store/realtime.store';
import { environment } from '@/environments/environment';

// In production this would come from environment.wsUrl
const WS_URL =
  environment.apiSource === 'mock'
    ? 'ws://localhost:3001/ws' // won't be used — mock mode kicks in
    : (environment as unknown as { wsUrl?: string }).wsUrl ?? 'wss://api.example.com/ws';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  const reset = useRealtimeStore((s) => s.reset);

  useEffect(() => {
    socketManager.connect(WS_URL);

    return () => {
      socketManager.disconnect();
      reset(); // clear messages/presence when leaving the admin panel
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
