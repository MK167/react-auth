import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AdminLayout from '@/layouts/AdminLayout';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/themes/theme.context', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (key: string) => key, lang: 'en', setLang: vi.fn() }),
}));

vi.mock('@/features/realtime/store/realtime.store', () => ({
  useRealtimeStore: vi.fn().mockReturnValue(0),
}));

vi.mock('@/features/realtime/providers/RealtimeProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuthStore } from '@/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

function renderAdminLayout() {
  mockUseAuthStore.mockReturnValue({
    user: { _id: 'u1', username: 'admin', role: 'ADMIN' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  it('renders the ShopHub brand in the sidebar', () => {
    renderAdminLayout();
    expect(screen.getAllByText('ShopHub')[0]).toBeInTheDocument();
  });

  it('renders the child route content', () => {
    renderAdminLayout();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('renders admin navigation links', () => {
    renderAdminLayout();
    // Nav links are labelled with i18n keys (we return key as label)
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
  });

  it('shows user username in the header', () => {
    renderAdminLayout();
    expect(screen.getAllByText('admin')[0]).toBeInTheDocument();
  });

  it('opens mobile sidebar when hamburger is clicked', () => {
    renderAdminLayout();
    const hamburger = screen.getByRole('button', { name: /open sidebar/i });
    fireEvent.click(hamburger);
    // After click the close button becomes available
    expect(screen.queryByRole('button', { name: /close sidebar/i })).toBeInTheDocument();
  });
});
