import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { vi } from 'vitest';
import AppRouter from '@/routes/AppRouter';

// Stub all lazy-loaded pages so they resolve synchronously
vi.mock('@/pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('@/pages/Register', () => ({ default: () => <div>Register Page</div> }));
vi.mock('@/pages/NotFound', () => ({ default: () => <div>Not Found</div> }));
vi.mock('@/pages/Unauthorized', () => ({ default: () => <div>Unauthorized</div> }));
vi.mock('@/pages/Error', () => ({ default: () => <div>Error Page</div> }));
vi.mock('@/pages/user/HomePage', () => ({ default: () => <div>Home Page</div> }));
vi.mock('@/pages/user/ProductsPage', () => ({ default: () => <div>Products Page</div> }));
vi.mock('@/pages/user/ProductDetailPage', () => ({ default: () => <div>Product Detail</div> }));
vi.mock('@/pages/user/CartPage', () => ({ default: () => <div>Cart Page</div> }));
vi.mock('@/pages/user/WishlistPage', () => ({ default: () => <div>Wishlist Page</div> }));
vi.mock('@/pages/user/CheckoutPage', () => ({ default: () => <div>Checkout Page</div> }));
vi.mock('@/pages/user/OrdersPage', () => ({ default: () => <div>Orders Page</div> }));
vi.mock('@/pages/user/ProfilePage', () => ({ default: () => <div>Profile Page</div> }));
vi.mock('@/pages/admin/DashboardPage', () => ({ default: () => <div>Dashboard</div> }));
vi.mock('@/pages/admin/ProductsListPage', () => ({ default: () => <div>Admin Products</div> }));
vi.mock('@/pages/admin/CreateProductPage', () => ({ default: () => <div>Create Product</div> }));
vi.mock('@/pages/admin/EditProductPage', () => ({ default: () => <div>Edit Product</div> }));
vi.mock('@/pages/admin/CategoriesPage', () => ({ default: () => <div>Categories</div> }));
vi.mock('@/pages/admin/AdminOrdersPage', () => ({ default: () => <div>Admin Orders</div> }));
vi.mock('@/pages/admin/ErrorPlaygroundPage', () => ({ default: () => <div>Error Playground</div> }));
vi.mock('@/pages/admin/RealtimeChatPage', () => ({ default: () => <div>Realtime Chat</div> }));

vi.mock('@/layouts/AuthLayout', () => ({ default: () => <div><div data-testid="auth-layout-outlet" /></div> }));
vi.mock('@/layouts/UserLayout', () => ({
  default: () => <div><Outlet /></div>,
}));
vi.mock('@/layouts/AdminLayout', () => ({ default: () => <div>Admin Layout</div> }));
vi.mock('@/components/common/GlobalLoader', () => ({ default: () => null }));
vi.mock('@/core/errors/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/routes/ProtectedRoute', () => ({
  default: () => <Outlet />,
}));
vi.mock('@/routes/RoleGuard', () => ({
  default: () => <Outlet />,
}));
vi.mock('@/routes/WhitelistGuard', () => ({
  default: () => <Outlet />,
}));
vi.mock('@/routes/FeatureGuard', () => ({
  default: () => <Outlet />,
}));
vi.mock('@/routes/DeepLinkGuard', () => ({
  default: () => <Outlet />,
}));

function renderRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('AppRouter', () => {
  it('renders the home page at "/"', () => {
    renderRouter('/');
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders the products page at "/products"', async () => {
    renderRouter('/products');
    expect(await screen.findByText('Products Page')).toBeInTheDocument();
  });

  it('renders the cart page at "/cart"', async () => {
    renderRouter('/cart');
    expect(await screen.findByText('Cart Page')).toBeInTheDocument();
  });

  it('renders the wishlist page at "/wishlist"', async () => {
    renderRouter('/wishlist');
    expect(await screen.findByText('Wishlist Page')).toBeInTheDocument();
  });

  it('renders Not Found for unknown paths', async () => {
    renderRouter('/this-path-does-not-exist');
    expect(await screen.findByText('Not Found')).toBeInTheDocument();
  });

  it('renders the unauthorized page at "/unauthorized"', async () => {
    renderRouter('/unauthorized');
    expect(await screen.findByText('Unauthorized')).toBeInTheDocument();
  });

  it('renders the error page at "/error"', async () => {
    renderRouter('/error');
    expect(await screen.findByText('Error Page')).toBeInTheDocument();
  });
});
