import { useEffect } from 'react';
import { useWatch, Control, UseFormSetValue } from 'react-hook-form';
import { EditionFormData } from '../schemas/editionSchema';

/**
 * Auto-calculates cast_total from men + women + nonspecific.
 * Skips calculation when cast_unknown is checked.
 * Used by both SubmitView and EditModal.
 *
 * @param control - React Hook Form control object
 * @param setValue - React Hook Form setValue function
 */
export function useCastTotal(
  control: Control<EditionFormData>,
  setValue: UseFormSetValue<EditionFormData>
): void {
  const castUnknown = useWatch({ control, name: 'cast_unknown' });
  const castMen = useWatch({ control, name: 'cast_men' });
  const castWomen = useWatch({ control, name: 'cast_women' });
  const castNonspecific = useWatch({ control, name: 'cast_nonspecific' });

  useEffect(() => {
    if (castUnknown) return;

    const men = parseInt(castMen as string) || 0;
    const women = parseInt(castWomen as string) || 0;
    const nonspecific = parseInt(castNonspecific as string) || 0;
    const total = men + women + nonspecific;

    setValue('cast_total', total > 0 ? total.toString() : '', { shouldDirty: false });
  }, [castMen, castWomen, castNonspecific, castUnknown, setValue]);
}