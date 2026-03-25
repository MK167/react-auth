import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/store/wishlist.store', () => ({ useWishlistStore: vi.fn() }));
vi.mock('@/store/cart.store', () => ({ useCartStore: vi.fn() }));
vi.mock('@/api/products.api', () => ({ getProductById: vi.fn() }));
vi.mock('@/utils/slug', () => ({ toProductSlugId: (_n: string, id: string) => id }));

import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import WishlistPage from '@/pages/user/WishlistPage';

const mockUseWishlistStore = useWishlistStore as unknown as ReturnType<typeof vi.fn>;
const mockUseCartStore = useCartStore as unknown as ReturnType<typeof vi.fn>;

function setupStores(wishlistItems: string[] = []) {
  const toggleItem = vi.fn();
  mockUseWishlistStore.mockReturnValue({
    items: wishlistItems,
    toggleItem,
    hasItem: (id: string) => wishlistItems.includes(id),
  });
  mockUseCartStore.mockReturnValue({ addItem: vi.fn() });
  return { toggleItem };
}

describe('WishlistPage', () => {
  it('shows empty wishlist message when no items', () => {
    setupStores([]);
    render(<MemoryRouter><WishlistPage /></MemoryRouter>);
    expect(screen.getByText('wishlist.emptySubtitle')).toBeInTheDocument();
  });
});
