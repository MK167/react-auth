import type { Meta, StoryObj } from '@storybook/react-vite';
import GlobalLoader from './GlobalLoader';

const meta = {
  title: 'Common/GlobalLoader',
  component: GlobalLoader,
  tags: ['autodocs'],
} satisfies Meta<typeof GlobalLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {
  args: {
    show: true,
  },
};

export const Hidden: Story = {
  args: {
    show: false,
  },
};
