/**
 * @fileoverview Admin Create Product Page.
 *
 * ## Form design
 *
 * The form uses `react-hook-form` with `zodResolver` — the same pattern used
 * by the existing Login and Register pages — to ensure validation is
 * consistent across the app. Field-level errors are displayed inline below
 * each input immediately after the user blurs the field (`mode: 'onBlur'`).
 *
 * ## Image upload
 *
 * The FreeAPI create product endpoint (`POST /ecommerce/admin/products`)
 * expects `multipart/form-data` because it handles file uploads. After the
 * form values pass Zod validation, a `FormData` object is built manually
 * from the validated values plus the image file picked by the user. This
 * `FormData` is then passed to `createProduct()` which sets the correct
 * `Content-Type: multipart/form-data` header.
 *
 * A local URL preview (`URL.createObjectURL`) lets the admin see the chosen
 * image before submitting without uploading anything until the form is
 * submitted.
 *
 * ## Navigation
 *
 * On successful creation the user is redirected to `/admin/products` via
 * `navigate('/admin/products', { replace: true })`.
 *
 * @module pages/admin/CreateProductPage
 */

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import { productSchema, type ProductFormValues } from '@/schemas/product.schema';
import { createProduct, getCategories } from '@/api/products.api';
import type { ProductCategory } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Admin form page for creating a new product.
 */
export default function CreateProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Fetch categories for the select field
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {
        // Non-fatal — the select will just be empty
      });
  }, []);

  // Clean up object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ProductFormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', String(data.price));
    formData.append('stock', String(data.stock));
    formData.append('category', data.category);
    if (imageFile) {
      formData.append('mainImage', imageFile);
    }

    try {
      await createProduct(formData);
      navigate('/admin/products', { replace: true });
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setServerError(msg || 'Failed to create product. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Back button + heading */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Back to products"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">New product</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the details below</p>
        </div>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-5"
      >
        {/* Product image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-40 object-contain rounded-lg"
              />
            ) : (
              <>
                <Upload size={28} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click to upload image
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            aria-label="Product image upload"
          />
          {imagePreview && (
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Remove image
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Product name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="name"
            {...register('name')}
            placeholder="e.g. Wireless Headphones Pro"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            placeholder="Describe the product in detail…"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? 'desc-error' : undefined}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {errors.description && (
            <p id="desc-error" className="mt-1 text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Price + Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Price (USD) <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              {...register('price')}
              placeholder="0.00"
              aria-invalid={errors.price ? true : undefined}
              aria-describedby={errors.price ? 'price-error' : undefined}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.price && (
              <p id="price-error" className="mt-1 text-xs text-red-500">{errors.price.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Stock <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              {...register('stock')}
              placeholder="0"
              aria-invalid={errors.stock ? true : undefined}
              aria-describedby={errors.stock ? 'stock-error' : undefined}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.stock && (
              <p id="stock-error" className="mt-1 text-xs text-red-500">{errors.stock.message}</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Category <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <select
            id="category"
            {...register('category')}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? 'cat-error' : undefined}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id="cat-error" className="mt-1 text-xs text-red-500">{errors.category.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSubmitting ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
}
