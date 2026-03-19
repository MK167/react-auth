/**
 * @fileoverview Reusable Error Page component.
 *
 * ## Two rendering modes
 *
 * ### 1. URL-param mode (hard navigation from Axios interceptor)
 *
 * The Axios interceptor previously navigated here via `window.location.assign()`.
 * This mode is kept for backwards-compatibility when direct URL access is needed:
 *
 * ```
 * /error?type=network  → Connection Error
 * /error?type=server   → Server Error
 * /error               → Unknown error
 * ```
 *
 * ### 2. Prop mode (programmatic render from GlobalErrorRenderer or tests)
 *
 * Pass props directly to display any error without URL navigation:
 *
 * ```tsx
 * <ErrorPage
 *   code="ORDER_NOT_FOUND"
 *   primaryAction={{ label: 'View Orders', redirectTo: '/orders', variant: 'primary' }}
 * />
 * ```
 *
 * Props take precedence over URL params. If neither is provided, falls back to
 * the `?type=` URL param, then to the `unknown` fallback.
 *
 * ## Used by
 *
 * - The `/error` route (URL-param mode, direct navigation)
 * - `GlobalErrorRenderer` PAGE overlay (prop mode)
 * - `ErrorPlaygroundPage` preview panel (prop mode)
 *
 * @module pages/Error
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  WifiOff, ServerCrash, AlertTriangle, ShieldX, Lock, Clock,
  PackageX, ShoppingBag, Zap, SearchX, AlertCircle,
  RefreshCw, Home, ArrowLeft,
} from 'lucide-react';
import { ERROR_CONFIG_MAP } from '@/core/errors/error.config';
import type { ErrorCode } from '@/core/errors/error.types';
import type { ErrorActionButton } from '@/core/errors/error.types';
import { useI18n } from '@/i18n/i18n.context';

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ReactNode> = {
  WifiOff:       <WifiOff size={36} strokeWidth={1.5} />,
  ServerCrash:   <ServerCrash size={36} strokeWidth={1.5} />,
  AlertTriangle: <AlertTriangle size={36} strokeWidth={1.5} />,
  ShieldX:       <ShieldX size={36} strokeWidth={1.5} />,
  Lock:          <Lock size={36} strokeWidth={1.5} />,
  Clock:         <Clock size={36} strokeWidth={1.5} />,
  PackageX:      <PackageX size={36} strokeWidth={1.5} />,
  ShoppingBag:   <ShoppingBag size={36} strokeWidth={1.5} />,
  Zap:           <Zap size={36} strokeWidth={1.5} />,
  SearchX:       <SearchX size={36} strokeWidth={1.5} />,
  AlertCircle:   <AlertCircle size={36} strokeWidth={1.5} />,
};

// ---------------------------------------------------------------------------
// Legacy URL-param type → ErrorCode mapping
// ---------------------------------------------------------------------------

type LegacyType = 'network' | 'server' | 'unknown';

const LEGACY_TYPE_MAP: Record<LegacyType, ErrorCode> = {
  network: 'NETWORK_ERROR',
  server:  'SERVER_ERROR',
  unknown: 'UNKNOWN_ERROR',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for programmatic rendering. All optional — when not provided, the
 * component falls back to the `?type=` URL param or the `unknown` fallback.
 */
export interface ErrorPageProps {
  /**
   * An error code from `ERROR_CONFIG_MAP`. When provided, all display
   * properties (icon, title, description, actions) are loaded from config.
   * Individual prop overrides still take precedence over config values.
   */
  code?: ErrorCode;
  /** Override the icon element directly */
  icon?: React.ReactNode;
  /** Override the icon background Tailwind class */
  iconBgClass?: string;
  /** Override the icon colour Tailwind class */
  iconColorClass?: string;
  /** Override the title text */
  title?: string;
  /** Override the description text */
  description?: string;
  /** Primary action button */
  primaryAction?: ErrorActionButton;
  /** Secondary action button */
  secondaryAction?: ErrorActionButton;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reusable error page component. Works both as a standalone route page
 * (`/error?type=...`) and as a directly rendered component with props.
 *
 * @example Programmatic:
 * ```tsx
 * <ErrorPage code="ORDER_NOT_FOUND" />
 * ```
 *
 * @example With action override:
 * ```tsx
 * <ErrorPage
 *   code="SERVER_ERROR"
 *   primaryAction={{ label: 'Retry', variant: 'primary', onClick: handleRetry }}
 * />
 * ```
 */
export default function ErrorPage(props: ErrorPageProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  // ── Resolve the error config ─────────────────────────────────────────────

  // 1. Code prop → config map
  const configFromCode = props.code ? ERROR_CONFIG_MAP[props.code] : null;

  // 2. Legacy URL param fallback
  const rawType = searchParams.get('type') as LegacyType | null;
  const legacyCode = rawType && rawType in LEGACY_TYPE_MAP
    ? LEGACY_TYPE_MAP[rawType]
    : 'UNKNOWN_ERROR';
  const configFromUrl = ERROR_CONFIG_MAP[legacyCode];

  // Effective config: prop code > URL param > fallback
  const config = configFromCode ?? configFromUrl;

  // ── Resolve display values (prop overrides > config > fallback) ───────────

  const icon = props.icon ?? ICON_MAP[config.iconName] ?? <AlertTriangle size={36} strokeWidth={1.5} />;
  const iconBgClass    = props.iconBgClass    ?? config.iconBgClass;
  const iconColorClass = props.iconColorClass ?? config.iconColorClass;
  const title          = props.title          ?? t(config.titleKey);
  const description    = props.description    ?? t(config.descriptionKey);

  const primaryAction: ErrorActionButton | undefined =
    props.primaryAction ?? (config.primaryAction
      ? { ...config.primaryAction }
      : undefined);

  const secondaryAction: ErrorActionButton | undefined =
    props.secondaryAction ?? (config.secondaryAction
      ? { ...config.secondaryAction }
      : undefined);

  // Focus the primary button on mount for keyboard accessibility.
  useEffect(() => {
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, []);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleAction = (action: ErrorActionButton) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.redirectTo) {
      navigate(action.redirectTo, { replace: true });
    } else {
      // Default retry: go back or reload.
      if (legacyCode === 'NETWORK_ERROR' || props.code === 'NETWORK_ERROR') {
        window.history.back();
      } else {
        window.location.reload();
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4"
      aria-live="assertive"
    >
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 sm:p-10">
          {/* Icon */}
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${iconBgClass} ${iconColorClass}`}
            aria-hidden="true"
          >
            {icon}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {title}
          </h1>

          {/* Description */}
          <p
            role="alert"
            className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 text-sm"
          >
            {description}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {primaryAction && (
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={() => handleAction(primaryAction)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <RefreshCw size={15} />
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={() => handleAction(secondaryAction)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              >
                {secondaryAction.redirectTo === '/' ? (
                  <Home size={15} />
                ) : (
                  <ArrowLeft size={15} />
                )}
                {secondaryAction.label}
              </button>
            )}
            {!primaryAction && !secondaryAction && (
              // Fallback when no actions are configured
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Home size={15} />
                Back to home
              </button>
            )}
          </div>

          {/* Debug footer */}
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 font-mono">
            error_code: {props.code ?? legacyCode}
          </p>
        </div>
      </div>
    </div>
  );
}
