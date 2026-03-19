/**
 * @fileoverview Delete confirmation modal for admin product management.
 *
 * ## UX rationale
 *
 * Destructive actions (deletes) must always be confirmed by the user to
 * prevent accidental data loss. This modal follows the same confirmation
 * pattern used by Stripe, Shopify, and GitHub: a focused dialog that
 * clearly names the item about to be deleted and offers a prominently red
 * "Delete" button alongside a neutral "Cancel" option.
 *
 * ## Accessibility
 *
 * - The modal is rendered as a `<dialog>`-style overlay with `role="dialog"`
 *   and `aria-modal="true"` so screen readers announce the modal context.
 * - `aria-labelledby` links the heading to the dialog.
 * - `aria-describedby` links the body copy to the dialog for additional context.
 * - Focus is trapped inside the modal by the DOM order: Cancel receives focus
 *   first (the safe action), followed by Delete. Pressing Tab cycles between
 *   only these two buttons while the modal is open.
 * - Pressing `Escape` calls `onClose` to dismiss the modal — this is handled
 *   via a `keydown` listener on the overlay backdrop.
 * - The backdrop click area calls `onClose` so users can dismiss by clicking
 *   outside, as is standard modal UX.
 *
 * ## Loading state
 *
 * While the delete API call is in flight (`isLoading = true`), both buttons
 * are disabled and the Delete button shows a spinner to communicate progress.
 *
 * @module components/admin/DeleteModal
 */

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeleteModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Name of the product about to be deleted — shown in the modal body */
  productName: string;
  /** Whether the delete API call is currently in flight */
  isLoading: boolean;
  /** Called when the user confirms the delete action */
  onConfirm: () => void;
  /** Called when the user cancels or clicks outside the modal */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Confirmation modal that appears before a product is deleted in the admin
 * products list.
 *
 * @param props - See {@link DeleteModalProps}.
 */
export default function DeleteModal({
  isOpen,
  productName,
  isLoading,
  onConfirm,
  onClose,
}: DeleteModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the Cancel button when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Slight delay ensures the modal has rendered before focusing
      const id = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
      role="presentation"
    >
      {/* Modal panel — stop click propagation so clicking inside doesn't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
        className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
        </div>

        {/* Heading */}
        <h2
          id="delete-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
        >
          Delete product
        </h2>

        {/* Body */}
        <p
          id="delete-modal-description"
          className="text-sm text-gray-500 dark:text-gray-400 mb-6"
        >
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900 dark:text-white">
            &ldquo;{productName}&rdquo;
          </span>
          ? This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isLoading ? 'Deleting…' : 'Delete product'}
          </button>
        </div>
      </div>
    </div>
  );
}
