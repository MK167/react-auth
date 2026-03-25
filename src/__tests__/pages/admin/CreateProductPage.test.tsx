import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({
  createProduct: vi.fn(),
  getCategories: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

import CreateProductPage from '@/pages/admin/CreateProductPage';

describe('CreateProductPage', () => {
  it('renders the form heading', async () => {
    render(<MemoryRouter><CreateProductPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('New product')).toBeInTheDocument(),
    );
  });
});
