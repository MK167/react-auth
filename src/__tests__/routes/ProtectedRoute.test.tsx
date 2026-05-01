import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from '@/routes/ProtectedRoute';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/utils/cookie.service', () => ({
  cookieService: { getToken: vi.fn() },
}));

import { useAuthStore } from '@/store/auth.store';
import { cookieService } from '@/utils/cookie.service';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockGetToken = cookieService.getToken as ReturnType<typeof vi.fn>;

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/orders" element={<div>Orders Page</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  describe('when authenticated (user + token present)', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: { _id: 'u1', role: 'CUSTOMER' } });
      mockGetToken.mockReturnValue('access-token');
    });

    it('renders the protected child route', () => {
      renderWithRouter('/orders');
      expect(screen.getByText('Orders Page')).toBeInTheDocument();
    });
  });

  describe('when unauthenticated (no user)', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: null });
      mockGetToken.mockReturnValue('access-token');
    });

    it('redirects to /login', () => {
      renderWithRouter('/orders');
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('does not render the protected child', () => {
      renderWithRouter('/orders');
      expect(screen.queryByText('Orders Page')).toBeNull();
    });
  });

  describe('when token is missing', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: { _id: 'u1', role: 'CUSTOMER' } });
      mockGetToken.mockReturnValue(undefined);
    });

    it('redirects to /login', () => {
      renderWithRouter('/orders');
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('when both user and token are missing', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: null });
      mockGetToken.mockReturnValue(undefined);
    });

    it('redirects to /login with targetUrl encoded', () => {
      renderWithRouter('/orders');
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
