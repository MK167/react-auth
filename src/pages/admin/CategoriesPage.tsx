/**
 * @fileoverview Admin Categories Management Page.
 *
 * ## Responsibilities
 *
 * Full CRUD interface for product categories:
 *
 * - **List** — table of all categories fetched via `getCategories()`.
 * - **Create** — inline slide-down panel with a name input; Enter key submits.
 * - **Edit** — click pencil to activate an inline text input directly in the
 *   table row; Enter saves, Escape cancels.
 * - **Delete** — clicking the bin icon opens a focused confirmation modal.
 *
 * ## Design rationale
 *
 * Categories are simple single-field entities (just a name + auto-slug).
 * A separate create/edit page would be over-engineering — inline editing in
 * the table provides faster access without the context switch of navigating
 * away. The same pattern is used by Airtable and Notion for tag management.
 *
 * ## State flow
 *
 * ```
 * Mount → fetchCategories()
 *   ├── loading  → skeleton rows
 *   ├── success  → render table
 *   └── error    → error banner with retry
 *
 * Create → createCategory(name) → refetch
 * Edit   → updateCategory(id, name) → refetch
 * Delete → deleteCategory(id) → refetch
 * ```
 *
 * @module pages/admin/CategoriesPage
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Plus, Pencil, Trash2, Tag, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import { getCategories } from '@/api/products.api';
import { createCategory, updateCategory, deleteCategory } from '@/api/categories.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n/i18n.context';
import type { ProductCategory } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Inline delete confirmation modal
// ---------------------------------------------------------------------------

interface ConfirmDeleteProps {
  isOpen: boolean;
  categoryName: string;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Lightweight confirmation modal for category deletion.
 *
 * Kept as an internal component (not reusing `DeleteModal`) because
 * `DeleteModal` is hardcoded with "Delete product" copy. Category deletion
 * has its own warning text ("products will lose their category assignment")
 * that is not applicable to product deletion.
 */
function ConfirmDeleteModal({
  isOpen,
  categoryName,
  isLoading,
  onConfirm,
  onClose,
}: ConfirmDeleteProps) {
  const { translate } = useI18n();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const id = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => {
        clearTimeout(id);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-delete-title"
        className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={16} />
        </button>

        <h2
          id="cat-delete-title"
          className="text-base font-semibold text-gray-900 dark:text-white mb-2"
        >
          {translate('admin.categories.deleteModal.title')}
        </h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          <span className="font-medium text-gray-900 dark:text-white">
            &ldquo;{categoryName}&rdquo;
          </span>{' '}
          — {translate('admin.categories.deleteModal.message')}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {translate('admin.categories.deleteModal.cancel')}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isLoading ? translate('admin.categories.deleteModal.deleting') : translate('admin.categories.deleteModal.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Admin category management table with inline create, inline edit, and
 * delete confirmation modal.
 */
export default function CategoriesPage() {
  const { translate } = useI18n();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit
  const [editTarget, setEditTarget] = useState<ProductCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCategories();
      setCategories(res.data.data ?? []);
    } catch {
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    const trimmed = createName.trim();
    if (!trimmed) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createCategory(trimmed);
      setCreateName('');
      setShowCreate(false);
      void fetchCategories();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setCreateError(msg ?? 'Failed to create category.');
    } finally {
      setCreateLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------

  const startEdit = (cat: ProductCategory) => {
    setEditTarget(cat);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditTarget(null);
    setEditName('');
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === editTarget.name) {
      cancelEdit();
      return;
    }
    setEditLoading(true);
    try {
      await updateCategory(editTarget._id, trimmed);
      cancelEdit();
      void fetchCategories();
    } finally {
      setEditLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCategory(deleteTarget._id);
      setDeleteTarget(null);
      void fetchCategories();
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{translate('admin.categories.title')}</h1>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {translate('admin.categories.totalCategories').replace('{{count}}', String(categories.length))}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v);
            setCreateError(null);
            setCreateName('');
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          {translate('admin.categories.newCategory')}
        </button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
            {translate('admin.categories.addNew')}
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder={translate('admin.categories.namePlaceholder')}
              value={createName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCreateName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') void handleCreate();
                if (e.key === 'Escape') setShowCreate(false);
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={createLoading || !createName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {createLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {translate('common.add')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setCreateError(null);
              }}
              aria-label="Cancel"
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          {createError && (
            <p className="text-xs text-red-500 mt-2">{createError}</p>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchCategories()}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw size={13} />
            {translate('common.retry')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {translate('admin.categories.table.name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                {translate('admin.categories.table.slug')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                {translate('admin.categories.table.created')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {translate('admin.categories.table.actions')}
              </th>
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    aria-hidden="true"
                    className="border-b border-gray-100 dark:border-gray-700"
                  >
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-8 w-16 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              : categories.map((cat) => (
                  <tr
                    key={cat._id}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    {/* Name — inline editable */}
                    <td className="px-4 py-3">
                      {editTarget?._id === cat._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setEditName(e.target.value)
                            }
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') void handleEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="px-2 py-1 text-sm border border-indigo-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void handleEdit()}
                            disabled={editLoading}
                            aria-label="Save"
                            className="p-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                          >
                            {editLoading ? (
                              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            aria-label="Cancel edit"
                            className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-indigo-500 flex-shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {cat.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Slug */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {cat.slug}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(cat.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          aria-label={`Edit ${cat.name}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          aria-label={`Delete ${cat.name}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

            {/* Empty state */}
            {!loading && categories.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <Tag size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{translate('admin.categories.empty')}</p>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {translate('admin.categories.createFirst')}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        categoryName={deleteTarget?.name ?? ''}
        isLoading={deleteLoading}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
