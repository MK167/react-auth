/**
 * @fileoverview Order type definitions for the FreeAPI ecommerce module.
 *
 * Types are modelled against the FreeAPI `/ecommerce/admin/orders` endpoint
 * response envelope. All fields are documented to prevent guesswork when
 * consuming them in table rows, modals, and status update handlers.
 *
 * @module types/order.types
 */

import type { Product } from './product.types';

// ---------------------------------------------------------------------------
// Enums / constants
// ---------------------------------------------------------------------------

/**
 * The three fulfillment status values supported by the FreeAPI order engine.
 *
 * - `PENDING`   — order placed, not yet shipped.
 * - `DELIVERED` — order fulfilled and confirmed delivered.
 * - `CANCELLED` — order cancelled by customer or admin.
 */
export type OrderStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED';

/**
 * All valid `OrderStatus` values as a runtime array.
 * Used to populate status dropdowns and filter selects without duplicating
 * the literal union.
 */
export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'DELIVERED', 'CANCELLED'];

// ---------------------------------------------------------------------------
// Sub-entities
// ---------------------------------------------------------------------------

/**
 * Partial customer data embedded in each order.
 * Populated by the API from the user collection at query time.
 */
export type OrderCustomer = {
  /** MongoDB ObjectId of the customer */
  _id: string;
  /** Customer's display username */
  username: string;
  /** Customer's email address */
  email: string;
  /** Customer's role — typically 'USER' */
  role: string;
};

/**
 * A single line item within an order.
 * The `product` field is populated (full object), not just an ID string.
 */
export type OrderItem = {
  /** MongoDB ObjectId of this order-item document */
  _id: string;
  /** Fully populated product entity at time of order */
  product: Product;
  /** Number of units ordered */
  quantity: number;
};

/**
 * Coupon discount details when a discount code was applied at checkout.
 * `null` when no coupon was used.
 */
export type OrderCoupon = {
  /** The code the customer entered (e.g. "SAVE20") */
  couponCode: string;
  /** Human-readable name of the campaign */
  name: string;
  /** Discount amount — dollars for FLAT, percentage points for PERCENTAGE */
  discountValue: number;
};

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

/**
 * A complete order as returned by the FreeAPI admin orders endpoints.
 *
 * **Pricing fields:**
 * - `orderPrice` — subtotal before any coupon is applied.
 * - `discountedOrderPrice` — final amount the customer pays (show this in UI).
 *
 * When no coupon was applied, `orderPrice === discountedOrderPrice`.
 */
export type Order = {
  /** MongoDB ObjectId string */
  _id: string;
  /** Customer who placed the order (populated) */
  customer: OrderCustomer;
  /** Array of line items (products + quantities) */
  items: OrderItem[];
  /** Subtotal before coupon discount */
  orderPrice: number;
  /** Final total after coupon discount (display this to admins) */
  discountedOrderPrice: number;
  /** Applied coupon, or `null` if checkout was made without a discount code */
  coupon: OrderCoupon | null;
  /** Payment gateway used (e.g. 'RAZORPAY', 'PAYPAL') */
  paymentProvider: string;
  /** Gateway transaction reference ID */
  paymentId: string;
  /** Current fulfillment status */
  status: OrderStatus;
  /** Whether the payment gateway confirmed the payment */
  isPaymentDone: boolean;
  /** ISO 8601 order creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

/**
 * Query parameters accepted by `GET /api/v1/ecommerce/admin/orders`.
 */
export type OrderListParams = {
  /** Page number (1-indexed). Defaults to `1`. */
  page?: number;
  /** Items per page. Defaults to `10`. */
  limit?: number;
  /** Filter by status — omit to return all statuses */
  status?: OrderStatus;
};
