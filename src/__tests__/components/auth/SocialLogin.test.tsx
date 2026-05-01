import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SocialLogin from '@/components/auth/social-media-auth/SocialLogin';

const mockHandleSocialLogin = vi.fn();

vi.mock('@/hooks/useSocialAuth', () => ({
  useSocialAuth: () => ({
    handleSocialLogin: mockHandleSocialLogin,
    loading: null,
    error: null,
  }),
}));

describe('SocialLogin', () => {
  it('renders Google, Microsoft, and Facebook buttons', () => {
    render(<SocialLogin />);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
  });

  it('calls handleSocialLogin("google") when Google button is clicked', async () => {
    render(<SocialLogin />);
    await userEvent.click(screen.getByRole('button', { name: /google/i }));
    expect(mockHandleSocialLogin).toHaveBeenCalledWith('google');
  });

  it('calls handleSocialLogin("microsoft") when Microsoft button is clicked', async () => {
    render(<SocialLogin />);
    await userEvent.click(screen.getByRole('button', { name: /microsoft/i }));
    expect(mockHandleSocialLogin).toHaveBeenCalledWith('microsoft');
  });

  it('calls handleSocialLogin("facebook") when Facebook button is clicked', async () => {
    render(<SocialLogin />);
    await userEvent.click(screen.getByRole('button', { name: /facebook/i }));
    expect(mockHandleSocialLogin).toHaveBeenCalledWith('facebook');
  });
});
