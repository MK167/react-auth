/**
 * @fileoverview Arabic (RTL) translation strings.
 *
 * Satisfies the `Locale` type exported by `en.ts` so TypeScript validates
 * that every key present in English is also present here.
 *
 * ## RTL layout implications
 *
 * Arabic is a right-to-left language. Setting `dir="rtl"` on `<html>` (done
 * by `I18nProvider` in `i18n.context.tsx`) causes the browser to:
 *
 * - Flip block layout: content flows right-to-left.
 * - Mirror flex/grid containers: `flex-row` starts from the right.
 * - Mirror text alignment: default text aligns right.
 * - Mirror padding/margin: `pl-*` becomes leading (right) padding in RTL.
 * - Mirror absolutely-positioned elements: `left-0` becomes the right edge.
 *
 * Tailwind CSS v3 supports RTL via the `rtl:` variant prefix:
 * ```
 * className="pl-4 rtl:pr-4 rtl:pl-0"
 * ```
 * Where RTL-specific overrides are needed they should be added via `rtl:`
 * variants in the component files.
 *
 * ## Reading order
 *
 * Screen readers follow the `dir` attribute and read content in the correct
 * RTL order when `dir="rtl"` is set. The `lang="ar"` attribute additionally
 * instructs TTS engines to use Arabic phoneme rules.
 *
 * ## Keyboard navigation
 *
 * Arrow key behaviour in text inputs and sliders is automatically mirrored
 * by the browser when `dir="rtl"` is set — no JavaScript changes needed.
 *
 * @module i18n/locales/ar
 */

import type { Locale } from './en';

/**
 * Arabic translations.
 * Declared as `Locale` to get compile-time validation that every English key
 * has a matching Arabic translation.
 */
export const ar: Locale = {
  // ---- Navigation ----------------------------------------------------------
  nav: {
    home: 'الرئيسية',
    products: 'المنتجات',
    orders: 'الطلبات',
    profile: 'الملف الشخصي',
    cart: 'السلة',
    signOut: 'تسجيل الخروج',
    signIn: 'تسجيل الدخول',
    language: 'اللغة',
  },

  // ---- Home page -----------------------------------------------------------
  home: {
    hero: {
      badge: 'وصلت تشكيلة الموسم الجديد',
      title: 'اكتشف منتجات ستحبها',
      subtitle:
        'تصفح مجموعتنا المختارة من المنتجات الفاخرة. شحن سريع، إرجاع سهل، وأسعار لا تُقاوم.',
      shopNow: 'تسوق الآن',
      myOrders: 'طلباتي',
    },
    featured: {
      title: 'المنتجات المميزة',
      viewAll: 'عرض الكل',
    },
    empty: 'لا توجد منتجات متاحة حالياً.',
    features: {
      shipping: 'شحن مجاني',
      shippingDesc: 'على جميع الطلبات فوق 50$',
      returns: 'إرجاع سهل',
      returnsDesc: 'إرجاع مجاني خلال 30 يوماً',
      secure: 'دفع آمن',
      secureDesc: 'بياناتك محمية دائماً',
    },
  },

  // ---- Products list page --------------------------------------------------
  products: {
    title: 'جميع المنتجات',
    itemCount: '{{count}} منتج',
    search: 'البحث عن منتجات…',
    filters: 'الفلاتر',
    allCategories: 'جميع الفئات',
    sortBy: 'ترتيب حسب',
    noResults: 'لا توجد منتجات',
    noResultsHint: 'حاول تعديل البحث أو الفلاتر.',
    clearFilters: 'مسح الفلاتر',
    sort: {
      newestFirst: 'الأحدث أولاً',
      oldestFirst: 'الأقدم أولاً',
      priceLow: 'السعر: من الأقل إلى الأعلى',
      priceHigh: 'السعر: من الأعلى إلى الأقل',
      nameAZ: 'الاسم: أ–ي',
      nameZA: 'الاسم: ي–أ',
    },
  },

  // ---- Product detail page -------------------------------------------------
  product: {
    add: 'أضف',
    addToCart: 'أضف إلى السلة',
    addedToCart: 'تمت الإضافة!',
    buyNow: 'اشتري الآن',
    outOfStock: 'نفد المخزون',
    inStock: 'متوفر',
    available: 'متاح',
    qty: 'الكمية:',
    reviews: 'تقييمات',
    backToProducts: '→ العودة إلى المنتجات',
    wishlist: 'أضف إلى المفضلة',
    removeWishlist: 'إزالة من المفضلة',
    noImage: 'لا توجد صورة',
  },

  // ---- Cart page -----------------------------------------------------------
  cart: {
    title: 'السلة',
    emptyTitle: 'سلتك فارغة',
    emptySubtitle: 'أضف بعض المنتجات للبدء.',
    browseProducts: 'تصفح المنتجات',
    clearCart: 'إفراغ السلة',
    checkout: 'المتابعة للدفع',
    continueShopping: 'مواصلة التسوق',
    summary: 'ملخص الطلب',
    subtotal: 'الإجمالي الفرعي',
    shipping: 'الشحن',
    free: 'مجاني',
    tax: 'الضريبة (تقريبي)',
    total: 'الإجمالي',
    items: 'عناصر',
    noImage: 'لا صورة',
  },

  // ---- Checkout page -------------------------------------------------------
  checkout: {
    title: 'إتمام الطلب',
    shippingAddress: 'عنوان الشحن',
    payment: 'الدفع',
    secure: 'آمن',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    streetAddress: 'عنوان الشارع',
    city: 'المدينة',
    zip: 'الرمز البريدي',
    cardNumber: 'رقم البطاقة',
    expiry: 'تاريخ الانتهاء (MM/YY)',
    cvv: 'رمز الأمان',
    pay: 'ادفع',
    processing: 'جارٍ معالجة الدفع…',
    emptyCart: 'سلتك فارغة.',
    browseProducts: 'تصفح المنتجات',
    orderPlaced: 'تم تقديم الطلب!',
    thankYou: 'شكراً لشرائك.',
    viewOrders: 'عرض الطلبات',
    continueShopping: 'مواصلة التسوق',
    order: 'الطلب',
    shipping: 'الشحن',
    free: 'مجاني',
    tax: 'الضريبة (10%)',
    total: 'الإجمالي',
  },

  // ---- Orders page ---------------------------------------------------------
  orders: {
    title: 'طلباتي',
    empty: 'لم تقدم أي طلبات بعد.',
    startShopping: 'ابدأ التسوق',
    details: 'التفاصيل',
    item: 'عنصر',
    items: 'عناصر',
    status: {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغى',
    },
    steps: {
      ordered: 'تم الطلب',
      processing: 'المعالجة',
      shipped: 'الشحن',
      delivered: 'التسليم',
    },
  },

  // ---- Profile page --------------------------------------------------------
  profile: {
    title: 'ملفي الشخصي',
    accountDetails: 'تفاصيل الحساب',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    role: 'الدور',
    roleCustomer: 'عميل',
    roleAdmin: 'مدير',
    roleManager: 'مشرف',
    quickActions: 'إجراءات سريعة',
    myOrders: 'طلباتي',
    cart: 'السلة',
    adminPanel: 'لوحة الإدارة',
    signOut: 'تسجيل الخروج',
  },

  // ---- Common --------------------------------------------------------------
  common: {
    loading: 'جارٍ التحميل…',
    error: 'حدث خطأ',
    noImage: 'لا توجد صورة',
    add: 'أضف',
    remove: 'إزالة',
    cancel: 'إلغاء',
    save: 'حفظ',
    back: 'رجوع',
  },

  // ---- Auth pages ----------------------------------------------------------
  auth: {
    login: {
      title: 'مرحباً بعودتك!',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      forgotPassword: 'نسيت كلمة المرور؟',
      signingIn: 'جارٍ تسجيل الدخول…',
      continue: 'متابعة',
      noAccount: 'ليس لديك حساب؟',
      signUp: 'إنشاء حساب',
      backendError: 'خطأ من الخادم:',
    },
    register: {
      title: 'إنشاء حساب جديد',
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      creating: 'جارٍ الإنشاء…',
      create: 'إنشاء حساب',
      haveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
    },
  },

  // ---- Admin panel ---------------------------------------------------------
  admin: {
    nav: {
      dashboard: 'لوحة التحكم',
      products: 'المنتجات',
      categories: 'الفئات',
      orders: 'الطلبات',
      signOut: 'تسجيل الخروج',
    },
    products: {
      title: 'المنتجات',
      newProduct: 'منتج جديد',
      totalProducts: '{{count}} منتج',
      search: 'البحث عن منتجات…',
      allCategories: 'جميع الفئات',
      sort: {
        date: 'ترتيب: التاريخ',
        name: 'ترتيب: الاسم',
        price: 'ترتيب: السعر',
        descending: 'تنازلي',
        ascending: 'تصاعدي',
      },
      table: {
        image: 'الصورة',
        name: 'الاسم',
        category: 'الفئة',
        price: 'السعر',
        stock: 'المخزون',
        actions: 'الإجراءات',
      },
      empty: 'لا توجد منتجات.',
      clearSearch: 'مسح البحث',
      retry: 'إعادة المحاولة',
      showing: 'عرض {{from}}–{{to}} من {{total}}',
      outOfStock: 'نفد المخزون',
      lowStock: 'منخفض ({{count}})',
    },
    categories: {
      title: 'الفئات',
      newCategory: 'فئة جديدة',
      empty: 'لا توجد فئات.',
    },
    orders: {
      title: 'طلبات الإدارة',
      empty: 'لا توجد طلبات.',
    },
    deleteModal: {
      title: 'حذف المنتج؟',
      message: 'لا يمكن التراجع عن هذا الإجراء.',
      confirm: 'حذف',
      cancel: 'إلغاء',
    },
  },
};
