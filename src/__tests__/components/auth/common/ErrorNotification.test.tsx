import { render, screen } from '@testing-library/react';
import ErrorNotification from '@/components/auth/common/error-notification/ErrorNotification';

describe('ErrorNotification', () => {
  it('renders nothing when serverError is null', () => {
    const { container } = render(<ErrorNotification serverError={null} />);
    // Fragment renders empty when serverError is null
    expect(container.querySelector('[class]')).toBeNull();
  });

  it('renders the error message when serverError is provided', () => {
    render(<ErrorNotification serverError="Invalid credentials" />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows default "Error:" label when no text prop is provided', () => {
    render(<ErrorNotification serverError="Something went wrong" />);
    expect(screen.getByText('Error:')).toBeInTheDocument();
  });

  it('shows custom label when text prop is provided', () => {
    render(<ErrorNotification serverError="Network failure" text="Warning:" />);
    expect(screen.getByText('Warning:')).toBeInTheDocument();
  });

  it('renders error message alongside the label', () => {
    render(<ErrorNotification serverError="Oops" text="Alert:" />);
    expect(screen.getByText('Alert:')).toBeInTheDocument();
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });
});
