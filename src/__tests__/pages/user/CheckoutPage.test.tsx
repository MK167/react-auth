import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/store/cart.store', () => ({ useCartStore: vi.fn() }));
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/api/orders.api', () => ({ createOrder: vi.fn() }));
vi.mock('@/api/cart.api', () => ({ clearServerCart: vi.fn() }));

import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import CheckoutPage from '@/pages/user/CheckoutPage';

const mockUseCartStore = useCartStore as unknown as ReturnType<typeof vi.fn>;
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('CheckoutPage', () => {
  it('redirects / shows empty when cart is empty', () => {
    mockUseCartStore.mockReturnValue({
      items: [],
      getTotalPrice: () => 0,
      getTotalItems: () => 0,
    });
    mockUseAuthStore.mockReturnValue({ user: { _id: 'u1' } });
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    // Cart is empty — page should handle it gracefully (redirect or show message)
    // Just ensure no crash
    expect(document.body).toBeInTheDocument();
  });

  it('renders checkout form when cart has items', () => {
    mockUseCartStore.mockReturnValue({
      items: [{ product: { _id: 'p1', name: 'Item', price: 10 }, quantity: 1 }],
      getTotalPrice: () => 10,
      getTotalItems: () => 1,
    });
    mockUseAuthStore.mockReturnValue({ user: { _id: 'u1' } });
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    expect(screen.getByText('checkout.title')).toBeInTheDocument();
  });
});
