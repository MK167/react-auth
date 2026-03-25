import { render } from '@testing-library/react';
import { Spinner } from '@/components/auth/common/spinner/Spinner';

describe('Spinner', () => {
  it('renders a spinning div', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.tagName).toBe('DIV');
    expect(spinner.className).toContain('animate-spin');
  });

  it('renders exactly one element', () => {
    const { container } = render(<Spinner />);
    expect(container.childNodes).toHaveLength(1);
  });
});
