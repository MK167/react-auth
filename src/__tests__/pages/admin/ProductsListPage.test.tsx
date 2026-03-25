import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({
  getProducts: vi.fn(),
  deleteProduct: vi.fn(),
  getCategories: vi.fn(),
}));

import { getProducts, getCategories } from '@/api/products.api';
import ProductsListPage from '@/pages/admin/ProductsListPage';

const mockGetProducts = getProducts as ReturnType<typeof vi.fn>;
const mockGetCategories = getCategories as ReturnType<typeof vi.fn>;

describe('ProductsListPage', () => {
  it('renders the page heading', async () => {
    mockGetCategories.mockResolvedValue({ data: { data: [] } });
    mockGetProducts.mockResolvedValue({ data: { data: [], totalPages: 0 } });
    render(<MemoryRouter><ProductsListPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('admin.products.title')).toBeInTheDocument(),
    );
  });

  it('renders products in the table when loaded', async () => {
    mockGetCategories.mockResolvedValue({ data: { data: [] } });
    mockGetProducts.mockResolvedValue({
      data: {
        data: [{
          _id: 'p1', name: 'Test Product', price: 19.99, stock: 5,
          category: { _id: 'c1', name: 'Cat', slug: 'cat', owner: 'o', createdAt: '', updatedAt: '' },
          mainImage: { _id: 'i', url: '', localPath: '' },
          subImages: [], owner: 'o', createdAt: '', updatedAt: '',
        }],
        totalPages: 1,
      },
    });
    render(<MemoryRouter><ProductsListPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Test Product')).toBeInTheDocument());
  });
});
