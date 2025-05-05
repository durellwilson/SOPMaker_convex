import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignInForm } from '../SignInForm';

// Mock the auth hooks
vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    signIn: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('SignInForm', () => {
  it('renders the sign in form', () => {
    render(<SignInForm />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('toggles between sign in and sign up', () => {
    render(<SignInForm />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Sign up instead'));
    expect(screen.getByText('Sign up')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Sign in instead'));
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});