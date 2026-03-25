import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorBoundary } from '@/core/errors/ErrorBoundary';

// Suppress React's console.error output for intentional error throws in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Error:') || args[0].includes('The above error'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

// A component that throws on render when `shouldThrow` is true
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Safe Content</div>;
}

describe('ErrorBoundary', () => {
  describe('normal rendering', () => {
    it('renders children when no error is thrown', () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });
  });

  describe('when a render error is thrown', () => {
    it('shows the default fallback UI with "Something went wrong"', () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows "Try again" and "Go home" buttons', () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('resets and re-renders children when "Try again" is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );

      // Update children to non-throwing BEFORE resetting the boundary
      rerender(
        <ErrorBoundary>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>,
      );

      // Now click "Try again" — boundary resets and renders non-throwing children
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('renders a static ReactNode fallback instead of the default UI', () => {
      render(
        <ErrorBoundary fallback={<div>Custom Error UI</div>}>
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).toBeNull();
    });

    it('renders a function fallback and passes the error', () => {
      render(
        <ErrorBoundary fallback={(err) => <div>Error: {err.message}</div>}>
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Error: Test render error')).toBeInTheDocument();
    });
  });

  describe('onError callback', () => {
    it('calls the onError callback when an error is caught', () => {
      const onError = vi.fn();
      render(
        <ErrorBoundary onError={onError}>
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    });
  });

  describe('resetKey', () => {
    it('resets the error state when resetKey changes', () => {
      const { rerender } = render(
        <ErrorBoundary resetKey="page-a">
          <Bomb shouldThrow />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change resetKey to simulate a route change
      rerender(
        <ErrorBoundary resetKey="page-b">
          <Bomb shouldThrow={false} />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });
  });
});
