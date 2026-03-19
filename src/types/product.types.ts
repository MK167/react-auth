/**
 * @fileoverview Product and ecommerce type definitions.
 *
 * This module provides the full TypeScript type surface for all product-related
 * data structures consumed by the admin dashboard and the user-facing ecommerce
 * storefront. Every type is modelled against the FreeAPI ecommerce API response
 * envelope so that component code can rely on strict structural contracts rather
 * than casting `unknown` values.
 *
 * **Architectural rationale:**
 * Centralising domain types in `src/types/` keeps component files thin and
 * ensures that any change to the API contract is surfaced as a single compile
 * error rather than scattered implicit-any assumptions across the codebase.
 *
 * @module types/product.types
 */

// ---------------------------------------------------------------------------
// Sub-entities
// ---------------------------------------------------------------------------

/**
 * Represents a product category returned by the FreeAPI `/ecommerce/categories`
 * endpoint. Categories are used both as filter facets in the product list and
 * as form options when creating or editing a product.
 */
export type ProductCategory = {
  /** MongoDB ObjectId string for the category */
  _id: string;
  /** Human-readable category name (e.g. "Electronics") */
  name: string;
  /** URL-friendly slug derived from the name (e.g. "electronics") */
  slug: string;
  /** User ID of the admin who created this category */
  owner: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
};

/**
 * Represents a single image asset associated with a product.
 * Products have one `mainImage` and zero-or-more `subImages`.
 */
export type ProductImage = {
  /** MongoDB ObjectId string for the image record */
  _id: string;
  /**
   * Public HTTP(S) URL through which the image can be loaded directly
   * inside an `<img>` tag. This is what the UI should always use.
   */
  url: string;
  /**
   * Server-side filesystem path stored for internal use. Not a usable URL
   * from the browser; rely on `url` for rendering.
   */
  localPath: string;
};

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

/**
 * Represents a complete product entity as returned by the FreeAPI ecommerce
 * endpoints. This type is used across the admin CRUD pages, the product grid,
 * the product detail page, and the cart.
 *
 * **Note on `category`:** The list and single-product endpoints both return the
 * populated `ProductCategory` object, not just an ID string. If you ever call
 * an endpoint that returns only the ID, use `string` for that specific response
 * type rather than casting this type.
 */
export type Product = {
  /** MongoDB ObjectId string */
  _id: string;
  /** Product display name */
  name: string;
  /** Long-form product description displayed on the detail page */
  description: string;
  /** Unit price in the API's default currency (USD for FreeAPI) */
  price: number;
  /** Available inventory units */
  stock: number;
  /** Populated category object — never just an ID in normal API responses */
  category: ProductCategory;
  /** Primary image shown in cards and at the top of the detail page */
  mainImage: ProductImage;
  /** Gallery images shown below the main image on the detail page */
  subImages: ProductImage[];
  /** User ID of the product owner/creator */
  owner: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Pagination & API response envelopes
// ---------------------------------------------------------------------------

/**
 * Generic pagination metadata that the FreeAPI returns in every paginated
 * list response. Parameterised over the item type so that
 * `PaginatedData<Product>` and `PaginatedData<ProductCategory>` each carry
 * their own properly-typed `data` array.
 *
 * @template T - The type of items in the `data` array.
 */
export type PaginatedData<T> = {
  /** Items on the current page */
  data: T[];
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items returned per page */
  limit: number;
  /** Total number of pages given the current `limit` */
  totalPages: number;
  /** Total number of matching items across all pages */
  totalItems: number;
  /** `true` when a page before this one exists */
  hasPrevPage: boolean;
  /** `true` when a page after this one exists */
  hasNextPage: boolean;
  /** Previous page number, or `null` when on the first page */
  prevPage: number | null;
  /** Next page number, or `null` when on the last page */
  nextPage: number | null;
};

/**
 * Top-level response envelope that wraps every FreeAPI response body.
 * API service functions should unwrap this and return only `data` to callers.
 *
 * @template T - The type of the `data` payload.
 */
export type ApiResponse<T> = {
  /** `true` for 2xx responses, `false` for errors (rarely used; prefer try/catch) */
  success: boolean;
  /** HTTP status code mirrored in the body */
  statusCode: number;
  /** Human-readable message suitable for toasts or log entries */
  message: string;
  /** Actual response payload */
  data: T;
};

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

/**
 * Query parameters accepted by `GET /api/v1/ecommerce/products`.
 * All fields are optional; the server applies sensible defaults.
 */
export type ProductListParams = {
  /** Page number for pagination — defaults to `1` */
  page?: number;
  /** Items per page — defaults to `10` */
  limit?: number;
  /**
   * Free-text search string. The API performs a case-insensitive substring
   * match on the product name.
   */
  q?: string;
  /**
   * Field to sort by.
   * - `price` — sort by unit price
   * - `name` — alphabetical sort
   * - `createdAt` — sort by creation time (default)
   */
  sortBy?: 'price' | 'name' | 'createdAt';
  /** Sort direction — `asc` or `desc` (default `desc`) */
  sortType?: 'asc' | 'desc';
  /** Category `_id` string to restrict results to a single category */
  category?: string;
};
