import type { Meta, StoryObj } from '@storybook/react-vite';
import DeleteModal from './DeleteModal';

const meta = {
  title: 'Admin/DeleteModal',
  component: DeleteModal,
  tags: ['autodocs'],
  args: {
    onConfirm: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof DeleteModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Open',
  args: {
    isOpen: true,
    productName: 'Wireless Noise-Cancelling Headphones',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    productName: 'Wireless Noise-Cancelling Headphones',
    isLoading: true,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    productName: 'Wireless Noise-Cancelling Headphones',
    isLoading: false,
  },
};
