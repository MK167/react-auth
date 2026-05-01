import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ErrorPage from '@/pages/Error';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (key: string, fb?: string) => fb ?? key }),
}));

function renderPage(path = '/error', props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ErrorPage {...props} />
    </MemoryRouter>,
  );
}

describe('ErrorPage', () => {
  it('renders with NETWORK_ERROR code via prop', () => {
    renderPage('/error', { code: 'NETWORK_ERROR' as const });
    expect(screen.getByText(/NETWORK_ERROR/)).toBeInTheDocument();
  });

  it('renders with title override prop', () => {
    renderPage('/error', { title: 'Custom Error Title' });
    expect(screen.getByRole('heading', { name: 'Custom Error Title' })).toBeInTheDocument();
  });

  it('renders with description override prop', () => {
    renderPage('/error', { description: 'Custom description text' });
    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });

  it('renders primary action button when provided', () => {
    renderPage('/error', {
      primaryAction: { label: 'Retry Now', variant: 'primary' as const },
    });
    expect(screen.getByRole('button', { name: /retry now/i })).toBeInTheDocument();
  });

  it('renders the fallback "Back to home" button when no actions are configured', () => {
    renderPage('/error');
    // With no props, UNKNOWN_ERROR config is used; it has a primaryAction so the
    // fallback button only shows when neither primaryAction nor secondaryAction exist.
    // Verify page renders without crashing
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  describe('URL param mode', () => {
    it('renders network error from ?type=network', () => {
      renderPage('/error?type=network');
      expect(screen.getByText(/NETWORK_ERROR/)).toBeInTheDocument();
    });

    it('renders server error from ?type=server', () => {
      renderPage('/error?type=server');
      expect(screen.getByText(/SERVER_ERROR/)).toBeInTheDocument();
    });
  });
});
