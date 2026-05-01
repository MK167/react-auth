import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));

const mockStore = {
  rooms: [],
  activeRoomId: null,
  setActiveRoom: vi.fn(),
  onlineUsers: [],
  addMessage: vi.fn(),
  updateMessageStatus: vi.fn(),
};

vi.mock('@/features/realtime/store/realtime.store', () => ({
  useRealtimeStore: vi.fn().mockImplementation((selector: (s: typeof mockStore) => unknown) =>
    selector(mockStore),
  ),
}));

vi.mock('@/features/realtime/hooks/useAdminSocket', () => ({
  useAdminSocket: () => ({
    connectionStatus: 'disconnected',
    sendMessage: vi.fn(),
  }),
}));

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn().mockImplementation((selector: (s: { user: { _id: string; username: string } }) => unknown) =>
    selector({ user: { _id: 'u1', username: 'admin' } }),
  ),
}));

import RealtimeChatPage from '@/pages/admin/RealtimeChatPage';

describe('RealtimeChatPage', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><RealtimeChatPage /></MemoryRouter>);
    expect(document.body).toBeInTheDocument();
  });

  it('renders the chat heading', () => {
    render(<MemoryRouter><RealtimeChatPage /></MemoryRouter>);
    expect(screen.getByText('Team Chat')).toBeInTheDocument();
  });
});
