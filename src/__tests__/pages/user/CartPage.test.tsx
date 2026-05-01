import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CartPage from '@/pages/user/CartPage';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/utils/prefetch', () => ({ prefetchCheckout: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/store/cart.store', () => ({ useCartStore: vi.fn() }));
vi.mock('@/utils/slug', () => ({ toProductSlugId: (_n: string, id: string) => id }));

import { useCartStore } from '@/store/cart.store';
const mockUseCartStore = useCartStore as unknown as ReturnType<typeof vi.fn>;

const makeItem = (id: string, qty = 1) => ({
  product: {
    _id: id, name: `Product ${id}`, price: 10, stock: 5,
    mainImage: { _id: 'i', url: 'http://img.jpg', localPath: '' },
  },
  quantity: qty,
});

function setupCart(items: ReturnType<typeof makeItem>[] = []) {
  const removeItem = vi.fn();
  const updateQuantity = vi.fn();
  const clearCart = vi.fn();
  mockUseCartStore.mockImplementation(() => ({
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalPrice: () => items.reduce((s, i) => s + i.product.price * i.quantity, 0),
    getTotalItems: () => items.reduce((s, i) => s + i.quantity, 0),
  }));
  return { removeItem, updateQuantity, clearCart };
}

function renderPage() {
  return render(<MemoryRouter><CartPage /></MemoryRouter>);
}

describe('CartPage', () => {
  it('shows empty cart state when no items', () => {
    setupCart([]);
    renderPage();
    expect(screen.getByText('cart.emptyTitle')).toBeInTheDocument();
  });

  it('renders product names when cart has items', () => {
    setupCart([makeItem('p1'), makeItem('p2')]);
    renderPage();
    expect(screen.getByText('Product p1')).toBeInTheDocument();
    expect(screen.getByText('Product p2')).toBeInTheDocument();
  });

  it('calls removeItem when remove button is clicked', () => {
    const { removeItem } = setupCart([makeItem('p1')]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(removeItem).toHaveBeenCalledWith('p1');
  });

  it('calls clearCart when clear button is clicked', () => {
    const { clearCart } = setupCart([makeItem('p1')]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /cart\.clear/i }));
    expect(clearCart).toHaveBeenCalled();
  });

  it('shows total price', () => {
    setupCart([makeItem('p1', 2), makeItem('p2', 1)]);
    renderPage();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });
});
