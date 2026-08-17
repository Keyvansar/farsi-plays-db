import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Toaster } from 'sonner';
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

describe('LoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders heading, inputs and submit button', () => {
        render(<><Toaster /><LoginForm /></>);
        expect(screen.getByText('ورود همکاران')).toBeInTheDocument();

        // Querying by placeholder since the component doesn't use <label> tags
        expect(screen.getByPlaceholderText('ایمیل')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('رمز عبور')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ورود' })).toBeInTheDocument();
    });

    it('calls signInWithPassword with correct credentials on valid submit', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
        render(<><Toaster /><LoginForm /></>);

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
        render(<><Toaster /><LoginForm /></>);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'password123');

        await userEvent.click(screen.getByRole('button', { name: 'ورود' }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/submit');
        });
    });

    it('displays translated error message for invalid credentials', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: null,
            error: { message: 'Invalid login credentials' }
        });
        render(<><Toaster /><LoginForm /></>);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'wrongpassword');

        await userEvent.click(screen.getByRole('button', { name: 'ورود' }));

        await waitFor(() => {
            expect(screen.getByText('ایمیل یا رمز عبور اشتباه است.')).toBeInTheDocument();
        });
    });

    it('displays generic error message for other auth failures', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: null,
            error: { message: 'Network error' }
        });
        render(<><Toaster /><LoginForm /></>);

        await userEvent.type(screen.getByPlaceholderText('ایمیل'), 'test@example.com');
        await userEvent.type(screen.getByPlaceholderText('رمز عبور'), 'password123');

        await userEvent.click(screen.getByRole('button', { name: 'ورود' }));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });
});