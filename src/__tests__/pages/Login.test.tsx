import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/api/auth.api', () => ({ login: vi.fn() }));
vi.mock('@/components/auth/social-media-auth/SocialLogin', () => ({
  default: () => <div data-testid="social-login" />,
}));
vi.mock('@/components/auth/Divider', () => ({
  default: () => <hr />,
}));

import { useAuthStore } from '@/store/auth.store';
import { login } from '@/api/auth.api';
import Login from '@/pages/Login';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockLogin = login as ReturnType<typeof vi.fn>;

function renderPage() {
  mockUseAuthStore.mockReturnValue({ setUser: vi.fn(), user: null });
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  it('renders email and password fields', () => {
    renderPage();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /auth\.login\.continue/i })).toBeInTheDocument();
  });

  it('shows validation errors when form is submitted empty', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /auth\.login\.continue/i }));
    await waitFor(() => {
      // React Hook Form validation errors should appear
      expect(screen.getAllByRole('paragraph').length).toBeGreaterThan(0);
    });
  });

  it('renders the social login section', () => {
    renderPage();
    expect(screen.getByTestId('social-login')).toBeInTheDocument();
  });
});
