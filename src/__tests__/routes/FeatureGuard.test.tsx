import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import FeatureGuard from '@/routes/FeatureGuard';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/core/errors/error.handler', () => ({
  handleRouteError: vi.fn(),
}));

import { useAuthStore } from '@/store/auth.store';
import { handleRouteError } from '@/core/errors/error.handler';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockHandleRouteError = handleRouteError as ReturnType<typeof vi.fn>;

function renderGuard(featureFlags: Record<string, boolean>, featureFlag: string) {
  mockUseAuthStore.mockImplementation((selector: (s: { featureFlags: Record<string, boolean> }) => unknown) =>
    selector({ featureFlags }),
  );
  return render(
    <MemoryRouter initialEntries={['/admin/feature']}>
      <Routes>
        <Route element={<FeatureGuard featureFlag={featureFlag} />}>
          <Route path="/admin/feature" element={<div>Feature Page</div>} />
        </Route>
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FeatureGuard', () => {
  describe('when the feature flag is enabled', () => {
    it('renders the child route', () => {
      renderGuard({ betaDashboard: true }, 'betaDashboard');
      expect(screen.getByText('Feature Page')).toBeInTheDocument();
    });

    it('does not call handleRouteError', () => {
      renderGuard({ betaDashboard: true }, 'betaDashboard');
      expect(mockHandleRouteError).not.toHaveBeenCalled();
    });
  });

  describe('when the feature flag is disabled', () => {
    it('redirects to /unauthorized by default', () => {
      renderGuard({ betaDashboard: false }, 'betaDashboard');
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Feature Page')).toBeNull();
    });

    it('calls handleRouteError with FEATURE_DISABLED', () => {
      renderGuard({ betaDashboard: false }, 'betaDashboard');
      expect(mockHandleRouteError).toHaveBeenCalledWith('FEATURE_DISABLED', expect.any(Object));
    });
  });

  describe('when the feature flag is missing', () => {
    it('redirects to /unauthorized', () => {
      renderGuard({}, 'nonExistentFlag');
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  describe('custom fallbackPath', () => {
    it('redirects to custom path when flag is disabled', () => {
      mockUseAuthStore.mockImplementation((selector: (s: { featureFlags: Record<string, boolean> }) => unknown) =>
        selector({ featureFlags: {} }),
      );
      render(
        <MemoryRouter initialEntries={['/admin/feature']}>
          <Routes>
            <Route element={<FeatureGuard featureFlag="missing" fallbackPath="/home" />}>
              <Route path="/admin/feature" element={<div>Feature Page</div>} />
            </Route>
            <Route path="/home" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>,
      );
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });
});
