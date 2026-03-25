import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RealtimeProvider from '@/features/realtime/providers/RealtimeProvider';

vi.mock('@/features/realtime/socket/socket.manager', () => ({
  socketManager: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('@/features/realtime/store/realtime.store', () => ({
  useRealtimeStore: vi.fn().mockReturnValue(vi.fn()),
}));

import { socketManager } from '@/features/realtime/socket/socket.manager';

describe('RealtimeProvider', () => {
  it('renders children', () => {
    render(
      <RealtimeProvider>
        <div>Admin Content</div>
      </RealtimeProvider>,
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('calls socketManager.connect on mount', () => {
    render(
      <RealtimeProvider>
        <div />
      </RealtimeProvider>,
    );
    expect(socketManager.connect).toHaveBeenCalledTimes(1);
  });

  it('calls socketManager.disconnect on unmount', () => {
    const { unmount } = render(
      <RealtimeProvider>
        <div />
      </RealtimeProvider>,
    );
    unmount();
    expect(socketManager.disconnect).toHaveBeenCalledTimes(1);
  });
});
