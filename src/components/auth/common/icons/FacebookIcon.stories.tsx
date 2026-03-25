import type { Meta, StoryObj } from '@storybook/react-vite';
import { FacebookIcon } from './FacebookIcon';

const meta = {
  title: 'Auth/Icons/FacebookIcon',
  component: FacebookIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof FacebookIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
