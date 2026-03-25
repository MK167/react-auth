import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/core/errors/error.store', () => ({ useErrorStore: vi.fn().mockReturnValue(vi.fn()) }));
vi.mock('@/core/errors/error.handler', () => ({
  handleError: vi.fn(),
  handleRouteError: vi.fn(),
}));

import ErrorPlaygroundPage from '@/pages/admin/ErrorPlaygroundPage';

describe('ErrorPlaygroundPage', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><ErrorPlaygroundPage /></MemoryRouter>);
    expect(document.body).toBeInTheDocument();
  });

  it('renders the playground heading', () => {
    render(<MemoryRouter><ErrorPlaygroundPage /></MemoryRouter>);
    expect(screen.getByText('Error Playground')).toBeInTheDocument();
  });
});
