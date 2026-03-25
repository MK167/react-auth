import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));

import OrdersPage from '@/pages/user/OrdersPage';

function renderPage(path = '/orders') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrdersPage', () => {
  it('renders the orders page heading', () => {
    renderPage();
    expect(screen.getByText('orders.title')).toBeInTheDocument();
  });

  it('renders mock order items', () => {
    renderPage();
    // Component uses static MOCK_ORDERS — verify at least one is rendered
    expect(screen.getByText('ORD-A3F9K1')).toBeInTheDocument();
  });
});
