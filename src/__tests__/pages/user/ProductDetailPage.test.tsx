import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({ getProductById: vi.fn() }));
vi.mock('@/store/cart.store', () => ({ useCartStore: vi.fn().mockReturnValue(vi.fn()) }));
vi.mock('@/store/wishlist.store', () => ({
  useWishlistStore: vi.fn().mockReturnValue({
    hasItem: vi.fn().mockReturnValue(false),
    toggleItem: vi.fn(),
  }),
}));

import { getProductById } from '@/api/products.api';
import ProductDetailPage from '@/pages/user/ProductDetailPage';

const mockGetProduct = getProductById as ReturnType<typeof vi.fn>;

const mockProduct = {
  _id: 'p1', name: 'Test Widget', description: 'A widget', price: 19.99, stock: 10,
  category: { _id: 'c1', name: 'Gadgets', slug: 'gadgets', owner: 'o', createdAt: '', updatedAt: '' },
  mainImage: { _id: 'i1', url: 'http://img.jpg', localPath: '' },
  subImages: [],
  owner: 'o1',
  createdAt: '',
  updatedAt: '',
};

function renderPage(slugId = 'test-widget-p1') {
  return render(
    <MemoryRouter initialEntries={[`/products/${slugId}`]}>
      <Routes>
        <Route path="/products/:slugId" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProductDetailPage', () => {
  it('shows loading state initially', () => {
    mockGetProduct.mockReturnValue(new Promise(() => {}));
    renderPage();
    // Skeletons are visible during load
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders product name after loading', async () => {
    mockGetProduct.mockResolvedValue({ data: mockProduct });
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Test Widget')[0]).toBeInTheDocument());
  });

  it('shows product price', async () => {
    mockGetProduct.mockResolvedValue({ data: mockProduct });
    renderPage();
    await waitFor(() => expect(screen.getByText('$19.99')).toBeInTheDocument());
  });

  it('shows not found state when product is null', async () => {
    mockGetProduct.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Could not load this product. Please go back and try again.')).toBeInTheDocument(),
    );
  });
});
