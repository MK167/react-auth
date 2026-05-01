import type { Meta, StoryObj } from '@storybook/react-vite';
import ErrorNotification from './ErrorNotification';

const meta = {
  title: 'Auth/ErrorNotification',
  component: ErrorNotification,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithError: Story = {
  args: {
    serverError: 'Invalid credentials. Please try again.',
  },
};

export const NoError: Story = {
  args: {
    serverError: null,
  },
};

export const CustomLabel: Story = {
  args: {
    serverError: 'This email address is already in use.',
    text: 'Registration failed:',
  },
};
