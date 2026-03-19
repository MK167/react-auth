/**
 * @fileoverview Admin orders API service.
 *
 * Provides read and status-update operations for orders. Only ADMIN and
 * MANAGER roles can access these endpoints. The shared `authUrl` Axios
 * instance handles token injection and silent refresh automatically.
 *
 * @module api/orders.api
 */

import { authUrl } from '@/config/Define';
import type { ApiResponse, PaginatedData } from '@/types/product.types';
import type { Order, OrderListParams, OrderStatus } from '@/types/order.types';

/**
 * Fetches a paginated list of all customer orders. Requires ADMIN or MANAGER.
 *
 * Maps to `GET /api/v1/ecommerce/admin/orders`.
 *
 * @param params - Optional query parameters (page, limit, status filter).
 * @returns Paginated order list wrapped in the API response envelope.
 */
export async function getAdminOrders(
  params?: OrderListParams,
): Promise<ApiResponse<PaginatedData<Order>>> {
  const response = await authUrl.get<ApiResponse<PaginatedData<Order>>>(
    '/ecommerce/admin/orders',
    { params },
  );
  return response.data;
}

/**
 * Fetches a single order by ID. Requires ADMIN or MANAGER.
 *
 * Maps to `GET /api/v1/ecommerce/admin/orders/:orderId`.
 *
 * @param orderId - MongoDB ObjectId string of the order.
 * @returns The full order entity with populated customer and product data.
 */
export async function getAdminOrderById(
  orderId: string,
): Promise<ApiResponse<Order>> {
  const response = await authUrl.get<ApiResponse<Order>>(
    `/ecommerce/admin/orders/${orderId}`,
  );
  return response.data;
}

/**
 * Updates the fulfillment status of an order. Requires ADMIN or MANAGER.
 *
 * Maps to `PATCH /api/v1/ecommerce/admin/orders/:orderId/status`.
 *
 * Valid transitions: PENDING → DELIVERED | CANCELLED. The API enforces
 * valid status values server-side and returns a 400 for invalid transitions.
 *
 * @param orderId - MongoDB ObjectId string of the order to update.
 * @param status  - New fulfillment status.
 * @returns The updated order entity reflecting the new status.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ApiResponse<Order>> {
  const response = await authUrl.patch<ApiResponse<Order>>(
    `/ecommerce/admin/orders/${orderId}/status`,
    { status },
  );
  return response.data;
}
