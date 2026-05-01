import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NotFound from '@/pages/NotFound';

vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: vi.fn() }));

describe('NotFound', () => {
  it('renders the 404 heading', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('renders the large "404" display text', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders Go back and Return home buttons', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument();
  });
});
