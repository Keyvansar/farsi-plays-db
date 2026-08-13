import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';

/**
 * Auto-calculates cast_total from men + women + nonspecific.
 * Skips calculation when cast_unknown is checked.
 * Used by both SubmitView and EditModal.
 */
export function useCastTotal(control, setValue) {
  const castUnknown = useWatch({ control, name: 'cast_unknown' });
  const castMen = useWatch({ control, name: 'cast_men' });
  const castWomen = useWatch({ control, name: 'cast_women' });
  const castNonspecific = useWatch({ control, name: 'cast_nonspecific' });

  useEffect(() => {
    if (castUnknown) return;
    const men = parseInt(castMen) || 0;
    const women = parseInt(castWomen) || 0;
    const nonspecific = parseInt(castNonspecific) || 0;
    const total = men + women + nonspecific;
    setValue('cast_total', total > 0 ? total.toString() : '', { shouldDirty: false });
  }, [castMen, castWomen, castNonspecific, castUnknown, setValue]);
}