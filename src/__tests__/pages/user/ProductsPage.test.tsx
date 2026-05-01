import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({ getProducts: vi.fn(), getCategories: vi.fn() }));
vi.mock('@/store/cart.store', () => ({ useCartStore: vi.fn().mockReturnValue(vi.fn()) }));
vi.mock('@/store/wishlist.store', () => ({
  useWishlistStore: vi.fn().mockReturnValue({
    hasItem: vi.fn().mockReturnValue(false),
    toggleItem: vi.fn(),
  }),
}));
vi.mock('@/utils/prefetch', () => ({ prefetchProductDetail: vi.fn() }));
vi.mock('@/utils/slug', () => ({ toProductSlugId: (_n: string, id: string) => id }));

import { getProducts, getCategories } from '@/api/products.api';
import ProductsPage from '@/pages/user/ProductsPage';

const mockGetProducts = getProducts as ReturnType<typeof vi.fn>;
const mockGetCategories = getCategories as ReturnType<typeof vi.fn>;

describe('ProductsPage', () => {
  beforeEach(() => {
    mockGetCategories.mockResolvedValue({ data: { data: [] } });
  });

  it('shows loading skeletons initially', () => {
    mockGetProducts.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><ProductsPage /></MemoryRouter>);
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders product names after loading', async () => {
    mockGetProducts.mockResolvedValue({
      data: {
        data: [{
          _id: 'p1', name: 'Widget', price: 5, stock: 3,
          mainImage: { _id: 'i', url: 'http://img.jpg', localPath: '' },
          subImages: [], owner: 'o', createdAt: '', updatedAt: '',
        }],
        totalPages: 1,
        page: 1,
      },
    });
    render(<MemoryRouter><ProductsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  });

  it('shows empty state when API returns no products', async () => {
    mockGetProducts.mockResolvedValue({ data: { data: [], totalPages: 0, page: 1 } });
    render(<MemoryRouter><ProductsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('products.noResults')).toBeInTheDocument());
  });
});
