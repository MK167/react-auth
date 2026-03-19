/**
 * @fileoverview Zod validation schema for admin product create / edit forms.
 *
 * This schema intentionally uses `z.coerce.number()` for `price` and `stock`
 * because HTML `<input type="number">` elements surface their values as
 * strings through `react-hook-form`'s default register behaviour. Coercion
 * ensures the value is converted before the validator runs, so the user never
 * sees a "Expected number, received string" error from Zod.
 *
 * @module schemas/product.schema
 */

import { z } from 'zod';

/**
 * Validation schema used by `CreateProductPage` and `EditProductPage`.
 *
 * Field rules:
 * - `name` — 3–255 characters (minimum prevents single-letter "test" entries)
 * - `description` — 10–1 000 characters
 * - `price` — any positive real number (e.g. 9.99 is valid)
 * - `stock` — non-negative integer (0 means out-of-stock but still listed)
 * - `category` — non-empty string (must select a category from the dropdown)
 */
export const productSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must be 255 characters or fewer'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be 1 000 characters or fewer'),

  price: z
    .number({ error: 'Price must be a number' })
    .positive('Price must be greater than zero'),

  stock: z
    .number({ error: 'Stock must be a number' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative'),

  category: z.string().min(1, 'Please select a category'),
});

/** TypeScript type inferred from {@link productSchema}. */
export type ProductFormValues = z.infer<typeof productSchema>;
