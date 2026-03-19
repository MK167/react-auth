/**
 * @fileoverview React Error Boundary — catches render-time JS errors in the
 * component tree and displays a graceful fallback instead of a white screen.
 *
 * ## Why a class component?
 *
 * React Error Boundaries must be class components because they use the
 * `componentDidCatch` and `getDerivedStateFromError` lifecycle methods, which
 * have no hook equivalents as of React 18. This is the only class component
 * in the codebase — all other components are functional.
 *
 * ## Usage
 *
 * ### Layout-level (recommended) — wraps an entire layout to catch errors
 * within a section of the app:
 * ```tsx
 * // AdminLayout.tsx
 * <ErrorBoundary>
 *   <Outlet />
 * </ErrorBoundary>
 * ```
 *
 * ### App-level — in App.tsx as the outermost safety net:
 * ```tsx
 * <ErrorBoundary fallback={<CriticalErrorPage />}>
 *   <AppRouter />
 * </ErrorBoundary>
 * ```
 *
 * ### Custom fallback:
 * ```tsx
 * <ErrorBoundary
 *   fallback={<p className="text-red-500">This section failed to load.</p>}
 * >
 *   <SomeRiskyComponent />
 * </ErrorBoundary>
 * ```
 *
 * ## Reset on navigation
 *
 * The error boundary resets its error state when the `resetKey` prop changes.
 * Pass `location.pathname` as `resetKey` to automatically recover when the
 * user navigates to a different page:
 *
 * ```tsx
 * const location = useLocation();
 * <ErrorBoundary resetKey={location.pathname}>
 *   <Outlet />
 * </ErrorBoundary>
 * ```
 *
 * @module core/errors/ErrorBoundary
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props & State
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  /** Component tree to protect */
  children: ReactNode;
  /**
   * Custom fallback UI. If not provided, the default error card is shown.
   * The fallback receives the caught error and a reset function.
   */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /**
   * When this prop changes value, the error boundary resets and re-renders
   * children. Pass `location.pathname` to reset on route change.
   */
  resetKey?: string;
  /**
   * Optional callback fired when an error is caught. Use for error logging
   * (e.g. Sentry.captureException, analytics events).
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------

function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8">
          {/* Icon */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 mb-5"
            aria-hidden="true"
          >
            <AlertTriangle size={30} strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>

          {/* Message */}
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            This section encountered an unexpected error. You can try again or
            return to the home page.
          </p>

          {/* Error detail (dev only) */}
          {import.meta.env.DEV && (
            <pre className="mb-6 text-left text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-red-500 overflow-auto max-h-32">
              {error.message}
            </pre>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RefreshCw size={14} />
              Try again
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Home size={14} />
              Go home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary class
// ---------------------------------------------------------------------------

/**
 * Class-based React Error Boundary. Catches render-time JavaScript errors in
 * its subtree and renders a fallback UI rather than crashing the whole app.
 *
 * Place at layout level (AdminLayout, UserLayout) for section-scoped recovery,
 * or at the App root level as a final safety net.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  /** Called synchronously after an error is thrown — updates state. */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /** Called after the render with the caught error and info. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Fire the optional error callback (for Sentry / analytics).
    this.props.onError?.(error, errorInfo);

    // In development, log the component stack for easier debugging.
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  /**
   * Reset when `resetKey` changes (e.g. user navigated to a new route).
   * This allows the boundary to recover after navigation without needing
   * a manual "Try again" click.
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.reset();
    }
  }

  /** Manually reset the error state so children re-render. */
  reset(): void {
    this.setState({ hasError: false, error: null });
  }

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const { fallback } = this.props;

    // Custom fallback — function form receives error + reset callback.
    if (typeof fallback === 'function') {
      return fallback(this.state.error, this.reset);
    }

    // Custom fallback — static ReactNode.
    if (fallback !== undefined) {
      return fallback;
    }

    // Default fallback UI.
    return (
      <DefaultErrorFallback
        error={this.state.error}
        onReset={this.reset}
      />
    );
  }
}

export default ErrorBoundary;
