import { render } from '@testing-library/react';
import { GoogleIcon } from '@/components/auth/common/icons/GoogleIcon';

describe('GoogleIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<GoogleIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is aria-hidden for accessibility', () => {
    const { container } = render(<GoogleIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with correct dimensions', () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });
});
