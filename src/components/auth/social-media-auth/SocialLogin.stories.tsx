import type { Meta, StoryObj } from '@storybook/react-vite';
import SocialLogin from './SocialLogin';

// Mock the useSocialAuth hook at the module level for Storybook
const meta = {
  title: 'Auth/SocialLogin',
  component: SocialLogin,
  tags: ['autodocs', '!test'],
  parameters: {
    docs: {
      description: {
        component: 'OAuth social login buttons for Google, Microsoft, and Facebook.',
      },
    },
  },
} satisfies Meta<typeof SocialLogin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
