import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthLayout from '@/layouts/AuthLayout';

vi.mock('@/themes/theme.context', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({
    translate: (key: string) => key,
    lang: 'en',
    setLang: vi.fn(),
  }),
}));

function renderLayout(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<div>Login Form</div>} />
          <Route path="/register" element={<div>Register Form</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthLayout', () => {
  it('renders the ShopHub brand', () => {
    renderLayout();
    expect(screen.getAllByText('ShopHub')[0]).toBeInTheDocument();
  });

  it('renders main navigation with role="banner"', () => {
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the outlet (child route content)', () => {
    renderLayout('/login');
    expect(screen.getByText('Login Form')).toBeInTheDocument();
  });

  it('renders a footer with copyright', () => {
    renderLayout();
    expect(screen.getByText(/ShopHub\. All rights reserved\./)).toBeInTheDocument();
  });

  it('shows "Create Account" link on the /login page', () => {
    renderLayout('/login');
    // The link text is the i18n key 'auth.login.signUp' since we return key as value
    expect(screen.getByRole('link', { name: /auth\.login\.signUp/i })).toBeInTheDocument();
  });

  it('shows "Sign In" link on the /register page', () => {
    renderLayout('/register');
    expect(screen.getByRole('link', { name: /nav\.signIn/i })).toBeInTheDocument();
  });

  it('opens mobile menu when hamburger is clicked', () => {
    renderLayout();
    const hamburger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(hamburger);
    expect(screen.getAllByRole('button', { name: /close menu/i })[0]).toBeInTheDocument();
  });

  it('closes mobile menu when backdrop is clicked', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    // The backdrop area is aria-hidden, so target via the close button that appears
    const closeBtn = screen.getAllByRole('button', { name: /close menu/i })[0];
    fireEvent.click(closeBtn);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });
});
