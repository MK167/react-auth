/**
 * @fileoverview Admin Products List Page.
 *
 * ## Responsibilities
 *
 * This is the primary admin dashboard page for managing the product catalogue.
 * It provides a full-featured data table with:
 *
 * - **Paginated data loading** — calls `getProducts()` with the current page
 *   number and limit; pagination controls at the bottom navigate between pages.
 * - **Live search** — a debounced search input (400 ms) sends the `q` param
 *   to the API so the server does the filtering. Debouncing prevents a request
 *   on every keystroke.
 * - **Sorting** — a sort dropdown lets admins sort by `name`, `price`, or
 *   `createdAt` in ascending or descending order.
 * - **Category filter** — a category dropdown populated from `getCategories()`
 *   restricts results to a single category. The "All categories" option resets
 *   the filter.
 * - **Loading skeletons** — `TableRowSkeleton` components replace the table
 *   rows while the API call is in flight, matching the visual footprint of
 *   real rows so the layout doesn't shift when data arrives.
 * - **Error state** — displays the API error message with a "Try again" button
 *   that re-triggers the fetch.
 * - **Delete confirmation** — clicking the bin icon on a row opens the
 *   `DeleteModal`. Confirming calls `deleteProduct()` and refreshes the list.
 *
 * ## State flow
 *
 * ```
 * Component mounts / query params change
 *       │
 *       ▼
 * fetchProducts() called (side-effect in useEffect)
 *       │
 *       ├── loading = true  → render TableRowSkeletons
 *       │
 *       ├── success         → render data table
 *       │
 *       └── error           → render error banner with retry button
 * ```
 *
 * ## Query reset behaviour
 *
 * Any time `searchQuery`, `selectedCategory`, `sortBy`, or `sortType` changes,
 * the page resets to `1` to avoid showing "page 3 of 1" after narrowing the
 * result set with a search term.
 *
 * @module pages/admin/ProductsListPage
 */

import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { getProducts, deleteProduct, getCategories } from '@/api/products.api';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import DeleteModal from '@/components/admin/DeleteModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useI18n } from '@/i18n/use-i18n.hook';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { Product, ProductCategory, PaginatedData } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

type SortField = 'name' | 'price' | 'createdAt';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StockBadge({ stock }: { stock: number }) {
  const { translate } = useI18n();
  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
        {translate('admin.products.outOfStock')}
      </span>
    );
  }
  if (stock < 10) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        {translate('admin.products.lowStock').replace('{{count}}', String(stock))}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
      {stock}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Admin product management table with search, sort, filter, pagination, and
 * delete confirmation.
 */
export default function ProductsListPage() {
  usePageMeta('Products', 'Manage your ShopHub product catalog — add, edit, and delete products.');
  const navigate = useNavigate();
  const { translate } = useI18n();

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedData<unknown>, 'data'> | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters & sorting
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortType, setSortType] = useState<SortDir>('desc');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce the raw search input (400 ms)
  const debouncedSearch = useDebounce(searchInput, 400);

  // ---------------------------------------------------------------------------
  // Reset page to 1 whenever a filter/sort changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, sortBy, sortType]);

  // ---------------------------------------------------------------------------
  // Fetch products
  // ---------------------------------------------------------------------------
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({
        page,
        limit: PAGE_SIZE,
        q: debouncedSearch || undefined,
        sortBy,
        sortType,
        category: selectedCategory || undefined,
      });
      setProducts(res.data.data || []);
      const { data: _data, ...meta } = res.data;
      setPagination(meta);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortBy, sortType, selectedCategory]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // ---------------------------------------------------------------------------
  // Fetch categories (once on mount)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.data))
      .catch(() => {
        // Category fetch failure is non-fatal — filter just won't populate
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Delete handlers
  // ---------------------------------------------------------------------------
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deleteTarget._id);
      setDeleteTarget(null);
      // If we deleted the last item on a non-first page, go back one page
      if (products.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        void fetchProducts();
      }
    } catch {
      setDeleteLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;
  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div>
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{translate('admin.products.title')}</h1>
          {pagination && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {translate('admin.products.totalProducts').replace('{{count}}', String(totalItems))}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/products/create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          {translate('admin.products.newProduct')}
        </button>
      </div>

      {/* Filters row */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="search"
            placeholder={translate('admin.products.search')}
            value={searchInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{translate('admin.products.allCategories')}</option>
          {categories?.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Sort field */}
        <select
          value={sortBy}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortField)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="createdAt">{translate('admin.products.sort.date')}</option>
          <option value="name">{translate('admin.products.sort.name')}</option>
          <option value="price">{translate('admin.products.sort.price')}</option>
        </select>

        {/* Sort direction */}
        <select
          value={sortType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortType(e.target.value as SortDir)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="desc">{translate('admin.products.sort.descending')}</option>
          <option value="asc">{translate('admin.products.sort.ascending')}</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchProducts()}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw size={13} />
            {translate('admin.products.retry')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="w-10 px-4 py-3 text-left" />
                <th className="w-14 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.products.table.image')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.products.table.name')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                  {translate('admin.products.table.category')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.products.table.price')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                  {translate('admin.products.table.stock')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.products.table.actions')}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))
                : products.map((product) => (
                    <tr
                      key={product._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      {/* Checkbox placeholder */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>

                      {/* Image */}
                      <td className="px-4 py-3">
                        {product.mainImage?.url ? (
                          <img
                            src={product.mainImage.url}
                            alt={product.name}
                            loading="lazy"
                            className="w-10 h-10 object-cover rounded-lg border border-gray-100 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                            N/A
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 hidden sm:block">
                          {product.description}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                          {product.category?.name ?? '—'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        ${product.price.toFixed(2)}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <StockBadge stock={product.stock} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/products/${product._id}/edit`)
                            }
                            aria-label={`Edit ${product.name}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            aria-label={`Delete ${product.name}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

              {/* Empty state */}
              {!loading && products.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <p className="text-sm">{translate('admin.products.empty')}</p>
                    {debouncedSearch && (
                      <button
                        type="button"
                        onClick={() => setSearchInput('')}
                        className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {translate('admin.products.clearSearch')}
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {translate('admin.products.showing')
                .replace('{{from}}', String(startItem))
                .replace('{{to}}', String(endItem))
                .replace('{{total}}', String(totalItems))}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                aria-label="Previous page"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum =
                  totalPages <= 5
                    ? i + 1
                    : Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!pagination.hasNextPage}
                aria-label="Next page"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      <DeleteModal
        isOpen={deleteTarget !== null}
        productName={deleteTarget?.name ?? ''}
        isLoading={deleteLoading}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
