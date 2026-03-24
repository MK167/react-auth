/**
 * @fileoverview Admin Edit Product Page.
 *
 * ## Loading existing data
 *
 * On mount the page reads `productId` from the URL via `useParams` and calls
 * `getProductById()`. Once the product loads, `reset()` from `react-hook-form`
 * pre-fills all form fields with the existing values. This is the standard
 * pattern for edit forms in react-hook-form — it avoids the need for
 * controlled inputs with individual `useState` variables.
 *
 * ## Image update
 *
 * If the admin picks a new image, it replaces the existing `mainImage` in the
 * `FormData` sent to `updateProduct()`. If no new file is chosen, the
 * `mainImage` field is omitted from `FormData` and the server retains the
 * existing image (PATCH semantics).
 *
 * @module pages/admin/EditProductPage
 */

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import { productSchema, type ProductFormValues } from '@/schemas/product.schema';
import { getProductById, updateProduct, getCategories } from '@/api/products.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { ProductCategory } from '@/types/product.types';

/**
 * Admin form page for editing an existing product.
 */
export default function EditProductPage() {
  usePageMeta('Edit Product', 'Update an existing product in the ShopHub catalog.');
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // ---------------------------------------------------------------------------
  // Load existing product
  // ---------------------------------------------------------------------------
  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoadingProduct(true);
    setLoadError(null);
    try {
      const res = await getProductById(productId);
      const p = res.data;
      reset({
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        category: p.category?._id ?? '',
      });
      setCurrentImageUrl(p.mainImage?.url ?? null);
    } catch {
      setLoadError('Failed to load product. Please go back and try again.');
    } finally {
      setLoadingProduct(false);
    }
  }, [productId, reset]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  // ---------------------------------------------------------------------------
  // Load categories
  // ---------------------------------------------------------------------------
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ProductFormValues) => {
    if (!productId) return;
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
      await updateProduct(productId, formData);
      navigate('/admin/products', { replace: true });
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setServerError(msg || 'Failed to update product. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Render: loading state
  // ---------------------------------------------------------------------------
  if (loadingProduct) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Render: load error
  if (loadError) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Back to products
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit product</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Update the product details</p>
        </div>
      </div>

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
        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            {imagePreview || currentImageUrl ? (
              <img
                src={imagePreview ?? (currentImageUrl as string)}
                alt="Product"
                className="max-h-40 object-contain rounded-lg"
              />
            ) : (
              <>
                <Upload size={28} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click to change image
                </p>
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
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Product name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="name"
            {...register('name')}
            aria-invalid={errors.name ? true : undefined}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
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
            aria-invalid={errors.description ? true : undefined}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
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
              {...register('price', { valueAsNumber: true })}
              aria-invalid={errors.price ? true : undefined}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Stock <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              {...register('stock', { valueAsNumber: true })}
              aria-invalid={errors.stock ? true : undefined}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.stock && <p className="mt-1 text-xs text-red-500">{errors.stock.message}</p>}
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
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
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
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
