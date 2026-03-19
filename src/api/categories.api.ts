/**
 * @fileoverview Admin category management API service.
 *
 * Provides CRUD operations for product categories. List/fetch is already
 * covered by `getCategories()` in `products.api.ts` (used by both admin
 * forms and public storefront filters). This module adds the write endpoints
 * that require ADMIN or MANAGER role.
 *
 * ## Authentication
 *
 * All functions in this module require an authenticated session. The shared
 * `authUrl` Axios instance automatically attaches the Bearer token and
 * handles silent token refresh — see `src/api/axios.ts` for details.
 *
 * @module api/categories.api
 */

import { authUrl } from '@/config/Define';
import type { ApiResponse, ProductCategory } from '@/types/product.types';

/**
 * Creates a new product category. Requires ADMIN or MANAGER role.
 *
 * Maps to `POST /api/v1/ecommerce/admin/categories`.
 *
 * The API auto-generates a URL-friendly `slug` from the provided name
 * (e.g. "Running Shoes" → "running-shoes"). The generated slug is returned
 * in the response and displayed in the admin table.
 *
 * @param name - Human-readable category name (e.g. "Electronics").
 * @returns The newly created `ProductCategory` entity.
 */
export async function createCategory(
  name: string,
): Promise<ApiResponse<ProductCategory>> {
  const response = await authUrl.post<ApiResponse<ProductCategory>>(
    '/ecommerce/admin/categories',
    { name },
  );
  return response.data;
}

/**
 * Updates an existing category's name. Requires ADMIN or MANAGER role.
 *
 * Maps to `PATCH /api/v1/ecommerce/admin/categories/:categoryId`.
 *
 * The API regenerates the `slug` from the new name on the server side.
 *
 * @param categoryId - MongoDB ObjectId string of the category to update.
 * @param name       - New human-readable name.
 * @returns The updated `ProductCategory` entity.
 */
export async function updateCategory(
  categoryId: string,
  name: string,
): Promise<ApiResponse<ProductCategory>> {
  const response = await authUrl.patch<ApiResponse<ProductCategory>>(
    `/ecommerce/admin/categories/${categoryId}`,
    { name },
  );
  return response.data;
}

/**
 * Deletes a category by ID. Requires ADMIN or MANAGER role.
 *
 * Maps to `DELETE /api/v1/ecommerce/admin/categories/:categoryId`.
 *
 * **Warning:** Products currently assigned to this category will have their
 * `category` field unset. Consider reassigning products before deleting.
 *
 * @param categoryId - MongoDB ObjectId string of the category to delete.
 * @returns API envelope with `null` data (standard for delete operations).
 */
export async function deleteCategory(
  categoryId: string,
): Promise<ApiResponse<null>> {
  const response = await authUrl.delete<ApiResponse<null>>(
    `/ecommerce/admin/categories/${categoryId}`,
  );
  return response.data;
}
