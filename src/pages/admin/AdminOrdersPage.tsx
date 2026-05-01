/**
 * @fileoverview Admin Orders Management Page.
 *
 * ## Responsibilities
 *
 * - Paginated table of all customer orders fetched from
 *   `GET /ecommerce/admin/orders`.
 * - Status filter dropdown to narrow results by `PENDING`, `DELIVERED`,
 *   or `CANCELLED`.
 * - Inline status update: admins change order status via a `<select>` in
 *   the actions column; the optimistic UI update patches the local state
 *   immediately for instant visual feedback.
 * - "View" button opens an order detail modal showing line items, pricing
 *   breakdown, coupon info, and payment status.
 * - Pagination controls with a sliding window of up to 5 page buttons.
 *
 * ## State flow
 *
 * ```
 * Mount / filter change → fetchOrders()
 *   ├── loading  → skeleton rows
 *   ├── success  → render table + pagination
 *   └── error    → error banner with retry
 *
 * Status change → updateOrderStatus() → optimistic local state update
 * View order    → open OrderDetailModal with selected order
 * ```
 *
 * ## Optimistic updates
 *
 * When an admin changes an order's status via the dropdown, `setOrders()`
 * patches the local state immediately so the badge updates without waiting
 * for a refetch. A spinner replaces the dropdown while the PATCH is in
 * flight (`updatingId`). If the request fails, the global error interceptor
 * handles it (or the component can add its own catch for inline feedback).
 *
 * @module pages/admin/AdminOrdersPage
 */

import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from 'react';
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { getAdminOrders, updateOrderStatus } from '@/api/orders.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n/use-i18n.hook';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { Order, OrderStatus } from '@/types/order.types';
import { ORDER_STATUSES } from '@/types/order.types';
import type { PaginatedData } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

type StatusConfig = {
  labelKey: string;
  classes: string;
  icon: React.ReactNode;
};

const STATUS_STYLES: Record<OrderStatus, StatusConfig> = {
  PENDING: {
    labelKey: 'admin.orders.status.pending',
    icon: <Clock size={11} />,
    classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  DELIVERED: {
    labelKey: 'admin.orders.status.delivered',
    icon: <CheckCircle size={11} />,
    classes: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  },
  CANCELLED: {
    labelKey: 'admin.orders.status.cancelled',
    icon: <XCircle size={11} />,
    classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const { translate } = useI18n();
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}
    >
      {cfg.icon}
      {translate(cfg.labelKey)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Order detail modal
// ---------------------------------------------------------------------------

/**
 * Full-screen-blurred modal showing line items, pricing, coupon, and payment
 * info for a single order. Opened via the eye-icon button in the table.
 */
function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { translate } = useI18n();
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2
              id="order-detail-title"
              className="text-sm font-semibold text-gray-900 dark:text-white"
            >
              Order #{order._id.slice(-8).toUpperCase()}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {order.customer?.username ?? '—'} · {order.customer?.email ?? ''} ·{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {order.items.map((item) => (
            <div key={item._id} className="flex items-center gap-3">
              {item.product.mainImage?.url ? (
                <img
                  src={item.product.mainImage.url}
                  alt={item.product.name}
                  loading="lazy"
                  className="w-12 h-12 object-cover rounded-lg border border-gray-100 dark:border-gray-700 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                  N/A
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {translate('admin.orders.modal.qty')} {item.quantity} &nbsp;·&nbsp; ${(item.product?.price ?? 0).toFixed(2)}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                ${((item.product?.price ?? 0) * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer — pricing + payment */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-1.5 flex-shrink-0">
          {(order.orderPrice ?? 0) !== (order.discountedOrderPrice ?? 0) && (
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{translate('admin.orders.modal.subtotal')}</span>
              <span>${(order.orderPrice ?? 0).toFixed(2)}</span>
            </div>
          )}
          {order.coupon && (
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>Coupon ({order.coupon.couponCode})</span>
              <span>−${((order.orderPrice ?? 0) - (order.discountedOrderPrice ?? 0)).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-700">
            <span>{translate('admin.orders.modal.total')}</span>
            <span>${(order.discountedOrderPrice ?? order.orderPrice ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-400">
              {order.paymentProvider} · {order.isPaymentDone ? translate('admin.orders.modal.paid') : translate('admin.orders.modal.paymentPending')}
            </span>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Admin orders table with pagination, status filter, inline status update,
 * and an order detail modal.
 */
export default function AdminOrdersPage() {
  usePageMeta('Orders', 'Manage and track all customer orders in ShopHub.');
  const { translate } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Omit<
    PaginatedData<unknown>,
    'data'
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  // Detail modal
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // Tracks the _id of the order whose status is currently being updated.
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch orders
  // ---------------------------------------------------------------------------

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setOrders(res.data.data ?? []);
      const { data: _data, ...meta } = res.data;
      setPagination(meta);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : null;
      setError(msg ?? 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // Reset to page 1 when the status filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // Status update (optimistic)
  // ---------------------------------------------------------------------------

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    setUpdatingId(order._id);
    try {
      await updateOrderStatus(order._id, newStatus);
      // Optimistic patch — update local state immediately for instant feedback
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, status: newStatus } : o)),
      );
    } finally {
      setUpdatingId(null);
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{translate('admin.orders.title')}</h1>
          {pagination && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {translate('admin.orders.totalOrders').replace('{{count}}', String(totalItems))}
            </p>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value as OrderStatus | '')
          }
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{translate('admin.orders.allStatuses')}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {translate(STATUS_STYLES[s].labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw size={13} />
            {translate('common.retry')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.orders.table.orderId')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                  {translate('admin.orders.table.customer')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                  {translate('admin.orders.table.items')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.orders.table.total')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.orders.table.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                  {translate('admin.orders.table.date')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {translate('admin.orders.table.actions')}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr
                      key={i}
                      aria-hidden="true"
                      className="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-4 w-8" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-8 w-24 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))
                : orders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      {/* Order ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">
                          {order.customer?.username ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {order.customer?.email ?? ''}
                        </p>
                      </td>

                      {/* Items count */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-700 dark:text-gray-300">
                          {order.items.length}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        ${(order.discountedOrderPrice ?? order.orderPrice ?? 0).toFixed(2)}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          {updatingId === order._id && (
                            <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions — status select + view button */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick status update */}
                          <select
                            value={order.status}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              void handleStatusChange(
                                order,
                                e.target.value as OrderStatus,
                              )
                            }
                            disabled={updatingId === order._id}
                            aria-label={`Change status for order #${order._id.slice(-8)}`}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {translate(STATUS_STYLES[s].labelKey)}
                              </option>
                            ))}
                          </select>

                          {/* View detail modal */}
                          <button
                            type="button"
                            onClick={() => setViewOrder(order)}
                            aria-label={`View details for order #${order._id.slice(-8)}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

              {/* Empty state */}
              {!loading && orders.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{translate('admin.orders.empty')}</p>
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
              {translate('admin.orders.showing')
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

      {/* Order detail modal */}
      {viewOrder && (
        <OrderDetailModal order={viewOrder} onClose={() => setViewOrder(null)} />
      )}
    </div>
  );
}
