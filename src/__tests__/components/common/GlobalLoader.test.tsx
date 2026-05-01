import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import GlobalLoader from '@/components/common/GlobalLoader';

// Mock the ui store so we can control activeApiRequestsCount in tests
vi.mock('@/store/ui.store', () => ({
  useUiStore: vi.fn(),
}));

import { useUiStore } from '@/store/ui.store';
const mockUseUiStore = useUiStore as unknown as ReturnType<typeof vi.fn>;

describe('GlobalLoader', () => {
  it('is hidden when no API requests are active and show is not set', () => {
    mockUseUiStore.mockReturnValue(false); // activeApiRequestsCount > 0 === false
    const { container } = render(<GlobalLoader />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('opacity-0');
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('is visible when activeApiRequestsCount > 0', () => {
    mockUseUiStore.mockReturnValue(true); // counter > 0
    const { container } = render(<GlobalLoader />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('opacity-100');
    expect(overlay).not.toHaveClass('pointer-events-none');
  });

  it('is visible when show prop is true regardless of store', () => {
    mockUseUiStore.mockReturnValue(false);
    const { container } = render(<GlobalLoader show />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('opacity-100');
  });

  it('is hidden when show prop is false', () => {
    mockUseUiStore.mockReturnValue(true);
    const { container } = render(<GlobalLoader show={false} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('opacity-0');
  });

  it('has role="status" for accessibility', () => {
    mockUseUiStore.mockReturnValue(false);
    render(<GlobalLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label="Loading"', () => {
    mockUseUiStore.mockReturnValue(false);
    render(<GlobalLoader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('sets aria-busy to true when loading', () => {
    mockUseUiStore.mockReturnValue(true);
    render(<GlobalLoader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('sets aria-busy to false when not loading', () => {
    mockUseUiStore.mockReturnValue(false);
    render(<GlobalLoader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
  });

  it('renders "Loading…" text', () => {
    mockUseUiStore.mockReturnValue(false);
    render(<GlobalLoader />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders visually-hidden sr-only text', () => {
    mockUseUiStore.mockReturnValue(false);
    render(<GlobalLoader />);
    expect(screen.getByText('Loading, please wait')).toBeInTheDocument();
  });
});
