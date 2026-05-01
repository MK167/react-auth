/**
 * @fileoverview GlobalErrorRenderer — renders active errors from the error
 * store into the appropriate UI layer.
 *
 * ## What this component does
 *
 * Mounts once in `App.tsx` (above the router but inside BrowserRouter so
 * `useNavigate` is available). It subscribes to the global error store and
 * renders three types of error UI:
 *
 * | Store slot   | UI                          | Portal target        |
 * |--------------|-----------------------------|----------------------|
 * | `pageError`  | Fullscreen overlay          | document.body        |
 * | `modalError` | Centered dialog + backdrop  | document.body        |
 * | `toastQueue` | Bottom-right stacked toasts | document.body        |
 *
 * INLINE errors are NOT rendered here — they are consumed directly by the
 * component that triggered them.
 *
 * All three use `createPortal` so they render above every page layer
 * (z-index managed via Tailwind classes).
 *
 * @module core/errors/GlobalErrorRenderer
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  WifiOff, ServerCrash, AlertTriangle, ShieldX, Lock, Clock,
  PackageX, ShoppingBag, Zap, SearchX, AlertCircle,
  RefreshCw, Home, X, ArrowLeft,
} from 'lucide-react';
import { useErrorStore } from './error.store';
import { useI18n } from '@/i18n/use-i18n.hook';
import type { ActiveError } from './error.types';

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
  AlertCircle:   <AlertCircle size={20} strokeWidth={1.5} />,
};

function resolveIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName] ?? <AlertTriangle size={36} strokeWidth={1.5} />;
}

// ---------------------------------------------------------------------------
// Action handler hook (shared between PAGE and MODAL)
// ---------------------------------------------------------------------------

function useActionHandler(
  error: ActiveError | null,
  clearFn: () => void,
) {
  const navigate = useNavigate();

  const handlePrimary = () => {
    if (!error) return;
    if (error.onRetry) {
      error.onRetry();
    } else if (error.config.primaryAction?.redirectTo) {
      navigate(error.config.primaryAction.redirectTo);
      clearFn();
    } else {
      clearFn();
    }
  };

  const handleSecondary = () => {
    if (!error) return;
    if (error.config.secondaryAction?.redirectTo) {
      navigate(error.config.secondaryAction.redirectTo);
    }
    clearFn();
  };

  return { handlePrimary, handleSecondary };
}

// ---------------------------------------------------------------------------
// Page Error Overlay (fullscreen)
// ---------------------------------------------------------------------------

function PageErrorOverlay({ error }: { error: ActiveError }) {
  const { translate } = useI18n();
  const clearPageError = useErrorStore((s) => s.clearPageError);
  const { handlePrimary, handleSecondary } = useActionHandler(error, clearPageError);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the primary action button on mount for keyboard accessibility.
  useEffect(() => {
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  const { config } = error;
  const primaryLabel = error.onRetry
    ? translate('common.retry', 'Try again')
    : config.primaryAction?.label ?? translate('common.goHome', 'Go Home');

  return (
    <div
      className="fixed inset-0 z-[9990] bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
    >
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 sm:p-10">
          {/* Icon */}
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${config.iconBgClass} ${config.iconColorClass}`}
            aria-hidden="true"
          >
            {resolveIcon(config.iconName)}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {translate(config.titleKey)}
          </h1>

          {/* Description */}
          <p
            role="alert"
            className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 text-sm"
          >
            {translate(config.descriptionKey)}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Primary */}
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={handlePrimary}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {error.onRetry ? <RefreshCw size={14} /> : <Home size={14} />}
              {primaryLabel}
            </button>

            {/* Secondary */}
            {config.secondaryAction && (
              <button
                type="button"
                onClick={handleSecondary}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              >
                <ArrowLeft size={14} />
                {config.secondaryAction.label}
              </button>
            )}
          </div>

          {/* Debug info */}
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 font-mono">
            error_code: {error.code}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Error Dialog
// ---------------------------------------------------------------------------

function ModalErrorDialog({ error }: { error: ActiveError }) {
  const { translate } = useI18n();
  const clearModalError = useErrorStore((s) => s.clearModalError);
  const { handlePrimary, handleSecondary } = useActionHandler(error, clearModalError);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  // Close on Escape key.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && error.dismissible) clearModalError();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [error.dismissible, clearModalError]);

  const { config } = error;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center px-4"
      role="alertdialog"
      aria-modal="true"
    >
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={error.dismissible ? clearModalError : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center">
        {/* Dismiss button */}
        {error.dismissible && (
          <button
            type="button"
            onClick={clearModalError}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        {/* Icon */}
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${config.iconBgClass} ${config.iconColorClass}`}
          aria-hidden="true"
        >
          {resolveIcon(config.iconName)}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {translate(config.titleKey)}
        </h2>

        {/* Description */}
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
          {translate(config.descriptionKey)}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={handlePrimary}
            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {config.primaryAction?.label ?? 'OK'}
          </button>
          {config.secondaryAction && (
            <button
              type="button"
              onClick={handleSecondary}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {config.secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

function ToastItem({ error }: { error: ActiveError }) {
  const { translate } = useI18n();
  const removeToast = useErrorStore((s) => s.removeToast);

  // Auto-dismiss after `duration` ms.
  useEffect(() => {
    if (error.duration <= 0) return;
    const id = setTimeout(() => removeToast(error.id), error.duration);
    return () => clearTimeout(id);
  }, [error.id, error.duration, removeToast]);

  const { config } = error;
  const toastColorMap: Record<string, string> = {
    'text-red-500 dark:text-red-400':    'border-red-300 dark:border-red-700',
    'text-amber-500 dark:text-amber-400': 'border-amber-300 dark:border-amber-700',
    'text-yellow-600 dark:text-yellow-400': 'border-yellow-300 dark:border-yellow-700',
    'text-gray-500 dark:text-gray-400':   'border-gray-200 dark:border-gray-700',
  };
  const borderClass = toastColorMap[config.iconColorClass] ?? 'border-gray-200 dark:border-gray-700';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 w-full max-w-sm bg-white dark:bg-gray-800 border ${borderClass} rounded-xl shadow-lg px-4 py-3 pointer-events-auto animate-in slide-in-from-right-4 duration-300`}
    >
      {/* Icon */}
      <span className={`mt-0.5 flex-shrink-0 ${config.iconColorClass}`} aria-hidden="true">
        {resolveIcon(config.iconName)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {translate(config.titleKey)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
          {translate(config.descriptionKey)}
        </p>

        {/* Retry link */}
        {error.onRetry && (
          <button
            type="button"
            onClick={error.onRetry}
            className="mt-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw size={11} />
            {translate('common.retry', 'Try again')}
          </button>
        )}
      </div>

      {/* Dismiss */}
      {error.dismissible && (
        <button
          type="button"
          onClick={() => removeToast(error.id)}
          className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast container
// ---------------------------------------------------------------------------

function ToastContainer({ toasts }: { toasts: ActiveError[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} error={toast} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main GlobalErrorRenderer
// ---------------------------------------------------------------------------

/**
 * Mount once in `App.tsx` inside `BrowserRouter` but above the route tree.
 *
 * ```tsx
 * <BrowserRouter>
 *   <I18nProvider>
 *     <ThemeProvider>
 *       <GlobalLoader />
 *       <GlobalErrorRenderer />   ← here
 *       <AppRouter />
 *     </ThemeProvider>
 *   </I18nProvider>
 * </BrowserRouter>
 * ```
 */
export default function GlobalErrorRenderer() {
  const pageError  = useErrorStore((s) => s.pageError);
  const modalError = useErrorStore((s) => s.modalError);
  const toastQueue = useErrorStore((s) => s.toastQueue);

  return (
    <>
      {pageError  && createPortal(<PageErrorOverlay error={pageError} />, document.body)}
      {modalError && createPortal(<ModalErrorDialog error={modalError} />, document.body)}
      {createPortal(<ToastContainer toasts={toastQueue} />, document.body)}
    </>
  );
}
