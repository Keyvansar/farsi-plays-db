import { z } from 'zod';

export const editionSchema = z.object({
  title_fa: z.string().min(3, 'عنوان باید حداقل ۳ حرف باشد'),
  playwright_fa: z.string().min(3, 'نام نویسنده الزامی است'),
  source_language: z.string().default('fa'),
  translator_fa: z.string().optional().default(''),
  publication_status: z.string().default('published'),
  publisher: z.string().optional().default(''),
  is_in_collection: z.boolean().default(false),
  collection_title: z.string().optional().default(''),
  original_title: z.string().optional().default(''),
  publication_year_solar: z.string().optional().default(''),
  publication_year_gregorian: z.string().optional().default(''),
  original_year: z.string().optional().default(''),
  isbn: z.string().optional().default(''),
  page_count: z.string().optional().default(''),
  cast_men: z.string().optional().default(''),
  cast_women: z.string().optional().default(''),
  cast_nonspecific: z.string().optional().default(''),
  cast_total: z.string().optional().default(''),
  cast_unknown: z.boolean().default(false),
  synopsis: z.string().optional().default(''),
  tags: z.array(z.string()).default([]),
  external_references: z.array(z.object({
    url: z.string().url('لینک نامعتبر است').or(z.literal('')),
    ref_type: z.string().default('other'),
  })).default([]),
  submitter_name: z.string().optional().default(''),
  submitter_email: z.string().email('ایمیل نامعتبر است').or(z.literal('')).optional().default(''),
}).refine(
  (data) => {
    if (data.source_language !== 'fa') {
      return data.translator_fa && data.translator_fa.trim().length >= 3;
    }
    return true;
  },
  { message: 'نام مترجم برای آثار ترجمه شده الزامی است', path: ['translator_fa'] }
);