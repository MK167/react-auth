import type { Meta, StoryObj } from '@storybook/react-vite';
import Divider from './Divider';

const meta = {
  title: 'Auth/Divider',
  component: Divider,
  tags: ['autodocs'],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
