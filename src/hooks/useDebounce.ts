/**
 * @fileoverview Generic debounce hook.
 *
 * Debouncing is critical for search inputs that trigger API requests. Without
 * it, every keystroke would fire a network request, creating unnecessary load
 * on the server and a poor user experience (results flickering on every key).
 *
 * **How it works:**
 * 1. A `setTimeout` is scheduled each time `value` changes.
 * 2. If `value` changes again before the timeout fires, the previous timer is
 *    cleared (via the `useEffect` cleanup) and a new one is started.
 * 3. Only when the user stops typing for `delay` milliseconds does the
 *    internal state update, which triggers re-renders in the consumer.
 *
 * **Interaction with the search flow in `ProductsListPage`:**
 * The raw `searchInput` state is fed into `useDebounce`. The debounced value
 * is then used as the `q` query parameter in the API call. This means the API
 * is only called after the user has paused typing, not on every keystroke.
 *
 * @module hooks/useDebounce
 */

import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay`
 * milliseconds of inactivity.
 *
 * @typeParam T - The type of the value being debounced.
 * @param value - The raw value to debounce (typically a controlled input value).
 * @param delay - Debounce delay in milliseconds. 300–500 ms is appropriate for
 *                search inputs; shorter feels too aggressive, longer feels laggy.
 * @returns The debounced value — identical to `value` but updated lazily.
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 400);
 *
 * useEffect(() => {
 *   fetchProducts({ q: debouncedQuery });
 * }, [debouncedQuery]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel the pending timer if `value` or `delay` changes before
    // the timeout fires.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
