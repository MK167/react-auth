/**
 * @fileoverview Admin Error Playground — interactive testing sandbox for
 * the global error system.
 *
 * ## Purpose
 *
 * Allows developers and QA to:
 * - Preview every error code in every display mode
 * - Test toast, modal, page-overlay, and inline error rendering
 * - Simulate retry, redirect, and dismiss behaviours
 * - Verify unauthorized and feature-disabled guard flows
 * - Validate deep link guard behaviour
 *
 * This page is only accessible to ADMIN role + `errorPlayground` feature flag
 * (enforced by the WhitelistGuard in AppRouter).
 *
 * @module pages/admin/ErrorPlaygroundPage
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, RotateCcw, Layers, Zap, ShieldX, AlertTriangle,
  Info, Check, ChevronDown,
} from 'lucide-react';
import { useErrorStore } from '@/core/errors/error.store';
import { ERROR_CONFIG_MAP } from '@/core/errors/error.config';
import type { ErrorCode, ErrorDisplayMode } from '@/core/errors/error.types';
import { useAuthStore } from '@/store/auth.store';
import { useI18n } from '@/i18n/use-i18n.hook';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_ERROR_CODES = Object.keys(ERROR_CONFIG_MAP) as ErrorCode[];

const DISPLAY_MODES: Array<{ value: ErrorDisplayMode; label: string; description: string }> = [
  { value: 'PAGE',   label: 'PAGE',   description: 'Fullscreen overlay — replaces all page content' },
  { value: 'MODAL',  label: 'MODAL',  description: 'Dialog overlay — user must dismiss or act' },
  { value: 'TOAST',  label: 'TOAST',  description: 'Auto-dismissing notification (4s default)' },
  { value: 'INLINE', label: 'INLINE', description: 'Component-level — shown below the trigger button' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title, subtitle }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'indigo' | 'green' | 'red' | 'amber' }) {
  const colorMap = {
    gray:   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${colorMap[color]}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline error preview (rendered in-page)
// ---------------------------------------------------------------------------

function InlineErrorPreview({ code }: { code: ErrorCode }) {
  const { translate } = useI18n();
  const config = ERROR_CONFIG_MAP[code];
  if (!config) return null;
  return (
    <div className={`mt-3 p-3 rounded-lg border flex items-start gap-3 ${config.iconBgClass} border-current`}>
      <span className={`flex-shrink-0 ${config.iconColorClass}`}>
        <AlertTriangle size={16} />
      </span>
      <div>
        <p className={`text-sm font-medium ${config.iconColorClass}`}>{translate(config.titleKey)}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{translate(config.descriptionKey)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ErrorPlaygroundPage() {
  const navigate = useNavigate();
  const { translate } = useI18n();
  const { pushError, clearAll } = useErrorStore();
  const { featureFlags, setFeatureFlags } = useAuthStore();

  // Selections
  const [selectedCode, setSelectedCode] = useState<ErrorCode>('ORDER_NOT_FOUND');
  const [selectedMode, setSelectedMode] = useState<ErrorDisplayMode | 'default'>('default');
  const [withRetry, setWithRetry] = useState(false);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<string | null>(null);

  const selectedConfig = ERROR_CONFIG_MAP[selectedCode];
  const effectiveMode = selectedMode === 'default' ? selectedConfig.displayMode : selectedMode;

  const handleTrigger = () => {
    const options = {
      displayModeOverride: selectedMode !== 'default' ? (selectedMode as ErrorDisplayMode) : undefined,
      onRetry: withRetry ? () => {
        clearAll();
        setLastTriggered('Retry callback fired!');
        setTimeout(() => setLastTriggered(null), 2000);
      } : undefined,
    };

    if (effectiveMode === 'INLINE') {
      setShowInlinePreview(true);
    } else {
      setShowInlinePreview(false);
      pushError(selectedCode, options);
    }
    setLastTriggered(`Triggered: ${selectedCode} as ${effectiveMode}`);
    setTimeout(() => setLastTriggered(null), 3000);
  };

  const handleSimulateUnauthorized = () => {
    pushError('FORBIDDEN', { displayModeOverride: 'PAGE' });
  };

  const handleSimulateSessionExpired = () => {
    pushError('SESSION_EXPIRED', { displayModeOverride: 'MODAL' });
  };

  const handleSimulateDeepLink = () => {
    navigate('/orders/nonexistent-id-12345');
  };

  const handleToggleFeatureFlag = (flag: string) => {
    setFeatureFlags({ ...featureFlags, [flag]: !featureFlags[flag] });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers size={22} className="text-indigo-500" />
          Error Playground
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Interactive sandbox for testing the global error system. All errors triggered here
          are real — use <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> or
          the dismiss button to close overlays.
        </p>
      </div>

      {/* ── SECTION 1: Error trigger ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <SectionHeader
          icon={<Play size={16} />}
          title="Trigger Error"
          subtitle="Select an error code and display mode, then fire it."
        />

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Error code select */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Error Code
            </label>
            <div className="relative">
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value as ErrorCode)}
                className="w-full appearance-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_ERROR_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Display mode select */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Display Mode Override
            </label>
            <div className="relative">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as ErrorDisplayMode | 'default')}
                className="w-full appearance-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="default">Default (from config)</option>
                {DISPLAY_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {selectedMode !== 'default' && (
              <p className="text-xs text-gray-400 mt-1">
                {DISPLAY_MODES.find(m => m.value === selectedMode)?.description}
              </p>
            )}
          </div>
        </div>

        {/* Config preview */}
        {selectedConfig && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Config Preview
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge color="indigo">{selectedCode}</Badge>
              <Badge color="amber">
                {effectiveMode}
                {selectedMode !== 'default' && ' (overridden)'}
              </Badge>
              <Badge color="gray">icon: {selectedConfig.iconName}</Badge>
              <Badge color="gray">key: {selectedConfig.titleKey}</Badge>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="font-medium">Title:</span> {translate(selectedConfig.titleKey)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="font-medium">Description:</span> {translate(selectedConfig.descriptionKey)}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withRetry}
              onChange={(e) => setWithRetry(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Inject retry callback
            </span>
          </label>
        </div>

        {/* Trigger button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleTrigger}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Play size={14} />
            Trigger Error
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={14} />
            Clear All
          </button>
        </div>

        {/* Last triggered status */}
        {lastTriggered && (
          <p className="mt-3 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check size={12} />
            {lastTriggered}
          </p>
        )}

        {/* Inline error preview */}
        {showInlinePreview && effectiveMode === 'INLINE' && (
          <InlineErrorPreview code={selectedCode} />
        )}
      </div>

      {/* ── SECTION 2: Scenario simulations ──────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <SectionHeader
          icon={<Zap size={16} />}
          title="Scenario Simulations"
          subtitle="Pre-built scenarios that simulate real application flows."
        />

        <div className="grid sm:grid-cols-2 gap-3">
          {/* ── PAGE scenarios ─────────────────────────── */}
          <ScenarioCard
            title="Unauthorized (FORBIDDEN)"
            description="Simulates accessing a page without permission — full-screen overlay blocks navigation."
            color="red"
            displayMode="PAGE"
            onClick={handleSimulateUnauthorized}
          />
          <ScenarioCard
            title="Network Error"
            description="NETWORK_ERROR full-screen overlay with a retry callback that clears the error."
            color="gray"
            displayMode="PAGE"
            onClick={() => pushError('NETWORK_ERROR', {
              onRetry: () => { clearAll(); },
            })}
          />
          <ScenarioCard
            title="Feature Disabled"
            description="FEATURE_DISABLED full-screen overlay — use to test FeatureGuard fallback UI."
            color="gray"
            displayMode="PAGE"
            onClick={() => pushError('FEATURE_DISABLED')}
          />
          {/* ── MODAL scenarios ────────────────────────── */}
          <ScenarioCard
            title="Session Expired"
            description="Token expiry — requires the user to sign in again. Dismissible by clicking the backdrop or Esc."
            color="amber"
            displayMode="MODAL"
            onClick={handleSimulateSessionExpired}
          />
          <ScenarioCard
            title="Order Not Found (Modal)"
            description="ORDER_NOT_FOUND displayed as a modal dialog instead of its default PAGE mode."
            color="purple"
            displayMode="MODAL"
            onClick={() => pushError('ORDER_NOT_FOUND', { displayModeOverride: 'MODAL' })}
          />
          <ScenarioCard
            title="Unknown Error (Modal)"
            description="Generic UNKNOWN_ERROR as a dismissible modal. Good for testing modal layout and actions."
            color="purple"
            displayMode="MODAL"
            onClick={() => pushError('UNKNOWN_ERROR', { displayModeOverride: 'MODAL' })}
          />
          {/* ── TOAST scenarios ────────────────────────── */}
          <ScenarioCard
            title="Server Error Toast"
            description="SERVER_ERROR shown as a TOAST — non-blocking override for background operations."
            color="gray"
            displayMode="TOAST"
            onClick={() => pushError('SERVER_ERROR', { displayModeOverride: 'TOAST' })}
          />
          <ScenarioCard
            title="Validation Toast"
            description="VALIDATION_ERROR as its default TOAST notification — auto-dismisses after 4 s."
            color="amber"
            displayMode="TOAST"
            onClick={() => pushError('VALIDATION_ERROR')}
          />
          <ScenarioCard
            title="Multiple Toasts"
            description="Push 3 different toasts in quick succession to test the toast queue and stacking."
            color="indigo"
            displayMode="TOAST"
            onClick={() => {
              pushError('VALIDATION_ERROR');
              setTimeout(() => pushError('UNKNOWN_ERROR', { displayModeOverride: 'TOAST' }), 200);
              setTimeout(() => pushError('NETWORK_ERROR', { displayModeOverride: 'TOAST' }), 400);
            }}
          />
          {/* ── OTHER scenarios ────────────────────────── */}
          <ScenarioCard
            title="Deep Link Validation"
            description="Navigate to /orders/nonexistent-id to trigger the DeepLinkGuard resource not-found flow."
            color="indigo"
            displayMode="PAGE"
            onClick={handleSimulateDeepLink}
          />
        </div>
      </div>

      {/* ── SECTION 3: Feature flag toggles ──────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <SectionHeader
          icon={<ShieldX size={16} />}
          title="Feature Flags"
          subtitle="Toggle flags to test FeatureGuard and WhitelistGuard behaviour."
        />

        <div className="space-y-2">
          {['errorPlayground', 'betaReports', 'analyticsV2', 'newCheckout'].map((flag) => (
            <div
              key={flag}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{flag}</span>
                <span className="ml-2">
                  {featureFlags[flag]
                    ? <Badge color="green">enabled</Badge>
                    : <Badge color="red">disabled</Badge>
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeatureFlag(flag)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  featureFlags[flag]
                    ? 'bg-indigo-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={featureFlags[flag] ?? false}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    featureFlags[flag] ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
          <Info size={14} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Flag changes take effect immediately in the current session. They are persisted to
            localStorage so they survive page refresh. Navigate to{' '}
            <strong>/admin/error-playground</strong> after disabling{' '}
            <code>errorPlayground</code> to test WhitelistGuard enforcement.
          </p>
        </div>
      </div>

      {/* ── SECTION 4: All error codes reference ─────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <SectionHeader
          icon={<Info size={16} />}
          title="Error Code Reference"
          subtitle="All registered error codes and their default configuration."
        />

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <th className="px-2 py-2 font-semibold">Code</th>
                <th className="px-2 py-2 font-semibold">Mode</th>
                <th className="px-2 py-2 font-semibold">Icon</th>
                <th className="px-2 py-2 font-semibold">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {ALL_ERROR_CODES.map((code) => {
                const cfg = ERROR_CONFIG_MAP[code];
                const modeColor: Record<string, 'indigo' | 'amber' | 'gray' | 'red'> = {
                  PAGE: 'red', MODAL: 'indigo', TOAST: 'amber', INLINE: 'gray',
                };
                return (
                  <tr
                    key={code}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedCode(code);
                      setSelectedMode('default');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <td className="px-2 py-2.5">
                      <span className="font-mono font-medium text-gray-900 dark:text-white">{code}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge color={modeColor[cfg.displayMode] ?? 'gray'}>{cfg.displayMode}</Badge>
                    </td>
                    <td className="px-2 py-2.5 text-gray-500 dark:text-gray-400 font-mono">{cfg.iconName}</td>
                    <td className="px-2 py-2.5 text-gray-600 dark:text-gray-300">{translate(cfg.titleKey)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Click a row to select that code in the trigger panel above.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario card sub-component
// ---------------------------------------------------------------------------

function ScenarioCard({
  title,
  description,
  color,
  displayMode,
  onClick,
}: {
  title: string;
  description: string;
  color: 'red' | 'amber' | 'indigo' | 'gray' | 'purple';
  displayMode: ErrorDisplayMode;
  onClick: () => void;
}) {
  const borderMap = {
    red:    'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700',
    amber:  'border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700',
    indigo: 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700',
    gray:   'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
    purple: 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
  };
  const btnMap = {
    red:    'bg-red-600 hover:bg-red-700',
    amber:  'bg-amber-500 hover:bg-amber-600',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    gray:   'bg-gray-600 hover:bg-gray-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };
  const modeBadgeMap: Record<ErrorDisplayMode, string> = {
    PAGE:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    MODAL:  'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    TOAST:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    INLINE: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className={`p-4 rounded-xl border transition-colors ${borderMap[color]}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${modeBadgeMap[displayMode]}`}>
          {displayMode}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${btnMap[color]}`}
      >
        <Play size={11} />
        Simulate
      </button>
    </div>
  );
}
