import { render } from '@testing-library/react';
import { FacebookIcon } from '@/components/auth/common/icons/FacebookIcon';

describe('FacebookIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<FacebookIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is aria-hidden for accessibility', () => {
    const { container } = render(<FacebookIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with correct dimensions', () => {
    const { container } = render(<FacebookIcon />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });
});
