/**
 * @fileoverview Reusable skeleton loading components.
 *
 * Skeletons are placeholder UI elements that mimic the shape of content
 * while data is loading. They provide a significantly better user experience
 * than spinners for content-heavy pages because they set the user's visual
 * expectations for the layout before the data arrives.
 *
 * ## Accessibility
 * The root element carries `aria-hidden="true"` because skeleton elements
 * convey no semantic meaning — screen reader users rely on live regions or
 * status messages to be informed of loading state rather than perceiving
 * the skeleton structure itself.
 *
 * ## Performance
 * Components are wrapped with `React.memo` to prevent re-renders driven by
 * parent state changes that are irrelevant to the skeleton's appearance.
 * Since skeletons accept only a `className` prop, the memo comparison is
 * trivially fast.
 *
 * @module components/ui/Skeleton
 */

import { memo } from 'react';

// ---------------------------------------------------------------------------
// Base skeleton block
// ---------------------------------------------------------------------------

interface SkeletonProps {
  /** Additional Tailwind classes to control width, height, and shape. */
  className?: string;
}

/**
 * A single animated skeleton block.
 *
 * Use it as a building block for more complex skeleton layouts:
 *
 * ```tsx
 * // Simulates a text line
 * <Skeleton className="h-4 w-3/4" />
 *
 * // Simulates an avatar circle
 * <Skeleton className="h-10 w-10 rounded-full" />
 *
 * // Simulates a product image
 * <Skeleton className="h-48 w-full rounded-xl" />
 * ```
 */
export const Skeleton = memo(function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
});

// ---------------------------------------------------------------------------
// Product card skeleton
// ---------------------------------------------------------------------------

/**
 * Skeleton that matches the visual footprint of a product card in the
 * user-facing ecommerce grid (`ProductsPage`, `HomePage`).
 */
export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      {/* Image area */}
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-4 space-y-3">
        {/* Category chip */}
        <Skeleton className="h-4 w-20" />
        {/* Product name */}
        <Skeleton className="h-5 w-4/5" />
        {/* Price */}
        <Skeleton className="h-6 w-24" />
        {/* Button */}
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Admin table row skeleton
// ---------------------------------------------------------------------------

/**
 * Skeleton that matches the column layout of a row in the admin products
 * table (`ProductsListPage`).
 */
export const TableRowSkeleton = memo(function TableRowSkeleton() {
  return (
    <tr aria-hidden="true" className="border-b border-gray-100 dark:border-gray-700">
      {/* Checkbox */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-4" />
      </td>
      {/* Image */}
      <td className="px-4 py-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
      </td>
      {/* Name */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </td>
      {/* Category */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      {/* Price */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-16" />
      </td>
      {/* Stock */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-12" />
      </td>
      {/* Actions */}
      <td className="px-4 py-3">
        <Skeleton className="h-8 w-16 rounded-lg" />
      </td>
    </tr>
  );
});
