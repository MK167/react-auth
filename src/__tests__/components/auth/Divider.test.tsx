import { render, screen } from '@testing-library/react';
import Divider from '@/components/auth/Divider';

describe('Divider', () => {
  it('renders the OR label', () => {
    render(<Divider />);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders two divider lines flanking the label', () => {
    const { container } = render(<Divider />);
    // The flex container has 3 children: line, text, line
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.children).toHaveLength(3);
  });
});
