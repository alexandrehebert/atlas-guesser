import { describe, expect, it } from 'vitest';
import { SUPPORTED_ADMIN_QUIZ_COUNTRIES } from '~/lib/adminQuizCountries';
import { getAdminQuizCountryShapePreviews } from '~/lib/server/adminQuizCountryShapePreviews';

describe('getAdminQuizCountryShapePreviews', () => {
  it('builds a non-empty SVG path for every supported subdivision country', async () => {
    const previews = await getAdminQuizCountryShapePreviews();

    for (const country of SUPPORTED_ADMIN_QUIZ_COUNTRIES) {
      expect(previews[country].viewBox).toEqual({ width: 24, height: 24 });
      expect(previews[country].path.startsWith('M')).toBe(true);
      expect(previews[country].path.length).toBeGreaterThan(20);
    }
  });
});