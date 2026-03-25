import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/api/auth.api', () => ({ getMe: vi.fn(), updateProfile: vi.fn() }));

import { useAuthStore } from '@/store/auth.store';
import { getMe } from '@/api/auth.api';
import ProfilePage from '@/pages/user/ProfilePage';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockGetMe = getMe as ReturnType<typeof vi.fn>;

describe('ProfilePage', () => {
  it('renders the page heading', async () => {
    mockUseAuthStore.mockReturnValue({ user: { _id: 'u1', username: 'alice', email: 'a@b.com', role: 'CUSTOMER' } });
    mockGetMe.mockResolvedValue({
      data: { data: { _id: 'u1', username: 'alice', email: 'a@b.com', role: 'CUSTOMER', avatar: null } },
    });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('profile.title')).toBeInTheDocument(),
    );
  });
});
