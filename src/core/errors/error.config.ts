/**
 * @fileoverview Static error configuration map.
 *
 * Each entry maps an `ErrorCode` to its full `ErrorConfig` — the canonical
 * source of truth for how every error is displayed across the application.
 *
 * ## How to add a new error code
 *
 * 1. Add the code to the `ErrorCode` union in `error.types.ts`.
 * 2. Add a matching entry here with display mode, icon, and i18n keys.
 * 3. Add the `titleKey` and `descriptionKey` strings to every locale file
 *    under `src/i18n/locales/`.
 * 4. Use `useErrorStore().pushError('YOUR_NEW_CODE')` wherever the error
 *    can be triggered.
 *
 * ## Module-level display mode overrides
 *
 * Individual call sites can override the default display mode at push time:
 * ```ts
 * useErrorStore.getState().pushError('SERVER_ERROR', {
 *   displayModeOverride: 'TOAST', // show as toast instead of full page
 * });
 * ```
 *
 * @module core/errors/error.config
 */

import type { ErrorCode, ErrorConfig } from './error.types';

// ---------------------------------------------------------------------------
// Config map
// ---------------------------------------------------------------------------

/**
 * Central registry of all error configurations.
 *
 * Keys match `ErrorCode` values exactly. Look up via:
 * ```ts
 * const config = ERROR_CONFIG_MAP[code];
 * ```
 */
export const ERROR_CONFIG_MAP: Record<ErrorCode, ErrorConfig> = {
  // ── Order errors ─────────────────────────────────────────────────────────

  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    displayMode: 'PAGE',
    iconName: 'PackageX',
    iconBgClass: 'bg-orange-100 dark:bg-orange-900/30',
    iconColorClass: 'text-orange-500 dark:text-orange-400',
    titleKey: 'errors.orderNotFound.title',
    descriptionKey: 'errors.orderNotFound.description',
    primaryAction: {
      label: 'View All Orders',
      redirectTo: '/orders',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'secondary',
    },
  },

  // ── Product errors ────────────────────────────────────────────────────────

  PRODUCT_NOT_FOUND: {
    code: 'PRODUCT_NOT_FOUND',
    displayMode: 'PAGE',
    iconName: 'ShoppingBag',
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-500 dark:text-purple-400',
    titleKey: 'errors.productNotFound.title',
    descriptionKey: 'errors.productNotFound.description',
    primaryAction: {
      label: 'Browse Products',
      redirectTo: '/products',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'secondary',
    },
  },

  // ── Auth errors ───────────────────────────────────────────────────────────

  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    displayMode: 'PAGE',
    iconName: 'ShieldX',
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-500 dark:text-red-400',
    titleKey: 'errors.unauthorized.title',
    descriptionKey: 'errors.unauthorized.description',
    primaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Sign In',
      redirectTo: '/login',
      variant: 'secondary',
    },
  },

  FORBIDDEN: {
    code: 'FORBIDDEN',
    displayMode: 'PAGE',
    iconName: 'Lock',
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-500 dark:text-red-400',
    titleKey: 'errors.forbidden.title',
    descriptionKey: 'errors.forbidden.description',
    primaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'primary',
    },
  },

  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    displayMode: 'MODAL',
    iconName: 'Clock',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-500 dark:text-amber-400',
    titleKey: 'errors.sessionExpired.title',
    descriptionKey: 'errors.sessionExpired.description',
    primaryAction: {
      label: 'Sign In Again',
      redirectTo: '/login',
      variant: 'primary',
    },
  },

  // ── Infrastructure errors ─────────────────────────────────────────────────

  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    displayMode: 'PAGE',
    iconName: 'ServerCrash',
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-500 dark:text-red-400',
    titleKey: 'errors.serverError.title',
    descriptionKey: 'errors.serverError.description',
    primaryAction: {
      label: 'Try Again',
      variant: 'primary',
      // No redirectTo — caller injects onRetry callback at push time
    },
    secondaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'secondary',
    },
  },

  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    displayMode: 'PAGE',
    iconName: 'WifiOff',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-500 dark:text-amber-400',
    titleKey: 'errors.networkError.title',
    descriptionKey: 'errors.networkError.description',
    primaryAction: {
      label: 'Try Again',
      variant: 'primary',
      // No redirectTo — caller injects onRetry callback
    },
    secondaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'secondary',
    },
  },

  // ── Feature flags ─────────────────────────────────────────────────────────

  FEATURE_DISABLED: {
    code: 'FEATURE_DISABLED',
    displayMode: 'PAGE',
    iconName: 'Zap',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-500 dark:text-gray-400',
    titleKey: 'errors.featureDisabled.title',
    descriptionKey: 'errors.featureDisabled.description',
    primaryAction: {
      label: 'Go Back',
      variant: 'primary',
      // No redirectTo — handled by onRetry = navigate(-1) at push time
    },
    secondaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'secondary',
    },
  },

  // ── Validation errors ─────────────────────────────────────────────────────

  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    displayMode: 'TOAST',
    iconName: 'AlertCircle',
    iconBgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColorClass: 'text-yellow-600 dark:text-yellow-400',
    titleKey: 'errors.validationError.title',
    descriptionKey: 'errors.validationError.description',
  },

  // ── Generic resource not found ─────────────────────────────────────────────

  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    displayMode: 'PAGE',
    iconName: 'SearchX',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-500 dark:text-gray-400',
    titleKey: 'errors.resourceNotFound.title',
    descriptionKey: 'errors.resourceNotFound.description',
    primaryAction: {
      label: 'Go Back',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Go Home',
      redirectTo: '/',
      variant: 'secondary',
    },
  },

  // ── Fallback ──────────────────────────────────────────────────────────────

  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    displayMode: 'TOAST',
    iconName: 'AlertTriangle',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-500 dark:text-gray-400',
    titleKey: 'errors.unknownError.title',
    descriptionKey: 'errors.unknownError.description',
  },
};
