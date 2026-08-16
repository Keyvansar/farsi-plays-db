import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCastTotal } from './useCastTotal';

// Mock react-hook-form's useWatch to control its return values
vi.mock('react-hook-form', async () => {
    const actual = await vi.importActual('react-hook-form');
    return {
        ...actual,
        useWatch: vi.fn(),
    };
});

import { useWatch } from 'react-hook-form';

describe('useCastTotal', () => {
    let mockSetValue;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSetValue = vi.fn();

        // Default mock return values for a standard calculation
        useWatch.mockImplementation(({ name }) => {
            if (name === 'cast_unknown') return false;
            if (name === 'cast_men') return '2';
            if (name === 'cast_women') return '3';
            if (name === 'cast_nonspecific') return '1';
            return '';
        });
    });

    it('calculates and sets total correctly when cast_unknown is false', () => {
        renderHook(() => useCastTotal({}, mockSetValue));
        // 2 men + 3 women + 1 nonspecific = 6
        expect(mockSetValue).toHaveBeenCalledWith('cast_total', '6', { shouldDirty: false });
    });

    it('does not calculate total if cast_unknown is true', () => {
        useWatch.mockImplementation(({ name }) => {
            if (name === 'cast_unknown') return true;
            if (name === 'cast_men') return '2';
            if (name === 'cast_women') return '3';
            if (name === 'cast_nonspecific') return '1';
            return '';
        });

        renderHook(() => useCastTotal({}, mockSetValue));
        expect(mockSetValue).not.toHaveBeenCalled();
    });

    it('handles empty or non-numeric inputs gracefully', () => {
        useWatch.mockImplementation(({ name }) => {
            if (name === 'cast_unknown') return false;
            if (name === 'cast_men') return '';
            if (name === 'cast_women') return 'abc';
            if (name === 'cast_nonspecific') return '4';
            return '';
        });

        renderHook(() => useCastTotal({}, mockSetValue));
        // 0 + 0 + 4 = 4
        expect(mockSetValue).toHaveBeenCalledWith('cast_total', '4', { shouldDirty: false });
    });

    it('sets empty string if total is 0', () => {
        useWatch.mockImplementation(({ name }) => {
            if (name === 'cast_unknown') return false;
            if (name === 'cast_men') return '0';
            if (name === 'cast_women') return '';
            if (name === 'cast_nonspecific') return '';
            return '';
        });

        renderHook(() => useCastTotal({}, mockSetValue));
        expect(mockSetValue).toHaveBeenCalledWith('cast_total', '', { shouldDirty: false });
    });
});