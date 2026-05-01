import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import UserLayout from '@/layouts/UserLayout';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/store/cart.store', () => ({
  useCartStore: vi.fn(),
}));

vi.mock('@/store/wishlist.store', () => ({
  useWishlistStore: vi.fn(),
}));

vi.mock('@/api/cart.api', () => ({
  addToServerCart: vi.fn().mockResolvedValue({}),
}));

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

import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockUseCartStore = useCartStore as unknown as ReturnType<typeof vi.fn>;
const mockUseWishlistStore = useWishlistStore as unknown as ReturnType<typeof vi.fn>;

function setupMocks(user: object | null = null, cartCount = 0, wishlistCount = 0) {
  mockUseAuthStore.mockReturnValue({ user, logout: vi.fn() });
  mockUseCartStore.mockImplementation((selector: (s: { items: { quantity: number }[] }) => unknown) =>
    selector({ items: Array.from({ length: cartCount }, () => ({ quantity: 1 })) }),
  );
  mockUseWishlistStore.mockImplementation((selector: (s: { items: unknown[] }) => unknown) =>
    selector({ items: Array.from({ length: wishlistCount }) }),
  );
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<UserLayout />}>
          <Route path="/" element={<div>Home Content</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('UserLayout', () => {
  it('renders the ShopHub brand', () => {
    setupMocks();
    renderLayout();
    expect(screen.getAllByText('ShopHub')[0]).toBeInTheDocument();
  });

  it('renders header with role="banner"', () => {
    setupMocks();
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the child route content', () => {
    setupMocks();
    renderLayout();
    expect(screen.getByText('Home Content')).toBeInTheDocument();
  });

  it('renders footer with copyright', () => {
    setupMocks();
    renderLayout();
    expect(screen.getByText(/ShopHub\. All rights reserved\./)).toBeInTheDocument();
  });

  it('shows cart badge when cartCount > 0', () => {
    setupMocks(null, 3);
    renderLayout();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows wishlist badge when wishlistCount > 0', () => {
    setupMocks(null, 0, 5);
    renderLayout();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows username avatar when user is logged in', () => {
    setupMocks({ _id: 'u1', username: 'alice', role: 'CUSTOMER' });
    renderLayout();
    expect(screen.getAllByText('alice')[0]).toBeInTheDocument();
    // Avatar initial
    expect(screen.getAllByText('A')[0]).toBeInTheDocument();
  });

  it('opens mobile drawer when hamburger is clicked', () => {
    setupMocks();
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('complementary', { name: 'Mobile navigation' })).toBeVisible();
  });
});
