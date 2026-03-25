import type { Meta, StoryObj } from '@storybook/react-vite';
import InitSkeleton from './InitSkeleton';

const meta = {
  title: 'UI/InitSkeleton',
  component: InitSkeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof InitSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
