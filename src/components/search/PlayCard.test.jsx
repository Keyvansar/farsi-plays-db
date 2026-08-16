import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayCard from './PlayCard';

describe('PlayCard', () => {
    const mockEdition = {
        id: 1,
        title_fa: 'پاورچین',
        is_verified: true,
        publication_year_solar: '1390',
        publisher: 'نشر نی',
        page_count: '150',
        works: {
            playwright_fa: ['بهرام بیضایی'],
            source_language: 'fa'
        },
        edition_tags: [
            { taxonomy: { label_fa: 'تراژدی' } },
            { taxonomy: { label_fa: 'کلاسیک' } }
        ]
    };

    it('renders the play title and author correctly', () => {
        render(<PlayCard edition={mockEdition} onClick={vi.fn()} />);
        expect(screen.getByText('پاورچین')).toBeInTheDocument();
        expect(screen.getByText(/بهرام بیضایی/)).toBeInTheDocument();
    });

    it('renders the verification badge if is_verified is true', () => {
        render(<PlayCard edition={mockEdition} onClick={vi.fn()} />);
        expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('does not render translation badge if source_language is fa', () => {
        render(<PlayCard edition={mockEdition} onClick={vi.fn()} />);
        expect(screen.queryByText(/ترجمه/)).not.toBeInTheDocument();
    });

    it('renders translation badge if source_language is NOT fa', () => {
        const translatedEdition = { ...mockEdition, works: { ...mockEdition.works, source_language: 'en' } };
        render(<PlayCard edition={translatedEdition} onClick={vi.fn()} />);
        expect(screen.getByText(/ترجمه/)).toBeInTheDocument();
    });

    it('has accessible button role and is focusable via keyboard', () => {
        render(<PlayCard edition={mockEdition} onClick={vi.fn()} />);
        const cardButton = screen.getByRole('button');
        expect(cardButton).toBeInTheDocument();
        expect(cardButton).toHaveAttribute('tabindex', '0');
    });

    it('renders correct aria-label for screen readers', () => {
        render(<PlayCard edition={mockEdition} onClick={vi.fn()} />);
        const cardButton = screen.getByRole('button');
        expect(cardButton).toHaveAttribute('aria-label', `نمایش جزئیات نمایشنامه ${mockEdition.title_fa}`);
    });

    it('triggers onClick when clicked with a mouse', async () => {
        const mockOnClick = vi.fn();
        render(<PlayCard edition={mockEdition} onClick={mockOnClick} />);

        const cardButton = screen.getByRole('button');
        await userEvent.click(cardButton);

        expect(mockOnClick).toHaveBeenCalledTimes(1);
        expect(mockOnClick).toHaveBeenCalledWith(mockEdition);
    });

    it('triggers onClick when Enter key is pressed', async () => {
        const mockOnClick = vi.fn();
        render(<PlayCard edition={mockEdition} onClick={mockOnClick} />);

        const cardButton = screen.getByRole('button');
        cardButton.focus();
        await userEvent.keyboard('{Enter}');

        expect(mockOnClick).toHaveBeenCalledTimes(1);
        expect(mockOnClick).toHaveBeenCalledWith(mockEdition);
    });

    it('triggers onClick when Space key is pressed', async () => {
        const mockOnClick = vi.fn();
        render(<PlayCard edition={mockEdition} onClick={mockOnClick} />);

        const cardButton = screen.getByRole('button');
        cardButton.focus();
        await userEvent.keyboard(' '); // Space key

        expect(mockOnClick).toHaveBeenCalledTimes(1);
        expect(mockOnClick).toHaveBeenCalledWith(mockEdition);
    });
});