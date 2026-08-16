import { describe, it, expect } from 'vitest';
import { editionSchema } from './editionSchema';

describe('editionSchema', () => {
    const validPersianPlay = {
        title_fa: 'پاورچین',
        playwright_fa: 'بهرام بیضایی',
        source_language: 'fa',
        publication_status: 'published',
        is_in_collection: false,
        cast_unknown: false,
        tags: [],
        external_references: [],
    };

    it('passes for a valid Persian play without a translator', () => {
        const result = editionSchema.safeParse(validPersianPlay);
        expect(result.success).toBe(true);
    });

    it('fails if title_fa is missing or too short', () => {
        const invalid = { ...validPersianPlay, title_fa: 'ab' };
        const result = editionSchema.safeParse(invalid);
        expect(result.success).toBe(false);
        // Changed .errors to .issues for Zod v4 compatibility
        expect(result.error.issues[0].path).toContain('title_fa');
    });

    it('fails if playwright_fa is missing or too short', () => {
        const invalid = { ...validPersianPlay, playwright_fa: 'a' };
        const result = editionSchema.safeParse(invalid);
        expect(result.success).toBe(false);
        // Changed .errors to .issues for Zod v4 compatibility
        expect(result.error.issues[0].path).toContain('playwright_fa');
    });

    describe('translator_fa validation (refine logic)', () => {
        it('requires translator_fa if source_language is NOT "fa"', () => {
            const translatedPlay = { ...validPersianPlay, source_language: 'en', translator_fa: '' };
            const result = editionSchema.safeParse(translatedPlay);
            expect(result.success).toBe(false);
            // Changed .errors to .issues for Zod v4 compatibility
            expect(result.error.issues[0].message).toBe('نام مترجم برای آثار ترجمه شده الزامی است');
        });

        it('passes if source_language is NOT "fa" but translator_fa is provided', () => {
            const translatedPlay = { ...validPersianPlay, source_language: 'en', translator_fa: 'نجف دریابندری' };
            const result = editionSchema.safeParse(translatedPlay);
            expect(result.success).toBe(true);
        });

        it('passes if source_language is "fa" even if translator_fa is empty', () => {
            const nativePlay = { ...validPersianPlay, source_language: 'fa', translator_fa: '' };
            const result = editionSchema.safeParse(nativePlay);
            expect(result.success).toBe(true);
        });
    });

    it('validates external_references URL format', () => {
        const invalidLinks = {
            ...validPersianPlay,
            external_references: [{ url: 'not-a-url', ref_type: 'other' }]
        };
        const result = editionSchema.safeParse(invalidLinks);
        expect(result.success).toBe(false);
    });
});