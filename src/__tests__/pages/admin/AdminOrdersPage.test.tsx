import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/api/orders.api', () => ({
  getAdminOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

import { getAdminOrders } from '@/api/orders.api';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';

const mockGetAllOrders = getAdminOrders as ReturnType<typeof vi.fn>;

describe('AdminOrdersPage', () => {
  it('renders the page heading', async () => {
    mockGetAllOrders.mockResolvedValue({ data: { data: [], totalPages: 0 } });
    render(<MemoryRouter><AdminOrdersPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('admin.orders.title')).toBeInTheDocument(),
    );
  });
});
