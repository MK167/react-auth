import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import HomePage from '@/pages/user/HomePage';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));

vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (key: string, fb?: string) => fb ?? key }),
}));

vi.mock('@/api/products.api', () => ({
  getProducts: vi.fn(),
}));

vi.mock('@/store/cart.store', () => ({
  useCartStore: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('@/store/wishlist.store', () => ({
  useWishlistStore: vi.fn().mockReturnValue({ hasItem: vi.fn().mockReturnValue(false), toggleItem: vi.fn() }),
}));

vi.mock('@/utils/prefetch', () => ({
  prefetchProductDetail: vi.fn(),
}));

import { getProducts } from '@/api/products.api';
import { useCartStore } from '@/store/cart.store';

const mockGetProducts = getProducts as ReturnType<typeof vi.fn>;
const mockUseCartStore = useCartStore as unknown as ReturnType<typeof vi.fn>;

const makeProduct = (id: string) => ({
  _id: id,
  name: `Product ${id}`,
  description: 'desc',
  price: 9.99,
  stock: 5,
  category: { _id: 'c1', name: 'Cat', slug: 'cat', owner: 'o', createdAt: '', updatedAt: '' },
  mainImage: { _id: 'i1', url: `https://img.example.com/${id}.jpg`, localPath: '' },
  subImages: [],
  owner: 'o1',
  createdAt: '',
  updatedAt: '',
});

function renderPage() {
  mockUseCartStore.mockReturnValue(vi.fn());
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
}

describe('HomePage', () => {
  describe('loading state', () => {
    it('shows skeleton cards while products are loading', () => {
      mockGetProducts.mockReturnValue(new Promise(() => {})); // never resolves
      renderPage();
      // ProductCardSkeleton elements are aria-hidden, check they exist
      const skeletons = document.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('loaded state', () => {
    it('renders product names after loading', async () => {
      mockGetProducts.mockResolvedValue({
        data: { data: [makeProduct('p1'), makeProduct('p2')] },
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Product p1')).toBeInTheDocument();
      });
      expect(screen.getByText('Product p2')).toBeInTheDocument();
    });

    it('applies fetchpriority=high to first product image only', async () => {
      mockGetProducts.mockResolvedValue({
        data: { data: [makeProduct('p1'), makeProduct('p2')] },
      });
      renderPage();
      await waitFor(() => screen.getByText('Product p1'));
      const images = document.querySelectorAll('img');
      expect(images[0]).toHaveAttribute('fetchpriority', 'high');
      expect(images[1]).not.toHaveAttribute('fetchpriority', 'high');
    });

    it('applies loading=eager to first image, lazy to rest', async () => {
      mockGetProducts.mockResolvedValue({
        data: { data: [makeProduct('p1'), makeProduct('p2')] },
      });
      renderPage();
      await waitFor(() => screen.getByText('Product p1'));
      const images = document.querySelectorAll('img');
      expect(images[0]).toHaveAttribute('loading', 'eager');
      expect(images[1]).toHaveAttribute('loading', 'lazy');
    });

    it('applies decoding=async to all images', async () => {
      mockGetProducts.mockResolvedValue({
        data: { data: [makeProduct('p1'), makeProduct('p2')] },
      });
      renderPage();
      await waitFor(() => screen.getByText('Product p1'));
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('decoding', 'async');
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no products are returned', async () => {
      mockGetProducts.mockResolvedValue({ data: { data: [] } });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('home.empty')).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows empty state when API call fails', async () => {
      mockGetProducts.mockRejectedValue(new Error('Network error'));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('home.empty')).toBeInTheDocument();
      });
    });
  });
});
