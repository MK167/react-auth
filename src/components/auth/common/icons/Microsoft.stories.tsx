import type { Meta, StoryObj } from '@storybook/react-vite';
import { MicrosoftIcon } from './Microsoft';

const meta = {
  title: 'Auth/Icons/MicrosoftIcon',
  component: MicrosoftIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof MicrosoftIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
