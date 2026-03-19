/**
 * @fileoverview Default error configuration bundle.
 *
 * A JSON-serializable copy of ERROR_CONFIG_MAP. This bundle is:
 * 1. Served by the mock server at `GET /content/default-error` (LOCAL mode)
 *    and `GET /content/default-error-be` (BACKEND mode).
 * 2. Fetched during AppInitializer startup and stored in init.store.
 * 3. Used by error.store.pushError() at runtime to override the static config
 *    (enabling backend-driven error config without a frontend deploy).
 *
 * @module core/errors/default-error
 */

/**
 * Portable (JSON-safe) error configuration bundle.
 * Mirrors the shape of ERROR_CONFIG_MAP without function-type fields.
 */
export const defaultErrorBundle = {
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    displayMode: 'PAGE',
    iconName: 'PackageX',
    iconBgClass: 'bg-orange-100 dark:bg-orange-900/30',
    iconColorClass: 'text-orange-500 dark:text-orange-400',
    titleKey: 'errors.orderNotFound.title',
    descriptionKey: 'errors.orderNotFound.description',
    primaryAction: { label: 'View All Orders', redirectTo: '/orders', variant: 'primary' },
    secondaryAction: { label: 'Go Home', redirectTo: '/', variant: 'secondary' },
  },
  PRODUCT_NOT_FOUND: {
    code: 'PRODUCT_NOT_FOUND',
    displayMode: 'PAGE',
    iconName: 'ShoppingBag',
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-500 dark:text-purple-400',
    titleKey: 'errors.productNotFound.title',
    descriptionKey: 'errors.productNotFound.description',
    primaryAction: { label: 'Browse Products', redirectTo: '/products', variant: 'primary' },
    secondaryAction: { label: 'Go Home', redirectTo: '/', variant: 'secondary' },
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    displayMode: 'PAGE',
    iconName: 'ShieldX',
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-500 dark:text-red-400',
    titleKey: 'errors.unauthorized.title',
    descriptionKey: 'errors.unauthorized.description',
    primaryAction: { label: 'Go Home', redirectTo: '/', variant: 'primary' },
    secondaryAction: { label: 'Sign In', redirectTo: '/login', variant: 'secondary' },
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    displayMode: 'PAGE',
    iconName: 'Lock',
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-500 dark:text-red-400',
    titleKey: 'errors.forbidden.title',
    descriptionKey: 'errors.forbidden.description',
    primaryAction: { label: 'Go Home', redirectTo: '/', variant: 'primary' },
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    displayMode: 'MODAL',
    iconName: 'Clock',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-500 dark:text-amber-400',
    titleKey: 'errors.sessionExpired.title',
    descriptionKey: 'errors.sessionExpired.description',
    primaryAction: { label: 'Sign In Again', redirectTo: '/login', variant: 'primary' },
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    displayMode: 'PAGE',
    iconName: 'ServerCrash',
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-500 dark:text-red-400',
    titleKey: 'errors.serverError.title',
    descriptionKey: 'errors.serverError.description',
    primaryAction: { label: 'Try Again', variant: 'primary' },
    secondaryAction: { label: 'Go Home', redirectTo: '/', variant: 'secondary' },
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    displayMode: 'PAGE',
    iconName: 'WifiOff',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-500 dark:text-amber-400',
    titleKey: 'errors.networkError.title',
    descriptionKey: 'errors.networkError.description',
    primaryAction: { label: 'Try Again', variant: 'primary' },
    secondaryAction: { label: 'Go Home', redirectTo: '/', variant: 'secondary' },
  },
  FEATURE_DISABLED: {
    code: 'FEATURE_DISABLED',
    displayMode: 'PAGE',
    iconName: 'Zap',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-500 dark:text-gray-400',
    titleKey: 'errors.featureDisabled.title',
    descriptionKey: 'errors.featureDisabled.description',
    primaryAction: { label: 'Go Back', variant: 'primary' },
    secondaryAction: { label: 'Go Home', redirectTo: '/', variant: 'secondary' },
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    displayMode: 'TOAST',
    iconName: 'AlertCircle',
    iconBgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColorClass: 'text-yellow-600 dark:text-yellow-400',
    titleKey: 'errors.validationError.title',
    descriptionKey: 'errors.validationError.description',
  },
  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    displayMode: 'PAGE',
    iconName: 'SearchX',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-500 dark:text-gray-400',
    titleKey: 'errors.resourceNotFound.title',
    descriptionKey: 'errors.resourceNotFound.description',
    primaryAction: { label: 'Go Back', variant: 'primary' },
    secondaryAction: { label: 'Go Home', redirectTo: '/', variant: 'secondary' },
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    displayMode: 'TOAST',
    iconName: 'AlertTriangle',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-500 dark:text-gray-400',
    titleKey: 'errors.unknownError.title',
    descriptionKey: 'errors.unknownError.description',
  },
} as const;

export type ErrorBundle = typeof defaultErrorBundle;
