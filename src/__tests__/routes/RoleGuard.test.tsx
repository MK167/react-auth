import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import RoleGuard from '@/routes/RoleGuard';

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '@/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

function renderGuard(user: { _id: string; role: string } | null, allowedRoles: string[]) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<RoleGuard allowedRoles={allowedRoles} />}>
          <Route path="/admin" element={<div>Admin Panel</div>} />
        </Route>
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleGuard', () => {
  describe('when user has the required role', () => {
    it('renders the child route for ADMIN', () => {
      mockUseAuthStore.mockReturnValue({ user: { _id: 'u1', role: 'ADMIN' } });
      renderGuard({ _id: 'u1', role: 'ADMIN' }, ['ADMIN']);
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('renders the child route for MANAGER when MANAGER is in allowedRoles', () => {
      mockUseAuthStore.mockReturnValue({ user: { _id: 'u2', role: 'MANAGER' } });
      renderGuard({ _id: 'u2', role: 'MANAGER' }, ['ADMIN', 'MANAGER']);
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  describe('when user lacks the required role', () => {
    it('redirects to /unauthorized for CUSTOMER trying to access ADMIN route', () => {
      mockUseAuthStore.mockReturnValue({ user: { _id: 'u3', role: 'CUSTOMER' } });
      renderGuard({ _id: 'u3', role: 'CUSTOMER' }, ['ADMIN']);
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Admin Panel')).toBeNull();
    });
  });

  describe('when user is null', () => {
    it('redirects to /unauthorized', () => {
      mockUseAuthStore.mockReturnValue({ user: null });
      renderGuard(null, ['ADMIN']);
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });
});
