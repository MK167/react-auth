import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, ProductCardSkeleton, TableRowSkeleton } from './Skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'h-6 w-48',
  },
};

export const ProductCardSkeletonStory: StoryObj = {
  name: 'ProductCardSkeleton',
  render: () => <ProductCardSkeleton />,
};

export const TableRowSkeletonStory: StoryObj = {
  name: 'TableRowSkeleton',
  render: () => (
    <table>
      <tbody>
        <TableRowSkeleton />
      </tbody>
    </table>
  ),
};
