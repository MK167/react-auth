/**
 * @fileoverview User Orders History Page.
 *
 * Displays a list of the user's past orders. In a production system this
 * would call `GET /api/v1/ecommerce/orders` to fetch real order data.
 * For this implementation, mock orders are generated to demonstrate the UI.
 *
 * @module pages/user/OrdersPage
 */

import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type MockOrder = {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: number;
};

const MOCK_ORDERS: MockOrder[] = [
  { id: 'ORD-A3F9K1', date: '2026-03-15', status: 'delivered', total: 149.99, items: 2 },
  { id: 'ORD-B7X2M4', date: '2026-03-10', status: 'shipped', total: 89.5, items: 1 },
  { id: 'ORD-C1Z8P5', date: '2026-03-05', status: 'processing', total: 214.0, items: 3 },
  { id: 'ORD-D5Q3N7', date: '2026-02-28', status: 'delivered', total: 35.0, items: 1 },
  { id: 'ORD-E9R6T2', date: '2026-02-20', status: 'cancelled', total: 72.0, items: 2 },
];

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type StatusConfig = {
  label: string;
  icon: React.ReactNode;
  classes: string;
};

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    icon: <Clock size={13} />,
    classes: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  },
  processing: {
    label: 'Processing',
    icon: <Package size={13} />,
    classes: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  },
  shipped: {
    label: 'Shipped',
    icon: <Truck size={13} />,
    classes: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  },
  delivered: {
    label: 'Delivered',
    icon: <CheckCircle size={13} />,
    classes: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle size={13} />,
    classes: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Orders history page showing past and active orders with status badges.
 */
export default function OrdersPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Orders</h1>

      {MOCK_ORDERS.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 mb-4">You haven't placed any orders yet.</p>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Start shopping
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_ORDERS.map((order) => {
            const status = STATUS_CONFIG[order.status];
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Order info */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {order.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.classes}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        {new Date(order.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      <span>·</span>
                      <span>
                        {order.items} item{order.items !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Price + link */}
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      ${order.total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/products')}
                      aria-label={`View order ${order.id}`}
                      className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Details
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Status progress bar */}
                {order.status !== 'cancelled' && (
                  <div className="mt-4">
                    <div className="flex items-center gap-0">
                      {(['pending', 'processing', 'shipped', 'delivered'] as const).map(
                        (s, i, arr) => {
                          const steps: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered'];
                          const currentIdx = steps.indexOf(order.status as 'pending' | 'processing' | 'shipped' | 'delivered');
                          const isCompleted = i <= currentIdx;
                          return (
                            <div key={s} className="flex items-center flex-1 last:flex-none">
                              <div
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                                  isCompleted
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                }`}
                              />
                              {i < arr.length - 1 && (
                                <div
                                  className={`h-0.5 flex-1 mx-0 transition-colors ${
                                    i < currentIdx
                                      ? 'bg-indigo-600'
                                      : 'bg-gray-200 dark:bg-gray-600'
                                  }`}
                                />
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      {['Ordered', 'Processing', 'Shipped', 'Delivered'].map((label) => (
                        <span key={label} className="text-[10px] text-gray-400">{label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
