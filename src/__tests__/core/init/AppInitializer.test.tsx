import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AppInitializer } from '@/core/init/AppInitializer';

vi.mock('@/core/init/init.store', () => ({
  useInitStore: vi.fn(),
}));

vi.mock('@/core/init/init.service', () => ({
  fetchInitBundles: vi.fn(),
  getStoredLang: vi.fn().mockReturnValue('en'),
}));

vi.mock('@/components/ui/InitSkeleton', () => ({
  default: () => <div data-testid="init-skeleton">Loading app…</div>,
}));

import { useInitStore } from '@/core/init/init.store';
import { fetchInitBundles } from '@/core/init/init.service';

const mockUseInitStore = useInitStore as unknown as ReturnType<typeof vi.fn>;
const mockFetchInitBundles = fetchInitBundles as ReturnType<typeof vi.fn>;

describe('AppInitializer', () => {
  describe('before bundles are ready', () => {
    it('renders InitSkeleton while isReady is false', () => {
      mockUseInitStore.mockImplementation((selector: (s: object) => unknown) =>
        selector({
          isReady: false,
          setLocaleBundle: vi.fn(),
          setErrorConfig: vi.fn(),
          setReady: vi.fn(),
        }),
      );
      mockFetchInitBundles.mockReturnValue(new Promise(() => {})); // never resolves

      render(
        <AppInitializer>
          <div>App Content</div>
        </AppInitializer>,
      );
      expect(screen.getByTestId('init-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('App Content')).toBeNull();
    });
  });

  describe('after bundles are ready', () => {
    it('renders children when isReady is true', () => {
      mockUseInitStore.mockImplementation((selector: (s: object) => unknown) =>
        selector({
          isReady: true,
          setLocaleBundle: vi.fn(),
          setErrorConfig: vi.fn(),
          setReady: vi.fn(),
        }),
      );
      mockFetchInitBundles.mockResolvedValue({ locale: {}, errorConfig: {} });

      render(
        <AppInitializer>
          <div>App Content</div>
        </AppInitializer>,
      );
      expect(screen.getByText('App Content')).toBeInTheDocument();
      expect(screen.queryByTestId('init-skeleton')).toBeNull();
    });
  });

  describe('fetchInitBundles side effect', () => {
    it('calls setReady after bundles resolve', async () => {
      const setReady = vi.fn();
      const setLocaleBundle = vi.fn();
      const setErrorConfig = vi.fn();

      // First call: isReady=false (triggers render + effect)
      mockUseInitStore.mockImplementation((selector: (s: object) => unknown) =>
        selector({ isReady: false, setLocaleBundle, setErrorConfig, setReady }),
      );
      mockFetchInitBundles.mockResolvedValue({ locale: { hello: 'world' }, errorConfig: { x: 1 } });

      render(
        <AppInitializer>
          <div>App</div>
        </AppInitializer>,
      );

      await waitFor(() => {
        expect(setReady).toHaveBeenCalled();
      });
      expect(setLocaleBundle).toHaveBeenCalledWith('en', { hello: 'world' });
      expect(setErrorConfig).toHaveBeenCalledWith({ x: 1 });
    });
  });
});
