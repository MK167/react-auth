import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import DeepLinkGuard from '@/routes/DeepLinkGuard';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/core/errors/error.handler', () => ({
  handleRouteError: vi.fn(),
}));

// Mock GlobalLoader so we can test the "pending" state easily
vi.mock('@/components/common/GlobalLoader', () => ({
  default: ({ show }: { show?: boolean }) =>
    show ? <div data-testid="global-loader" /> : null,
}));

import { useAuthStore } from '@/store/auth.store';
import { handleRouteError } from '@/core/errors/error.handler';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockHandleRouteError = handleRouteError as ReturnType<typeof vi.fn>;

function renderGuard(
  path: string,
  guardProps: { resourceType?: string; featureFlag?: string } = {},
) {
  mockUseAuthStore.mockReturnValue({
    user: { _id: 'u1', role: 'CUSTOMER' },
    featureFlags: {},
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<DeepLinkGuard {...guardProps} />}>
          <Route path="/orders/:id" element={<div>Order Detail</div>} />
        </Route>
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DeepLinkGuard', () => {
  describe('with resourceType="order"', () => {
    it('shows the loader while validation is pending', () => {
      renderGuard('/orders/order-123', { resourceType: 'order' });
      expect(screen.getByTestId('global-loader')).toBeInTheDocument();
    });

    it('renders the child route when ownership check passes (valid ID)', async () => {
      // The mock service returns found=true for "order" type + ID ≥ 4 chars
      renderGuard('/orders/order-valid-id', { resourceType: 'order' });
      await waitFor(() => {
        expect(screen.getByText('Order Detail')).toBeInTheDocument();
      });
    });

    it('redirects when ID is too short (< 4 chars → not found)', async () => {
      renderGuard('/orders/abc', { resourceType: 'order' });
      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      });
      expect(mockHandleRouteError).toHaveBeenCalledWith('ORDER_NOT_FOUND');
    });

    it('redirects for an unknown resource type', async () => {
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'CUSTOMER' },
        featureFlags: {},
      });
      render(
        <MemoryRouter initialEntries={['/orders/resource-999']}>
          <Routes>
            <Route element={<DeepLinkGuard resourceType="unknownType" />}>
              <Route path="/orders/:id" element={<div>Page</div>} />
            </Route>
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      });
    });
  });

  describe('with featureFlag check', () => {
    it('redirects when the feature flag is disabled', async () => {
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: { betaFeature: false },
      });
      render(
        <MemoryRouter initialEntries={['/orders/any-id']}>
          <Routes>
            <Route element={<DeepLinkGuard featureFlag="betaFeature" />}>
              <Route path="/orders/:id" element={<div>Feature Page</div>} />
            </Route>
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      });
      expect(mockHandleRouteError).toHaveBeenCalledWith('FEATURE_DISABLED');
    });

    it('proceeds to ownership check when feature flag is enabled', async () => {
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: { betaFeature: true },
      });
      render(
        <MemoryRouter initialEntries={['/orders/valid-order-id']}>
          <Routes>
            <Route element={<DeepLinkGuard featureFlag="betaFeature" resourceType="order" />}>
              <Route path="/orders/:id" element={<div>Feature Page</div>} />
            </Route>
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getByText('Feature Page')).toBeInTheDocument();
      });
    });
  });
});
