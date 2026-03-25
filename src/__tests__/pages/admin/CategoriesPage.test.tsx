import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({ getCategories: vi.fn() }));
vi.mock('@/api/categories.api', () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import { getCategories } from '@/api/products.api';
import CategoriesPage from '@/pages/admin/CategoriesPage';

const mockGetCategories = getCategories as ReturnType<typeof vi.fn>;

describe('CategoriesPage', () => {
  it('renders the page heading', async () => {
    mockGetCategories.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><CategoriesPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('admin.categories.title')).toBeInTheDocument(),
    );
  });

  it('renders category names when loaded', async () => {
    mockGetCategories.mockResolvedValue({
      data: { data: [{ _id: 'c1', name: 'Electronics', slug: 'electronics', owner: 'o', createdAt: '', updatedAt: '' }] },
    });
    render(<MemoryRouter><CategoriesPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Electronics')).toBeInTheDocument());
  });
});
