import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GlobalErrorRenderer from '@/core/errors/GlobalErrorRenderer';

vi.mock('@/core/errors/error.store', () => ({
  useErrorStore: vi.fn(),
}));

vi.mock('@/i18n/use-i18n.hook', () => ({
  useI18n: () => ({ translate: (key: string, fallback?: string) => fallback ?? key }),
}));

import { useErrorStore } from '@/core/errors/error.store';
const mockUseErrorStore = useErrorStore as unknown as ReturnType<typeof vi.fn>;

const makeError = (overrides = {}) => ({
  id: 'err-1',
  code: 'NETWORK_ERROR',
  duration: 0,
  dismissible: true,
  onRetry: undefined,
  config: {
    titleKey: 'error.title',
    descriptionKey: 'error.desc',
    iconName: 'WifiOff',
    iconBgClass: 'bg-red-100',
    iconColorClass: 'text-red-500',
    primaryAction: { label: 'Go Home', redirectTo: '/' },
    secondaryAction: undefined,
  },
  ...overrides,
});

function setup(storeOverrides = {}) {
  const defaultStore = {
    pageError: null,
    modalError: null,
    toastQueue: [],
    clearPageError: vi.fn(),
    clearModalError: vi.fn(),
    removeToast: vi.fn(),
  };
  mockUseErrorStore.mockImplementation((selector: (s: typeof defaultStore) => unknown) =>
    selector({ ...defaultStore, ...storeOverrides }),
  );
}

function renderRenderer() {
  return render(
    <MemoryRouter>
      <GlobalErrorRenderer />
    </MemoryRouter>,
  );
}

describe('GlobalErrorRenderer', () => {
  describe('no active errors', () => {
    it('renders nothing visible', () => {
      setup();
      renderRenderer();
      // No portals should have content
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('page error', () => {
    it('renders the page error overlay with alertdialog role', () => {
      setup({ pageError: makeError() });
      renderRenderer();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('shows the error code in debug info', () => {
      setup({ pageError: makeError({ code: 'NETWORK_ERROR' }) });
      renderRenderer();
      expect(screen.getByText(/NETWORK_ERROR/)).toBeInTheDocument();
    });
  });

  describe('toast queue', () => {
    it('renders a toast for each entry in toastQueue', () => {
      setup({
        toastQueue: [
          makeError({ id: 't1' }),
          makeError({ id: 't2' }),
        ],
      });
      renderRenderer();
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
    });

    it('calls removeToast when dismiss button is clicked', () => {
      const removeToast = vi.fn();
      setup({
        toastQueue: [makeError({ id: 't1', dismissible: true })],
        removeToast,
      });
      renderRenderer();
      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(removeToast).toHaveBeenCalledWith('t1');
    });
  });

  describe('modal error', () => {
    it('renders the modal error dialog', () => {
      setup({ modalError: makeError() });
      renderRenderer();
      const dialogs = screen.getAllByRole('alertdialog');
      expect(dialogs.length).toBeGreaterThan(0);
    });
  });
});
