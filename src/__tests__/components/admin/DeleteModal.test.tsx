import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteModal from '@/components/admin/DeleteModal';

const baseProps = {
  isOpen: true,
  productName: 'Test Product',
  isLoading: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('DeleteModal', () => {
  describe('when closed (isOpen=false)', () => {
    it('renders nothing', () => {
      const { container } = render(<DeleteModal {...baseProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when open', () => {
    it('renders the modal dialog', () => {
      render(<DeleteModal {...baseProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays the product name in the body', () => {
      render(<DeleteModal {...baseProps} />);
      expect(screen.getByText(/Test Product/)).toBeInTheDocument();
    });

    it('shows the "Delete product" heading', () => {
      render(<DeleteModal {...baseProps} />);
      expect(screen.getByRole('heading', { name: /delete product/i })).toBeInTheDocument();
    });

    it('shows Cancel and Delete buttons', () => {
      render(<DeleteModal {...baseProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete product/i })).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', async () => {
      const onClose = vi.fn();
      render(<DeleteModal {...baseProps} onClose={onClose} />);
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when Delete is clicked', async () => {
      const onConfirm = vi.fn();
      render(<DeleteModal {...baseProps} onConfirm={onConfirm} />);
      await userEvent.click(screen.getByRole('button', { name: /delete product/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the close icon button is clicked', async () => {
      const onClose = vi.fn();
      render(<DeleteModal {...baseProps} onClose={onClose} />);
      await userEvent.click(screen.getByRole('button', { name: /close modal/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      render(<DeleteModal {...baseProps} onClose={onClose} />);
      // The backdrop has role="presentation"
      const backdrop = document.querySelector('[role="presentation"]')!;
      await userEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('when loading', () => {
    it('disables Cancel and Delete buttons', () => {
      render(<DeleteModal {...baseProps} isLoading />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
    });

    it('shows "Deleting…" text on the confirm button', () => {
      render(<DeleteModal {...baseProps} isLoading />);
      expect(screen.getByText('Deleting…')).toBeInTheDocument();
    });
  });
});
