/**
 * @fileoverview Ecommerce products API service.
 *
 * ## Responsibilities
 *
 * This module is the **sole integration point** between the frontend and the
 * FreeAPI ecommerce product endpoints. All component code that needs product
 * data must go through these functions rather than calling the Axios instance
 * directly. This ensures:
 *
 * 1. **Type safety** — every caller receives a properly-typed value.
 * 2. **Single change surface** — if the API base path or response shape
 *    changes, only this file needs updating.
 * 3. **Reuse of the shared Axios instance** — the existing `authUrl` instance
 *    (from `src/config/Define.ts`) already has the request interceptor that
 *    attaches the `Authorization: Bearer <token>` header and the response
 *    interceptor that handles silent token refresh. Reusing it means every
 *    product API call participates in that refresh cycle without any
 *    additional setup.
 *
 * ## Authentication & silent refresh interaction
 *
 * When a product API call returns `401` (access token expired), the Axios
 * interceptor in `src/api/axios.ts` automatically:
 * 1. Queues the failed request.
 * 2. Fires a refresh token call.
 * 3. Retries all queued requests with the new token.
 *
 * From the perspective of the component, the `await` simply resolves slightly
 * later — it never sees the 401. If the refresh itself fails (both tokens
 * expired), the interceptor calls `logout()` and redirects to `/login`,
 * so the component's `.catch()` handler will never be reached for that case
 * either.
 *
 * ## FormData for image uploads
 *
 * Product create and update endpoints accept `multipart/form-data` because
 * they include image file uploads. This module sets `Content-Type` to
 * `multipart/form-data` on those requests only; all read endpoints use the
 * default `application/json`.
 *
 * @module api/products.api
 */

import { authUrl } from '@/config/Define';
import type {
  ApiResponse,
  PaginatedData,
  Product,
  ProductCategory,
  ProductListParams,
} from '@/types/product.types';

// ---------------------------------------------------------------------------
// Product CRUD
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated, filterable list of products.
 *
 * Maps directly to `GET /api/v1/ecommerce/products`.
 *
 * @param params - Optional query parameters (page, limit, q, sortBy,
 *                 sortType, category). Undefined values are omitted from the
 *                 request so the server applies its own defaults.
 * @returns Paginated product data wrapped in the API response envelope.
 */
export async function getProducts(
  params?: ProductListParams,
): Promise<ApiResponse<PaginatedData<Product>>> {
  const response = await authUrl.get<ApiResponse<PaginatedData<Product>>>(
    '/ecommerce/products',
    { params },
  );
  return response.data;
}

/**
 * Fetches a single product by its MongoDB ObjectId.
 *
 * Maps to `GET /api/v1/ecommerce/products/:productId`.
 *
 * @param productId - The `_id` string of the product.
 * @returns The full product entity including populated category and images.
 */
export async function getProductById(
  productId: string,
): Promise<ApiResponse<Product>> {
  const response = await authUrl.get<ApiResponse<Product>>(
    `/ecommerce/products/${productId}`,
  );
  return response.data;
}

/**
 * Creates a new product. Requires ADMIN or MANAGER role.
 *
 * Maps to `POST /api/v1/ecommerce/admin/products`.
 *
 * The endpoint expects `multipart/form-data` because `mainImage` is a file
 * upload. The caller is responsible for constructing the `FormData` object;
 * this function sets the correct `Content-Type` header.
 *
 * @param formData - A `FormData` instance containing at minimum: `name`,
 *                   `description`, `price`, `stock`, `category`, `mainImage`.
 * @returns The newly created product entity.
 */
export async function createProduct(
  formData: FormData,
): Promise<ApiResponse<Product>> {
  const response = await authUrl.post<ApiResponse<Product>>(
    '/ecommerce/admin/products',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

/**
 * Updates an existing product by ID. Requires ADMIN or MANAGER role.
 *
 * Maps to `PATCH /api/v1/ecommerce/admin/products/:productId`.
 *
 * Accepts `multipart/form-data` to allow updating the product image. Only
 * the fields included in `formData` are updated (partial update semantics).
 *
 * @param productId - The `_id` of the product to update.
 * @param formData  - A `FormData` instance with the fields to update.
 * @returns The updated product entity.
 */
export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ApiResponse<Product>> {
  const response = await authUrl.patch<ApiResponse<Product>>(
    `/ecommerce/admin/products/${productId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

/**
 * Deletes a product by ID. Requires ADMIN or MANAGER role.
 *
 * Maps to `DELETE /api/v1/ecommerce/admin/products/:productId`.
 *
 * @param productId - The `_id` of the product to delete.
 * @returns The API response envelope (data payload is typically `null` for deletes).
 */
export async function deleteProduct(
  productId: string,
): Promise<ApiResponse<null>> {
  const response = await authUrl.delete<ApiResponse<null>>(
    `/ecommerce/admin/products/${productId}`,
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Fetches all product categories.
 *
 * Maps to `GET /api/v1/ecommerce/categories`.
 *
 * Used by the admin product form to populate the category `<select>` and by
 * the product list / grid pages to power the category filter.
 *
 * @returns Paginated list of categories. In practice this endpoint returns
 *          all categories without requiring pagination; use `data.data` for
 *          the raw array.
 */
export async function getCategories(): Promise<
  ApiResponse<PaginatedData<ProductCategory>>
> {
  const response = await authUrl.get<ApiResponse<PaginatedData<ProductCategory>>>(
    '/ecommerce/categories',
  );
  return response.data;
}
