import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import LoginPage from './LoginPage';

// Mock the AuthContext so we don't need a real Firebase/Auth setup
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    loading: false
  })
}));

describe('LoginPage', () => {
  it('renders login form properly', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Verify main headings or elements
    expect(screen.getByText(/Campus Resource Sharing/i)).toBeInTheDocument();
    
    // Verify email and password inputs
    expect(screen.getByLabelText(/Campus email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    
    // Verify submit button
    expect(screen.getByRole('button', { name: /Sign in to account/i })).toBeInTheDocument();
  });

  it('updates email and password inputs', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Campus email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    fireEvent.change(emailInput, { target: { value: 'test@student.college.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@student.college.edu');
    expect(passwordInput.value).toBe('password123');
  });
});
