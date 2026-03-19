/**
 * @fileoverview Route whitelist configuration.
 *
 * Defines fine-grained access rules beyond the basic role/auth checks already
 * handled by `ProtectedRoute` and `RoleGuard`. The `WhitelistGuard` component
 * reads this config at runtime and enforces each rule.
 *
 * ## Rule evaluation order
 *
 * 1. `allowedRoles`        — user.role must be in this list
 * 2. `allowedUserIds`      — user._id must be in this list (empty = no ID restriction)
 * 3. `requiredFeatureFlags` — ALL listed flags must be `true` in auth store
 *
 * Each condition is ANDed together. A route with both `allowedRoles` and
 * `requiredFeatureFlags` requires the user to satisfy BOTH.
 *
 * ## Exact-path vs prefix matching
 *
 * Keys are matched EXACTLY against `location.pathname`. Use the prefix
 * `__prefix__` convention to signal prefix matching in `WhitelistGuard`:
 *
 * ```ts
 * '/admin/reports': { allowedRoles: ['ADMIN'] }       // exact match
 * ```
 *
 * Dynamic segments (e.g. `/admin/products/:id/edit`) should use prefix rules
 * if you want the rule to cover all IDs:
 * ```ts
 * '/admin/products': { allowedRoles: ['ADMIN', 'MANAGER'] } // prefix
 * ```
 * Pass `matchPrefix: true` in the rule to enable prefix matching.
 *
 * ## How to add a new rule
 *
 * 1. Add an entry to `WHITELIST_CONFIG` below.
 * 2. `WhitelistGuard` will automatically enforce it on the matching route —
 *    no changes needed in AppRouter.tsx unless the guard is not already
 *    wrapping that route.
 *
 * @module config/whitelist.config
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WhitelistRule = {
  /**
   * Roles allowed to access this route.
   * Empty array or undefined means any authenticated role is allowed.
   */
  allowedRoles?: string[];
  /**
   * Specific user IDs allowed to access this route.
   * Empty array or undefined means no per-user restriction.
   */
  allowedUserIds?: string[];
  /**
   * Feature flag names that MUST ALL be `true` in `useAuthStore().featureFlags`.
   * Empty array or undefined means no feature flag restriction.
   */
  requiredFeatureFlags?: string[];
  /**
   * When `true`, the rule matches any pathname that STARTS WITH the key.
   * When `false` (default), the pathname must match EXACTLY.
   */
  matchPrefix?: boolean;
};

// ---------------------------------------------------------------------------
// Whitelist config
// ---------------------------------------------------------------------------

/**
 * Central whitelist. Keys are route pathnames.
 *
 * The `WhitelistGuard` component iterates this config and applies the first
 * matching rule for the current `location.pathname`.
 *
 * Rules with `matchPrefix: true` are evaluated before exact-match rules to
 * allow broad rules with specific overrides.
 */
export const WHITELIST_CONFIG: Record<string, WhitelistRule> = {
  // ── Admin error playground — ADMIN only + feature flag ────────────────────
  '/admin/error-playground': {
    allowedRoles: ['ADMIN'],
    requiredFeatureFlags: ['errorPlayground'],
  },

  // ── Admin dashboard — ADMIN and MANAGER ────────────────────────────────────
  '/admin/dashboard': {
    allowedRoles: ['ADMIN', 'MANAGER'],
  },

  // ── Admin products section (prefix — covers /admin/products, /create, /edit)
  '/admin/products': {
    allowedRoles: ['ADMIN', 'MANAGER'],
    matchPrefix: true,
  },

  // ── Admin categories — ADMIN only ─────────────────────────────────────────
  '/admin/categories': {
    allowedRoles: ['ADMIN'],
  },

  // ── Admin orders — ADMIN and MANAGER ──────────────────────────────────────
  '/admin/orders': {
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
};

// ---------------------------------------------------------------------------
// Helper — find matching rule for a pathname
// ---------------------------------------------------------------------------

/**
 * Finds the most specific whitelist rule for a given pathname.
 *
 * Exact matches take priority over prefix matches.
 *
 * @param pathname - The current `location.pathname`.
 * @returns The matching `WhitelistRule`, or `null` if no rule applies.
 */
export function findWhitelistRule(pathname: string): WhitelistRule | null {
  // Exact match first.
  if (pathname in WHITELIST_CONFIG) {
    return WHITELIST_CONFIG[pathname];
  }

  // Prefix match — find the longest matching prefix.
  let bestMatch: WhitelistRule | null = null;
  let bestMatchLength = 0;

  for (const [key, rule] of Object.entries(WHITELIST_CONFIG)) {
    if (rule.matchPrefix && pathname.startsWith(key) && key.length > bestMatchLength) {
      bestMatch = rule;
      bestMatchLength = key.length;
    }
  }

  return bestMatch;
}
