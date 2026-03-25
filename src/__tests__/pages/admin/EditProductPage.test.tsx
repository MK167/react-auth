import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({
  getProductById: vi.fn(),
  updateProduct: vi.fn(),
  getCategories: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

import { getProductById } from '@/api/products.api';
import EditProductPage from '@/pages/admin/EditProductPage';

const mockGetProductById = getProductById as ReturnType<typeof vi.fn>;

describe('EditProductPage', () => {
  it('renders the edit form once product loads', async () => {
    mockGetProductById.mockResolvedValue({
      data: {
        data: {
          _id: 'p1', name: 'Existing Product', description: 'desc', price: 5,
          stock: 10, category: { _id: 'c1', name: 'Cat' },
          mainImage: { _id: 'i', url: '', localPath: '' },
          subImages: [], owner: 'o', createdAt: '', updatedAt: '',
        },
      },
    });
    render(
      <MemoryRouter initialEntries={['/admin/products/p1/edit']}>
        <Routes>
          <Route path="/admin/products/:id/edit" element={<EditProductPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText('Edit product')).toBeInTheDocument(),
    );
  });
});
