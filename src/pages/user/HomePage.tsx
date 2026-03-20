/**
 * @fileoverview User-facing Home Page — hero + featured products.
 *
 * ## Sections
 *
 * 1. **Hero** — gradient banner with headline, subtitle, and CTAs.
 * 2. **Featured products grid** — fetches the first 8 products from the API.
 *    - Cards navigate to SEO slug URLs via `toProductSlugId()`.
 *    - Wishlist heart toggled via `useWishlistStore` (localStorage for guests).
 *    - `onMouseEnter` / `onFocus` triggers `prefetchProductDetail()` to start
 *      downloading the ProductDetailPage chunk while the user is hovering.
 * 3. **Store features strip** — shipping, returns, secure checkout badges.
 *
 * @module pages/user/HomePage
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowRight, Star, Heart } from 'lucide-react';
import { getProducts } from '@/api/products.api';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { toProductSlugId } from '@/utils/slug';
import { prefetchProductDetail } from '@/utils/prefetch';
import { useI18n } from '@/i18n/use-i18n.hook';
import type { Product } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Product card sub-component
// ---------------------------------------------------------------------------

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onNavigate: (slugId: string) => void;
}

function ProductCard({ product, onAddToCart, onNavigate }: ProductCardProps) {
  const { hasItem, toggleItem } = useWishlistStore();
  const { translate } = useI18n();
  const isWishlisted = hasItem(product._id);
  const slugId = toProductSlugId(product.name, product._id);

  return (
    <article
      className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-200 hover:-translate-y-0.5"
      onMouseEnter={prefetchProductDetail}
      onFocus={prefetchProductDetail}
    >
      {/* Image */}
      <div
        className="relative h-52 bg-gray-50 dark:bg-gray-700 overflow-hidden cursor-pointer"
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

        {/* Wishlist heart overlaid on image */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleItem(product._id); }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          className={`absolute top-2 end-2 p-1.5 rounded-full backdrop-blur-sm transition-colors ${
            isWishlisted
              ? 'bg-red-500/90 text-white'
              : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-red-400'
          }`}
        >
          <Heart size={14} className={isWishlisted ? 'fill-white' : ''} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Category */}
        {product.category?.name && (
          <span className="inline-block text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full mb-2">
            {product.category.name}
          </span>
        )}

        {/* Name */}
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1">
          {product.name}
        </h3>

        {/* Mock rating */}
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">(4.0)</span>
        </div>

        {/* Price + cart button */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${product.price.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
            aria-label={`Add ${product.name} to cart`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-gray-500 text-xs font-medium rounded-lg transition-colors"
          >
            <ShoppingCart size={13} />
            {translate('product.add')}
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

/**
 * User-facing home page with hero banner and featured product grid.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { translate } = useI18n();
  const addItem = useCartStore((s) => s.addItem);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts({ page: 1, limit: 8, sortBy: 'createdAt', sortType: 'desc' })
      .then((res) => setProducts(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-label="Hero"
        className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 md:p-14 text-white"
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative max-w-xl">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-4">
            {translate('home.hero.badge')}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
            {translate('home.hero.title')}
          </h1>
          <p className="text-indigo-100 text-base md:text-lg mb-8 leading-relaxed">
            {translate('home.hero.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors text-sm"
            >
              {translate('home.hero.shopNow')}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="flex items-center gap-2 px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              {translate('home.hero.myOrders')}
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured products                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Featured products">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {translate('home.featured.title')}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            {translate('home.featured.viewAll')}
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={(p) => addItem(p, 1)}
                  onNavigate={(slugId) => navigate(`/products/${slugId}`)}
                />
              ))}
        </div>

        {!loading && products.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">{translate('home.empty')}</p>
          </div>
        )}
      </section>

      {/* Features strip */}
      <section
        aria-label="Store features"
        className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        {[
          { icon: '🚚', title: translate('home.features.shipping'), desc: translate('home.features.shippingDesc') },
          { icon: '↩️', title: translate('home.features.returns'),  desc: translate('home.features.returnsDesc') },
          { icon: '🔒', title: translate('home.features.secure'),   desc: translate('home.features.secureDesc') },
        ].map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
          >
            <span className="text-3xl">{feature.icon}</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {feature.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
