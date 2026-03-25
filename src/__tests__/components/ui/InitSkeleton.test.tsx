import { render, screen } from '@testing-library/react';
import InitSkeleton from '@/components/ui/InitSkeleton';

describe('InitSkeleton', () => {
  it('renders the ShopHub brand name', () => {
    render(<InitSkeleton />);
    expect(screen.getByText('ShopHub')).toBeInTheDocument();
  });

  it('renders a Loading… indicator', () => {
    render(<InitSkeleton />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders the initializing hint text', () => {
    render(<InitSkeleton />);
    expect(screen.getByText('Initializing content bundles…')).toBeInTheDocument();
  });

  it('has aria-busy="true"', () => {
    const { container } = render(<InitSkeleton />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });

  it('has aria-live="polite" for screen readers', () => {
    const { container } = render(<InitSkeleton />);
    expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the SVG logo icon', () => {
    const { container } = render(<InitSkeleton />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
