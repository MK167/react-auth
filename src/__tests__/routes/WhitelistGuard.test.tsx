import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import WhitelistGuard from '@/routes/WhitelistGuard';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/config/whitelist.config', () => ({
  findWhitelistRule: vi.fn(),
}));

vi.mock('@/core/errors/error.handler', () => ({
  handleRouteError: vi.fn(),
}));

import { useAuthStore } from '@/store/auth.store';
import { findWhitelistRule } from '@/config/whitelist.config';
import { handleRouteError } from '@/core/errors/error.handler';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockFindWhitelistRule = findWhitelistRule as ReturnType<typeof vi.fn>;
const mockHandleRouteError = handleRouteError as ReturnType<typeof vi.fn>;

function renderGuard(path = '/admin/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<WhitelistGuard />}>
          <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
        </Route>
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WhitelistGuard', () => {
  describe('when no whitelist rule matches the path', () => {
    it('transparently renders the child route', () => {
      mockFindWhitelistRule.mockReturnValue(null);
      mockUseAuthStore.mockReturnValue({ user: null, featureFlags: {} });
      renderGuard();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('role check', () => {
    it('passes when user role is in allowedRoles', () => {
      mockFindWhitelistRule.mockReturnValue({ allowedRoles: ['ADMIN'] });
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: {},
      });
      renderGuard();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('redirects when user role is not in allowedRoles', () => {
      mockFindWhitelistRule.mockReturnValue({ allowedRoles: ['ADMIN'] });
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'CUSTOMER' },
        featureFlags: {},
      });
      renderGuard();
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(mockHandleRouteError).toHaveBeenCalledWith('FORBIDDEN', expect.any(Object));
    });
  });

  describe('user ID check', () => {
    it('passes when user _id is in allowedUserIds', () => {
      mockFindWhitelistRule.mockReturnValue({ allowedUserIds: ['u1'] });
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: {},
      });
      renderGuard();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('redirects when user _id is not in allowedUserIds', () => {
      mockFindWhitelistRule.mockReturnValue({ allowedUserIds: ['u99'] });
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: {},
      });
      renderGuard();
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  describe('feature flag check', () => {
    it('passes when all required flags are enabled', () => {
      mockFindWhitelistRule.mockReturnValue({ requiredFeatureFlags: ['betaFeature'] });
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: { betaFeature: true },
      });
      renderGuard();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('redirects when a required flag is disabled', () => {
      mockFindWhitelistRule.mockReturnValue({ requiredFeatureFlags: ['betaFeature'] });
      mockUseAuthStore.mockReturnValue({
        user: { _id: 'u1', role: 'ADMIN' },
        featureFlags: { betaFeature: false },
      });
      renderGuard();
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(mockHandleRouteError).toHaveBeenCalledWith('FEATURE_DISABLED', expect.any(Object));
    });
  });
});
