import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Unauthorized from '@/pages/Unauthorized';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }));

import { useAuthStore } from '@/store/auth.store';
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

function renderPage(user: object | null = null) {
  mockUseAuthStore.mockReturnValue({ user });
  return render(<MemoryRouter><Unauthorized /></MemoryRouter>);
}

describe('Unauthorized', () => {
  it('renders "Access denied" heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  });

  it('shows the user role when available', () => {
    renderPage({ _id: 'u1', role: 'CUSTOMER' });
    expect(screen.getByText('CUSTOMER')).toBeInTheDocument();
  });

  it('renders Go back and Go to my dashboard buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to my dashboard/i })).toBeInTheDocument();
  });
});
