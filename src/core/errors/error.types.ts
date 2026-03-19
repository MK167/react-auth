/**
 * @fileoverview Core error type definitions for the global error system.
 *
 * ## Architecture overview
 *
 * Every user-visible error in the application flows through this type system:
 *
 * ```
 * Raw error (Axios / JS / Route guard)
 *   │
 *   ▼
 * error.handler.ts → resolves to ErrorCode
 *   │
 *   ▼
 * error.config.ts  → looks up ErrorConfig (display mode, icon, i18n keys)
 *   │
 *   ▼
 * error.store.ts   → routes to pageError | modalError | toastQueue | inlineError
 *   │
 *   ▼
 * GlobalErrorRenderer.tsx → renders the appropriate UI
 * ```
 *
 * ## Display modes
 *
 * - `PAGE`   — fullscreen overlay replacing page content (critical errors)
 * - `INLINE` — small error banner inside a component (form/section-level)
 * - `MODAL`  — dialog overlay, user must dismiss (action-required errors)
 * - `TOAST`  — transient notification, auto-dismisses (non-critical)
 *
 * @module core/errors/error.types
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * All recognized application-level error codes.
 *
 * Using a union of string literals instead of an enum keeps this compatible
 * with `erasableSyntaxOnly: true` in tsconfig (no TypeScript-only enums).
 */
export type ErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'FEATURE_DISABLED'
  | 'VALIDATION_ERROR'
  | 'SESSION_EXPIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'UNKNOWN_ERROR';

// ---------------------------------------------------------------------------
// Display mode
// ---------------------------------------------------------------------------

/**
 * Where and how an error is rendered.
 *
 * - `PAGE`   — fullscreen, replaces page content, drives to error page view
 * - `INLINE` — rendered inside the component that encountered the error
 * - `MODAL`  — modal dialog overlay, blocks interaction until dismissed
 * - `TOAST`  — transient bottom/top notification, auto-expires
 */
export type ErrorDisplayMode = 'PAGE' | 'INLINE' | 'MODAL' | 'TOAST';

// ---------------------------------------------------------------------------
// Error action button
// ---------------------------------------------------------------------------

/**
 * A single action button attached to an error display.
 *
 * Exactly one of `redirectTo` or `onClick` should be provided:
 * - `redirectTo` — router navigation on click (use for links to other pages)
 * - `onClick`    — inline callback (use for retry, dismiss, or custom logic)
 *
 * If both are provided, `onClick` takes precedence.
 */
export type ErrorActionButton = {
  /** Button label text */
  label: string;
  /** Visual style of the button */
  variant: 'primary' | 'secondary' | 'danger';
  /** Navigate to this path on click */
  redirectTo?: string;
  /** Callback invoked on click (overrides redirectTo) */
  onClick?: () => void;
};

// ---------------------------------------------------------------------------
// Error config (static definition per code)
// ---------------------------------------------------------------------------

/**
 * Static configuration for one error code, defined in `error.config.ts`.
 *
 * These are the **defaults** for an error code. Individual `pushError` calls
 * can override the display mode and inject a runtime retry callback.
 */
export type ErrorConfig = {
  /** The error code this config belongs to */
  code: ErrorCode;
  /**
   * Default display mode for this error.
   * Can be overridden per push via `PushErrorOptions.displayModeOverride`.
   */
  displayMode: ErrorDisplayMode;
  /** Lucide icon component name (e.g. 'WifiOff', 'ServerCrash') */
  iconName: string;
  /** Tailwind colour class for the icon wrapper background */
  iconBgClass: string;
  /** Tailwind colour class for the icon itself */
  iconColorClass: string;
  /** i18n key for the human-readable error title */
  titleKey: string;
  /** i18n key for the longer descriptive message */
  descriptionKey: string;
  /** Primary action button config (redirectTo is a static default) */
  primaryAction?: Omit<ErrorActionButton, 'onClick'>;
  /** Secondary action button config */
  secondaryAction?: Omit<ErrorActionButton, 'onClick'>;
};

// ---------------------------------------------------------------------------
// Active error instance (runtime, pushed to the store)
// ---------------------------------------------------------------------------

/**
 * A live error instance currently held in the error store.
 *
 * Created by `pushError()` when an error is triggered. Contains both the
 * static config and any runtime overrides supplied by the caller.
 */
export type ActiveError = {
  /** Unique ID for this error instance (used as React key / remove key) */
  id: string;
  /** The error code */
  code: ErrorCode;
  /** Resolved static config from error.config.ts */
  config: ErrorConfig;
  /** Effective display mode (override > config default) */
  displayMode: ErrorDisplayMode;
  /** Whether the user can manually dismiss this error */
  dismissible: boolean;
  /**
   * Optional retry callback injected at push time (e.g. re-fetch).
   * Displayed as a "Try again" button that supplements the config's primaryAction.
   */
  onRetry?: () => void;
  /** Unix timestamp (ms) when this error was pushed */
  timestamp: number;
  /** Auto-dismiss duration in ms (toast only; 0 = no auto-dismiss) */
  duration: number;
};

// ---------------------------------------------------------------------------
// pushError options
// ---------------------------------------------------------------------------

/**
 * Options passed to `useErrorStore().pushError(code, options)`.
 * All fields are optional — sensible defaults come from the error config.
 */
export type PushErrorOptions = {
  /** Override the default display mode defined in error.config.ts */
  displayModeOverride?: ErrorDisplayMode;
  /** Allow the user to manually close this error (default: true for toast/modal) */
  dismissible?: boolean;
  /** Retry callback — adds a "Try again" button to the error UI */
  onRetry?: () => void;
  /** Toast auto-dismiss duration in ms (default: 4000). 0 = stays until dismissed. */
  duration?: number;
};
