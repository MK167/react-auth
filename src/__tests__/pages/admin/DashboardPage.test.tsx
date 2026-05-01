import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/products.api', () => ({ getProducts: vi.fn(), getCategories: vi.fn().mockResolvedValue({ data: { data: [] } }) }));
vi.mock('@/api/orders.api', () => ({ getAdminOrders: vi.fn() }));
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }));

import { getProducts } from '@/api/products.api';
import { getAdminOrders } from '@/api/orders.api';
import { useAuthStore } from '@/store/auth.store';
import DashboardPage from '@/pages/admin/DashboardPage';

const mockGetProducts = getProducts as ReturnType<typeof vi.fn>;
const mockGetOrders = getAdminOrders as ReturnType<typeof vi.fn>;
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('DashboardPage', () => {
  it('renders the dashboard heading', async () => {
    mockUseAuthStore.mockReturnValue({ user: { _id: 'u1', username: 'Admin' } });
    mockGetProducts.mockResolvedValue({ data: { data: [], totalPages: 0 } });
    mockGetOrders.mockResolvedValue({ data: { data: [], totalPages: 0 } });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('admin.dashboard.title')).toBeInTheDocument(),
    );
  });
});
