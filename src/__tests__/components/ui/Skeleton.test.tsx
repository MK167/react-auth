import { render, screen } from '@testing-library/react';
import { Skeleton, ProductCardSkeleton, TableRowSkeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders a div with animate-pulse', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('is aria-hidden', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies additional className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-32');
  });
});

describe('ProductCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('is aria-hidden', () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders multiple skeleton blocks inside', () => {
    const { container } = render(<ProductCardSkeleton />);
    // Has image block + multiple body blocks
    const pulseBlocks = container.querySelectorAll('.animate-pulse');
    expect(pulseBlocks.length).toBeGreaterThan(1);
  });
});

describe('TableRowSkeleton', () => {
  it('renders a <tr> element', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>,
    );
    expect(container.querySelector('tr')).toBeInTheDocument();
  });

  it('is aria-hidden', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>,
    );
    expect(container.querySelector('tr')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders 7 table cells', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>,
    );
    expect(container.querySelectorAll('td')).toHaveLength(7);
  });
});
