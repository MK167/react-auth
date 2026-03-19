/**
 * @fileoverview English (LTR) translation strings.
 *
 * This file is the **source of truth** for translation keys. Every key that
 * appears here MUST be present in every other locale file (TypeScript enforces
 * this via the `Locale` type exported below — other locale files import and
 * satisfy it).
 *
 * ## Adding a new translation key
 * 1. Add it here with an English value.
 * 2. The TypeScript compiler will produce a type error in other locale files
 *    until you add the matching key there too.
 *
 * @module i18n/locales/en
 */

/** The canonical translation shape. All other locales must satisfy this type. */
export const en = {
  // ---- Navigation ----------------------------------------------------------
  nav: {
    home: 'Home',
    products: 'Products',
    orders: 'Orders',
    profile: 'Profile',
    cart: 'Cart',
    signOut: 'Sign out',
    signIn: 'Sign in',
    language: 'Language',
  },

  // ---- Home page -----------------------------------------------------------
  home: {
    hero: {
      badge: 'New season arrivals',
      title: "Discover products you'll love",
      subtitle:
        'Browse our curated collection of premium products. Fast shipping, easy returns, and unbeatable prices.',
      shopNow: 'Shop now',
      myOrders: 'My orders',
    },
    featured: {
      title: 'Featured products',
      viewAll: 'View all',
    },
    empty: 'No products available right now.',
    features: {
      shipping: 'Free shipping',
      shippingDesc: 'On all orders over $50',
      returns: 'Easy returns',
      returnsDesc: '30-day hassle-free returns',
      secure: 'Secure checkout',
      secureDesc: 'Your data is always safe',
    },
  },

  // ---- Products list page --------------------------------------------------
  products: {
    title: 'All Products',
    itemCount: '{{count}} products',
    search: 'Search products…',
    filters: 'Filters',
    allCategories: 'All categories',
    sortBy: 'Sort by',
    noResults: 'No products found',
    noResultsHint: 'Try adjusting your search or filters.',
    clearFilters: 'Clear filters',
    sort: {
      newestFirst: 'Newest first',
      oldestFirst: 'Oldest first',
      priceLow: 'Price: Low to High',
      priceHigh: 'Price: High to Low',
      nameAZ: 'Name: A–Z',
      nameZA: 'Name: Z–A',
    },
  },

  // ---- Product detail page -------------------------------------------------
  product: {
    add: 'Add',
    addToCart: 'Add to cart',
    addedToCart: 'Added to cart!',
    buyNow: 'Buy now',
    outOfStock: 'Out of stock',
    inStock: 'In stock',
    available: 'available',
    qty: 'Qty:',
    reviews: 'reviews',
    backToProducts: '← Back to products',
    wishlist: 'Add to wishlist',
    removeWishlist: 'Remove from wishlist',
    noImage: 'No image available',
  },

  // ---- Cart page -----------------------------------------------------------
  cart: {
    title: 'Cart',
    emptyTitle: 'Your cart is empty',
    emptySubtitle: 'Add some products to your cart to get started.',
    browseProducts: 'Browse products',
    clearCart: 'Clear cart',
    checkout: 'Proceed to checkout',
    continueShopping: 'Continue shopping',
    summary: 'Order summary',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    free: 'Free',
    tax: 'Tax (est.)',
    total: 'Total',
    items: 'items',
    noImage: 'No img',
  },

  // ---- Checkout page -------------------------------------------------------
  checkout: {
    title: 'Checkout',
    shippingAddress: 'Shipping address',
    payment: 'Payment',
    secure: 'Secure',
    firstName: 'First name',
    lastName: 'Last name',
    streetAddress: 'Street address',
    city: 'City',
    zip: 'ZIP / Postal',
    cardNumber: 'Card number',
    expiry: 'Expiry (MM/YY)',
    cvv: 'CVV',
    pay: 'Pay',
    processing: 'Processing payment…',
    emptyCart: 'Your cart is empty.',
    browseProducts: 'Browse products',
    orderPlaced: 'Order placed!',
    thankYou: 'Thank you for your purchase.',
    viewOrders: 'View orders',
    continueShopping: 'Continue shopping',
    order: 'Order',
    shipping: 'Shipping',
    free: 'Free',
    tax: 'Tax (10%)',
    total: 'Total',
  },

  // ---- Orders page ---------------------------------------------------------
  orders: {
    title: 'My Orders',
    empty: "You haven't placed any orders yet.",
    startShopping: 'Start shopping',
    details: 'Details',
    item: 'item',
    items: 'items',
    status: {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
    steps: {
      ordered: 'Ordered',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
    },
  },

  // ---- Profile page --------------------------------------------------------
  profile: {
    title: 'My Profile',
    accountDetails: 'Account details',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    roleCustomer: 'Customer',
    roleAdmin: 'Administrator',
    roleManager: 'Manager',
    quickActions: 'Quick actions',
    myOrders: 'My orders',
    cart: 'Cart',
    adminPanel: 'Admin panel',
    signOut: 'Sign out',
  },

  // ---- Common --------------------------------------------------------------
  common: {
    loading: 'Loading…',
    error: 'An error occurred',
    noImage: 'No image',
    add: 'Add',
    remove: 'Remove',
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
  },

  // ---- Auth pages ----------------------------------------------------------
  auth: {
    login: {
      title: 'Welcome back!',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      signingIn: 'Signing in…',
      continue: 'Continue',
      noAccount: "Don't have an account?",
      signUp: 'Sign up',
      backendError: 'Backend Error:',
    },
    register: {
      title: 'Create an account',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      creating: 'Creating account…',
      create: 'Create account',
      haveAccount: 'Already have an account?',
      signIn: 'Sign in',
    },
  },

  // ---- Admin panel ---------------------------------------------------------
  admin: {
    nav: {
      dashboard: 'Dashboard',
      products: 'Products',
      categories: 'Categories',
      orders: 'Orders',
      signOut: 'Sign out',
    },
    products: {
      title: 'Products',
      newProduct: 'New Product',
      totalProducts: '{{count}} total products',
      search: 'Search products…',
      allCategories: 'All categories',
      sort: {
        date: 'Sort: Date',
        name: 'Sort: Name',
        price: 'Sort: Price',
        descending: 'Descending',
        ascending: 'Ascending',
      },
      table: {
        image: 'Image',
        name: 'Name',
        category: 'Category',
        price: 'Price',
        stock: 'Stock',
        actions: 'Actions',
      },
      empty: 'No products found.',
      clearSearch: 'Clear search',
      retry: 'Retry',
      showing: 'Showing {{from}}–{{to}} of {{total}}',
      outOfStock: 'Out of stock',
      lowStock: 'Low ({{count}})',
    },
    categories: {
      title: 'Categories',
      newCategory: 'New Category',
      empty: 'No categories found.',
    },
    orders: {
      title: 'Admin Orders',
      empty: 'No orders found.',
    },
    deleteModal: {
      title: 'Delete product?',
      message: 'This action cannot be undone.',
      confirm: 'Delete',
      cancel: 'Cancel',
    },
  },
};

/** Inferred type of the English locale — used to type-check other locales. */
export type Locale = typeof en;
