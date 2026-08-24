import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

// Mock the Supabase client
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
        },
    },
}));

// Mock Sonner so we can assert toast calls without mounting a <Toaster />
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

describe('LoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders heading, inputs and submit button', () => {
        render(<LoginForm />);
        expect(screen.getByText('ورود همکاران')).toBeInTheDocument();

        // Querying by placeholder since the component doesn't use <label> tags
        expect(screen.getByPlaceholderText('ایمیل')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('رمز عبور')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ورود' })).toBeInTheDocument();
    });

    it('calls signInWithPassword with correct credentials on valid submit', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
        render(<LoginForm />);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'password123');

        const submitButton = screen.getByRole('button', { name: 'ورود' });
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
        });
    });

    it('navigates to /submit on successful login', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
        render(<LoginForm />);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'password123');

        await userEvent.click(screen.getByRole('button', { name: 'ورود' }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/submit');
        });
    });

    it('shows translated toast for invalid credentials', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: null,
            error: { message: 'Invalid login credentials' }
        });
        render(<LoginForm />);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'wrongpassword');

        await userEvent.click(screen.getByRole('button', { name: 'ورود' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('ایمیل یا رمز عبور اشتباه است.');
        });
    });

    it('shows raw error toast for other auth failures', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: null,
            error: { message: 'Network error' }
        });
        render(<LoginForm />);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'password123');

        await userEvent.click(screen.getByRole('button', { name: 'ورود' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Network error');
        });
    });
});