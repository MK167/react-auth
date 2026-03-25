import { render } from '@testing-library/react';
import { MicrosoftIcon } from '@/components/auth/common/icons/Microsoft';

describe('MicrosoftIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<MicrosoftIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is aria-hidden for accessibility', () => {
    const { container } = render(<MicrosoftIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders four coloured quadrant paths', () => {
    const { container } = render(<MicrosoftIcon />);
    expect(container.querySelectorAll('path')).toHaveLength(4);
  });
});
