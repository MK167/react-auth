/**
 * @fileoverview User Products Grid Page.
 *
 * Provides a searchable, filterable, sortable grid of all products with
 * pagination. Mirrors the admin products list in data fetching strategy but
 * uses a card-based grid layout appropriate for ecommerce browsing rather
 * than a management table.
 *
 * @module pages/user/ProductsPage
 */

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, SlidersHorizontal, ChevronLeft, ChevronRight, Star, Heart } from 'lucide-react';
import { getProducts, getCategories } from '@/api/products.api';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { toProductSlugId } from '@/utils/slug';
import { prefetchProductDetail } from '@/utils/prefetch';
import { useI18n } from '@/i18n/use-i18n.hook';
import type { Product, ProductCategory, PaginatedData } from '@/types/product.types';

const PAGE_SIZE = 12;

type SortOption = { labelKey: string; sortBy: 'name' | 'price' | 'createdAt'; sortType: 'asc' | 'desc' };

const SORT_OPTIONS: SortOption[] = [
  { labelKey: 'products.sort.newestFirst', sortBy: 'createdAt', sortType: 'desc' },
  { labelKey: 'products.sort.oldestFirst', sortBy: 'createdAt', sortType: 'asc' },
  { labelKey: 'products.sort.priceLow',    sortBy: 'price',     sortType: 'asc' },
  { labelKey: 'products.sort.priceHigh',   sortBy: 'price',     sortType: 'desc' },
  { labelKey: 'products.sort.nameAZ',      sortBy: 'name',      sortType: 'asc' },
  { labelKey: 'products.sort.nameZA',      sortBy: 'name',      sortType: 'desc' },
];

// Product card — reads wishlist store directly (self-contained)
function ProductCard({
  product,
  onAddToCart,
  onNavigate,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
  /** Receives the pre-built slug-id string (e.g. "nike-air-64c8f..."). */
  onNavigate: (slugId: string) => void;
}) {
  const { hasItem, toggleItem } = useWishlistStore();
  const { translate } = useI18n();
  const isWishlisted = hasItem(product._id);
  const slugId = toProductSlugId(product.name, product._id);

  return (
    // prefetchProductDetail fires on hover, downloading the ProductDetailPage
    // chunk while the user is still deciding — by click time it's cached.
    <article
      className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-200 hover:-translate-y-0.5"
      onMouseEnter={prefetchProductDetail}
      onFocus={prefetchProductDetail}
    >
      <div
        className="relative h-48 bg-gray-50 dark:bg-gray-700 overflow-hidden cursor-pointer"
        onClick={() => onNavigate(slugId)}
      >
        {product.mainImage?.url ? (
          <img
            src={product.mainImage.url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm">
            {translate('product.noImage')}
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-semibold px-3 py-1 rounded-full">
              {translate('product.outOfStock')}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {product.category?.name && (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
            {product.category.name}
          </span>
        )}
        <h3
          className="font-semibold text-gray-900 dark:text-white line-clamp-1 mt-2 mb-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          onClick={() => onNavigate(slugId)}
        >
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {product.description}
        </p>
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={11}
              className={i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">(4.0)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-900 dark:text-white">
            ${product.price.toFixed(2)}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Wishlist heart — local for guests, synced to server on login via useWishlistSync */}
            <button
              type="button"
              onClick={() => toggleItem(product._id)}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
              className={`p-1.5 rounded-lg border transition-colors ${
                isWishlisted
                  ? 'border-red-200 dark:border-red-800 text-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-200'
              }`}
            >
              <Heart size={13} className={isWishlisted ? 'fill-red-500' : ''} />
            </button>
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              aria-label={`Add ${product.name} to cart`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 text-xs font-medium rounded-lg transition-colors"
            >
              <ShoppingCart size={13} />
              {translate('product.add')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Full product catalogue grid with search, filters, sorting, and pagination.
 */
export default function ProductsPage() {
  const navigate = useNavigate();
  const { translate } = useI18n();
  const addItem = useCartStore((s) => s.addItem);
  // Wishlist state is read inside ProductCard directly (self-contained)

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedData<unknown>, 'data'> | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortIndex, setSortIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 400);
  const activeSort = SORT_OPTIONS[sortIndex] ?? SORT_OPTIONS[0];

  // Reset page on filter/search change
  useEffect(() => { setPage(1); }, [debouncedSearch, selectedCategory, sortIndex]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts({
        page,
        limit: PAGE_SIZE,
        q: debouncedSearch || undefined,
        sortBy: activeSort.sortBy,
        sortType: activeSort.sortType,
        category: selectedCategory || undefined,
      });
      setProducts(res.data.data ?? []);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: _data, ...meta } = res.data;
      setPagination(meta);
    } catch {
      // Silent — empty state is shown
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, activeSort, selectedCategory]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.data ?? []))
      .catch(() => {});
  }, []);

  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;

  return (
    <div>
      {/* Heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{translate('products.title')}</h1>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {totalItems} {translate('products.title').toLowerCase()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((f) => !f)}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {translate('products.filters')}
        </button>
      </div>

      {/* Search + filter bar */}
      <div className={`mb-6 space-y-3 ${showFilters ? '' : 'flex flex-col sm:flex-row sm:items-center gap-3 sm:space-y-0'}`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder={translate('products.search')}
            value={searchInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3">
            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{translate('products.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortIndex}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortIndex(Number(e.target.value))}
              className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SORT_OPTIONS.map((opt, i) => (
                <option key={opt.labelKey} value={i}>{translate(opt.labelKey)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onAddToCart={(p) => addItem(p, 1)}
                onNavigate={(slugId) => navigate(`/products/${slugId}`)}
              />
            ))}
      </div>

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg mb-2">{translate('products.noResults')}</p>
          <p className="text-sm mb-4">{translate('products.noResultsHint')}</p>
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSelectedCategory(''); }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {translate('products.clearFilters')}
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage}
            aria-label="Previous page"
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-300 px-4">
            {translate('common.page')} {page} {translate('common.of')} {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={!pagination.hasNextPage}
            aria-label="Next page"
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
