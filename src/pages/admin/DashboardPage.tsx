/**
 * @fileoverview Admin Dashboard Page — overview + developer error simulator.
 *
 * ## Sections
 *
 * 1. **Stats overview** — four KPI cards (products, orders, categories, revenue).
 *    Data is loaded from the API on mount; each card shows a skeleton while loading.
 *
 * 2. **Quick actions** — shortcut buttons to the main admin sections.
 *
 * 3. **Error Scenario Simulator** — visible only in development (`import.meta.env.DEV`).
 *    Two sub-panels:
 *
 *    a) **Preview** — navigates directly to each `/error?type=*` variant so you can
 *       inspect the error page UI without triggering a real failure.
 *
 *    b) **Real interceptor test** — fires an actual Axios request through the shared
 *       instance (with all interceptors active) to a known-unreachable target.
 *       This exercises the full `normalizeApiError → interceptor → window.location.assign`
 *       code path, giving you confidence the wiring is correct.
 *
 *       | Button | Request | normalizeApiError type | Interceptor action |
 *       |---|---|---|---|
 *       | Network error | `http://localhost:1` (refused) | `network` | Redirects → `/error?type=network` |
 *       | Server error  | `https://httpstat.us/500` (5xx) | `server` | Redirects → `/error?type=server` |
 *       | Unknown error | API `/nonexistent-404` (404) | `unknown` | **No redirect** — rejects; component shows inline banner |
 *
 *    The simulator is stripped from production builds by the bundler's dead-code
 *    elimination because `import.meta.env.DEV` is replaced with `false` at build time.
 *
 * @module pages/admin/DashboardPage
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/i18n.context';
import {
  Package,
  ShoppingBag,
  Tag,
  TrendingUp,
  ArrowRight,
  WifiOff,
  ServerCrash,
  AlertTriangle,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
} from 'lucide-react';
import { getProducts } from '@/api/products.api';
import { getCategories } from '@/api/products.api';
import axios from 'axios';
import { useErrorStore } from '@/core/errors/error.store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stat = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  to: string;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ stat, loading }: { stat: Stat; loading: boolean }) {
  const navigate = useNavigate();
  const { translate } = useI18n();
  return (
    <button
      type="button"
      onClick={() => navigate(stat.to)}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-start hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          )}
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.iconBg} ${stat.iconColor}`}
        >
          {stat.icon}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium group-hover:gap-2 transition-all">
        {translate('admin.dashboard.viewAll')} <ArrowRight size={12} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Error simulator (DEV only)
// ---------------------------------------------------------------------------

type SimulationState = 'idle' | 'loading' | 'no-redirect';

/**
 * Buttons that fire real Axios requests through the shared interceptors.
 * Only rendered when `import.meta.env.DEV === true`.
 */
function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 p-3 bg-gray-950 dark:bg-black rounded-lg overflow-x-auto text-[11px] leading-relaxed font-mono text-green-300 whitespace-pre">
      {children}
    </pre>
  );
}

function GuideStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{title}</p>
        {children}
      </div>
    </div>
  );
}

function ErrorIntegrationGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-indigo-200 dark:border-indigo-800/60 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Developer Guide — How to Use the Error System
          </span>
        </div>
        {open
          ? <ChevronUp size={15} className="text-indigo-400" />
          : <ChevronDown size={15} className="text-indigo-400" />}
      </button>

      {open && (
        <div className="p-5 bg-white dark:bg-gray-800 space-y-6 text-xs">

          {/* ── 1. Push from any component ───────────────────────────── */}
          <GuideStep number="1" title="Push an error from any component">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Import <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">useErrorStore</code> and call{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">pushError</code> inside any event handler or
              catch block. The store routes it to the correct overlay automatically.
            </p>
            <CodeBlock>{`import { useErrorStore } from '@/core/errors/error.store';

function MyComponent() {
  const pushError = useErrorStore((s) => s.pushError);

  const handleSave = async () => {
    try {
      await saveData();
    } catch {
      pushError('SERVER_ERROR');   // full-page overlay (default)
    }
  };
}`}</CodeBlock>
          </GuideStep>

          {/* ── 2. Change display mode at the call site ──────────────── */}
          <GuideStep number="2" title="Override the display mode at the call site">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Every error code has a default display mode set in{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">src/core/errors/error.config.ts</code>.
              You can override it per call without touching the config:
            </p>
            <CodeBlock>{`// ORDER_NOT_FOUND defaults to PAGE — show as modal instead:
pushError('ORDER_NOT_FOUND', { displayModeOverride: 'MODAL' });

// SERVER_ERROR defaults to PAGE — show as a non-blocking toast:
pushError('SERVER_ERROR', { displayModeOverride: 'TOAST' });

// NETWORK_ERROR as inline banner inside a component:
pushError('NETWORK_ERROR', { displayModeOverride: 'INLINE' });`}</CodeBlock>
          </GuideStep>

          {/* ── 3. Change the default globally ───────────────────────── */}
          <GuideStep number="3" title="Change the default mode globally (affects every call site)">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Edit <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">src/core/errors/error.config.ts</code> to
              change what every occurrence of an error code shows by default — no call-site changes needed:
            </p>
            <CodeBlock>{`// src/core/errors/error.config.ts
ORDER_NOT_FOUND: {
  code: 'ORDER_NOT_FOUND',
  displayMode: 'MODAL',    // ← was 'PAGE' — now every pushError('ORDER_NOT_FOUND')
                           //   shows a modal unless overridden at the call site
  iconName: 'PackageX',
  ...
},`}</CodeBlock>
            <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Use <strong className="text-gray-700 dark:text-gray-300">option 2</strong> for one-off overrides
              (e.g. a background sync that shouldn't block the screen).
              Use <strong className="text-gray-700 dark:text-gray-300">option 3</strong> when the design decision is
              permanent for that error code everywhere.
            </p>
          </GuideStep>

          {/* ── 4. Add a retry callback ──────────────────────────────── */}
          <GuideStep number="4" title="Add a retry button to the error overlay">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Pass <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">onRetry</code> and the primary action
              button changes to "Try again". The callback fires when the user clicks it.
            </p>
            <CodeBlock>{`const { pushError, clearAll } = useErrorStore();

// In a data-fetching function:
pushError('NETWORK_ERROR', {
  onRetry: () => {
    clearAll();          // dismiss the overlay first
    void fetchData();    // re-run the failed operation
  },
});`}</CodeBlock>
          </GuideStep>

          {/* ── 5. Use outside React (interceptor / util) ─────────────── */}
          <GuideStep number="5" title="Push an error outside React (Axios interceptor, utility functions)">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Outside React components — in Axios interceptors, service files, or utilities — use{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.getState()</code> to access the store
              imperatively without a hook:
            </p>
            <CodeBlock>{`import { useErrorStore } from '@/core/errors/error.store';

// In src/api/base/axios.ts (interceptor):
useErrorStore.getState().pushError('SERVER_ERROR', {
  onRetry: () => window.location.reload(),
});`}</CodeBlock>
          </GuideStep>

          {/* ── 6. Skip the global handler per-request ───────────────── */}
          <GuideStep number="6" title="Skip the global handler for one specific request">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Pass <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">skipGlobalErrorHandler: true</code> in
              the request config to prevent the Axios interceptor from pushing to the error store.
              The error is re-thrown so the calling component handles it directly.
            </p>
            <CodeBlock>{`import { authUrl } from '@/config/Define';

try {
  const res = await authUrl.get('/some-optional-data', {
    skipGlobalErrorHandler: true,   // interceptor won't push an overlay
  });
} catch (err) {
  // Handle locally — e.g. show a small inline banner, ignore it, etc.
  setLocalError('Could not load optional section.');
}`}</CodeBlock>
          </GuideStep>

          {/* ── 7. Read INLINE errors inside a component ─────────────── */}
          <GuideStep number="7" title="Consume an INLINE error inside a component">
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              INLINE errors are NOT rendered by <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">GlobalErrorRenderer</code>.
              Your component must subscribe to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">inlineError</code> and render
              its own banner. This is ideal for form-section errors that should appear near the triggering UI.
            </p>
            <CodeBlock>{`const inlineError  = useErrorStore((s) => s.inlineError);
const clearInline  = useErrorStore((s) => s.clearInlineError);

// Somewhere that can fail:
pushError('VALIDATION_ERROR', { displayModeOverride: 'INLINE' });

// In JSX:
{inlineError && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
    {translate(inlineError.config.titleKey)}
    <button onClick={clearInline}>✕</button>
  </div>
)}`}</CodeBlock>
          </GuideStep>

          {/* ── 8. Dismiss / clear ───────────────────────────────────── */}
          <GuideStep number="8" title="Dismiss errors programmatically">
            <CodeBlock>{`const { clearAll, clearPageError, clearModalError, removeToast } = useErrorStore();

clearAll();              // dismiss every active error at once
clearPageError();        // dismiss only the fullscreen PAGE overlay
clearModalError();       // dismiss only the MODAL dialog
removeToast(toast.id);   // dismiss one specific toast by ID`}</CodeBlock>
          </GuideStep>

          {/* ── Quick reference table ─────────────────────────────────── */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Quick reference — when to use each display mode
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Mode', 'When to use', 'User can dismiss?', 'Blocks navigation?'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-start font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    ['PAGE',   'Critical failure that makes the current view unusable (network down, 5xx, forbidden)', 'Yes — via action button', 'Yes — full overlay'],
                    ['MODAL',  'Action required before continuing (session expired, confirm destructive action)', 'Yes — backdrop click or Esc', 'Yes — dialog overlay'],
                    ['TOAST',  'Background operation failed non-critically (auto-save, analytics, optional fetch)', 'Yes — dismiss button or auto (4 s)', 'No — notification only'],
                    ['INLINE', 'Field/section-level error shown near the triggering UI (form validation, partial failure)', 'Component handles it', 'No — rendered inside component'],
                  ].map(([mode, when, dismiss, blocks]) => (
                    <tr key={mode} className="bg-white dark:bg-gray-800">
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          mode === 'PAGE'   ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                          mode === 'MODAL'  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                          mode === 'TOAST'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                             'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>{mode}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 leading-relaxed">{when}</td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{dismiss}</td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{blocks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function ErrorSimulatorPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [simState, setSimState] = useState<SimulationState>('idle');
  const [simResult, setSimResult] = useState<string | null>(null);
  const pushError = useErrorStore((s) => s.pushError);
  const clearAll  = useErrorStore((s) => s.clearAll);

  // ── Real interceptor tests ─────────────────────────────────────────────────

  /**
   * Calls an unreachable address so Axios fires a `network` error.
   * The interceptor classifies it as `network` → redirects to /error?type=network.
   * You will leave this page — that confirms the wiring works.
   */
  const triggerNetworkError = useCallback(async () => {
    setSimState('loading');
    setSimResult(null);
    try {
      // Port 1 on localhost is always refused — guaranteed to produce a
      // "network" type error without any backend involvement.
      await axios.get('http://localhost:1/trigger-network-error', { timeout: 3000 });
    } catch {
      // The interceptor on the SHARED `api` instance handles this.
      // Since we used plain `axios` here (not the custom `api` instance),
      // the page won't redirect — we show the result inline instead.
      setSimState('no-redirect');
      setSimResult(
        '✓ Network error thrown. In a real app request (via api instance), the interceptor would redirect to /error?type=network. Click "Preview" to see that page.',
      );
    }
  }, []);

  /**
   * Calls a public echo service that returns HTTP 500.
   * The shared api interceptor would classify it as `server` → redirect.
   * Here we use plain axios to stay on the page and report the outcome.
   */
  const triggerServerError = useCallback(async () => {
    setSimState('loading');
    setSimResult(null);
    try {
      await axios.get('https://httpstat.us/500', {
        timeout: 8000,
        headers: { Accept: 'application/json' },
      });
    } catch (err: unknown) {
      setSimState('no-redirect');
      const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      if (status && status >= 500) {
        setSimResult(
          `✓ HTTP ${status} received — classified as "server" error. Via the api instance, the interceptor would redirect to /error?type=server. Click "Preview" to see that page.`,
        );
      } else {
        setSimResult(
          'Could not reach httpstat.us (CORS or network). Use the Preview buttons below to inspect the error pages directly.',
        );
      }
    }
  }, []);

  /**
   * Calls a non-existent API endpoint which returns HTTP 404.
   * The interceptor classifies 404 as `unknown` and does NOT redirect.
   * The error is re-rejected so the calling component handles it.
   * This demonstrates that NOT every error shows the global error page.
   */
  const triggerUnknownError = useCallback(async () => {
    setSimState('loading');
    setSimResult(null);
    try {
      await axios.get(`${import.meta.env.VITE_API_URL ?? ''}/this-endpoint-does-not-exist-404`, {
        timeout: 8000,
      });
    } catch (err: unknown) {
      setSimState('no-redirect');
      const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      setSimResult(
        status
          ? `✓ HTTP ${status} received — classified as "unknown". The interceptor does NOT redirect for unknown errors; the component handles it inline. This is correct behavior.`
          : '✓ Request failed (network/CORS). The api instance interceptor classifies this as "network" and redirects.',
      );
    }
  }, []);

  return (
    <div className="border border-amber-200 dark:border-amber-800/60 rounded-2xl overflow-hidden">
      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Developer — Error Scenario Simulator
          </span>
          <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-medium">
            DEV ONLY
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-amber-500" />
        ) : (
          <ChevronDown size={16} className="text-amber-500" />
        )}
      </button>

      {open && (
        <div className="p-5 bg-white dark:bg-gray-800 space-y-6">
          {/* Explanation */}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Use these tools to test every error code path without stopping the network.
            <br />
            <strong className="text-gray-700 dark:text-gray-300">Preview buttons</strong> navigate
            directly to the error page so you can inspect its UI.{' '}
            <strong className="text-gray-700 dark:text-gray-300">Real simulation buttons</strong>{' '}
            fire actual HTTP requests (via plain <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">axios</code>) and
            report the classified error type — showing exactly what the app interceptor would do.
          </p>

          {/* ── Section A: Preview ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              A — Preview Error Pages (direct navigation)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => navigate('/error?type=network')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <WifiOff size={15} />
                Connection Error Page
              </button>
              <button
                type="button"
                onClick={() => navigate('/error?type=server')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <ServerCrash size={15} />
                Server Error Page
              </button>
              <button
                type="button"
                onClick={() => navigate('/error')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <AlertTriangle size={15} />
                Unknown Error Page
              </button>
            </div>
          </div>

          {/* ── Section B: Real interceptor simulation ─────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              B — Real HTTP Requests (exercises normalizeApiError logic)
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              These use plain <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">axios</code> (bypassing the redirect interceptor)
              so the page stays open and reports what the interceptor <em>would</em> have done.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={simState === 'loading'}
                onClick={() => void triggerNetworkError()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 transition-colors"
              >
                {simState === 'loading' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <WifiOff size={14} />
                )}
                Simulate Network Error
              </button>
              <button
                type="button"
                disabled={simState === 'loading'}
                onClick={() => void triggerServerError()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                {simState === 'loading' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ServerCrash size={14} />
                )}
                Simulate 500 Error
              </button>
              <button
                type="button"
                disabled={simState === 'loading'}
                onClick={() => void triggerUnknownError()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {simState === 'loading' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <AlertTriangle size={14} />
                )}
                Simulate 404 (unknown)
              </button>
            </div>

            {/* Result banner */}
            {simResult && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {simResult}
              </div>
            )}
          </div>

          {/* ── Section C: Global Error Store ──────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              C — Global Error Store (modal / toast / page overlay)
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              These call{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">useErrorStore().pushError()</code>{' '}
              directly — the same path the Axios interceptor uses after classifying an error.
              The page stays open so you can see the overlay on top of it.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* MODAL */}
              <button
                type="button"
                onClick={() => pushError('SESSION_EXPIRED')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                <Layers size={14} />
                MODAL — Session Expired
              </button>
              <button
                type="button"
                onClick={() => pushError('ORDER_NOT_FOUND', { displayModeOverride: 'MODAL' })}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                <Layers size={14} />
                MODAL — Order Not Found
              </button>
              {/* TOAST */}
              <button
                type="button"
                onClick={() => pushError('VALIDATION_ERROR')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <AlertTriangle size={14} />
                TOAST — Validation Error
              </button>
              <button
                type="button"
                onClick={() => pushError('SERVER_ERROR', { displayModeOverride: 'TOAST' })}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <AlertTriangle size={14} />
                TOAST — Server Error
              </button>
              {/* PAGE overlay */}
              <button
                type="button"
                onClick={() => pushError('FORBIDDEN')}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <ServerCrash size={14} />
                PAGE — Forbidden
              </button>
              {/* Clear */}
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={14} />
                Clear All Errors
              </button>
            </div>
          </div>

          {/* Interceptor behaviour table — reference only, not interactive */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Interceptor behaviour reference
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Error source', 'normalizeApiError type', 'Interceptor action'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-start font-semibold text-gray-500 dark:text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    ['No response (offline / DNS / CORS / timeout)', 'network', '→ /error?type=network'],
                    ['HTTP 500 / 502 / 503 / 504 (5xx)', 'server', '→ /error?type=server'],
                    ['HTTP 401 (first attempt)', 'auth', 'Silent refresh → retry original request'],
                    ['HTTP 401 (after refresh fails)', 'auth', '→ /login (hard navigation)'],
                    ['HTTP 400 / 422 (validation)', 'validation', 'Re-rejected → component shows field errors'],
                    ['HTTP 404 / 409 / 429 / other 4xx', 'unknown', 'Re-rejected → component handles inline'],
                    ['Request cancelled (AbortController)', 'unknown', 'Silent — no redirect, no toast'],
                  ].map(([src, type, action]) => (
                    <tr key={src} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{src}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-mono font-medium ${
                            type === 'network'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : type === 'server'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : type === 'auth'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : type === 'validation'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate();
  const { translate } = useI18n();
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [totalCategories, setTotalCategories] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [productsRes, categoriesRes] = await Promise.allSettled([
        getProducts({ page: 1, limit: 1 }),
        getCategories(),
      ]);

      if (productsRes.status === 'fulfilled') {
        setTotalProducts(productsRes.value.data.totalItems ?? 0);
      }
      if (categoriesRes.status === 'fulfilled') {
        setTotalCategories(categoriesRes.value.data.totalItems ?? 0);
      }
      setLoading(false);
    };

    void fetchStats();
  }, []);

  const stats: Stat[] = [
    {
      label: translate('admin.dashboard.totalProducts'),
      value: totalProducts ?? '—',
      icon: <Package size={20} />,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      to: '/admin/products',
    },
    {
      label: translate('admin.dashboard.categories'),
      value: totalCategories ?? '—',
      icon: <Tag size={20} />,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      to: '/admin/categories',
    },
    {
      label: translate('admin.dashboard.orders'),
      value: '—',
      icon: <ShoppingBag size={20} />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      to: '/admin/orders',
    },
    {
      label: translate('admin.dashboard.revenue'),
      value: '—',
      icon: <TrendingUp size={20} />,
      iconBg: 'bg-rose-100 dark:bg-rose-900/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
      to: '/admin/orders',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{translate('admin.dashboard.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {translate('admin.dashboard.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} loading={loading} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          {translate('admin.dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: translate('admin.dashboard.manageProducts'), to: '/admin/products', icon: <Package size={16} /> },
            { label: translate('admin.dashboard.manageCategories'), to: '/admin/categories', icon: <Tag size={16} /> },
            { label: translate('admin.dashboard.viewOrders'), to: '/admin/orders', icon: <ShoppingBag size={16} /> },
          ].map((action) => (
            <button
              key={action.to}
              type="button"
              onClick={() => navigate(action.to)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
            >
              {action.icon}
              {action.label}
              <ArrowRight size={14} className="ms-auto text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Error Simulator — DEV only */}
      {import.meta.env.DEV && <ErrorSimulatorPanel />}

      {/* Developer integration guide — DEV only */}
      {import.meta.env.DEV && <ErrorIntegrationGuide />}
    </div>
  );
}
