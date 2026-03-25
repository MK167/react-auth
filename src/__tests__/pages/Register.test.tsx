import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn().mockReturnValue({ setUser: vi.fn() }) }));
vi.mock('@/api/auth.api', () => ({ register: vi.fn() }));
vi.mock('@/components/auth/social-media-auth/SocialLogin', () => ({
  default: () => <div data-testid="social-login" />,
}));
vi.mock('@/components/auth/Divider', () => ({ default: () => <hr /> }));

import Register from '@/pages/Register';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Register', () => {
  it('renders username, email, and password fields', () => {
    renderPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // password fields
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('renders a submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
  });
});
