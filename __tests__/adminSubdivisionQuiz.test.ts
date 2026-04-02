import { describe, expect, it } from 'vitest';
import { getAdminSubdivisionQuizPayload, getFranceAdminQuizPayload } from '~/lib/server/adminSubdivisionQuiz';

describe('getFranceAdminQuizPayload', () => {
  it('includes the overseas departments and regions in the playable France map', async () => {
    const quiz = await getFranceAdminQuizPayload();
    const departments = quiz.levels.find((level) => level.id === 'departements');
    const regions = quiz.levels.find((level) => level.id === 'regions');

    expect(departments?.areas).toHaveLength(101);
    expect(regions?.areas).toHaveLength(18);

    const overseasDepartmentCodes = ['971', '972', '973', '974', '976'];
    const overseasRegionCodes = ['01', '02', '03', '04', '06'];

    for (const code of overseasDepartmentCodes) {
      const area = departments?.areas.find((item) => item.code === code);
      expect(area?.path.length).toBeGreaterThan(0);
      expect(area?.centroid.x).toBeGreaterThan(0);
      expect(area?.centroid.x).toBeLessThan(quiz.viewBox.width);
      expect(area?.centroid.y).toBeGreaterThan(0);
      expect(area?.centroid.y).toBeLessThan(quiz.viewBox.height);
    }

    for (const code of overseasRegionCodes) {
      const area = regions?.areas.find((item) => item.code === code);
      expect(area?.path.length).toBeGreaterThan(0);
      expect(area?.centroid.x).toBeGreaterThan(0);
      expect(area?.centroid.x).toBeLessThan(quiz.viewBox.width);
      expect(area?.centroid.y).toBeGreaterThan(0);
      expect(area?.centroid.y).toBeLessThan(quiz.viewBox.height);
    }

    expect(departments?.sectionLabels).toHaveLength(1);
    expect(departments?.sectionLabels[0]?.labelKey).toBe('france_overseas');
    expect(regions?.sectionLabels).toHaveLength(1);
    expect(regions?.sectionLabels[0]?.labelKey).toBe('france_overseas');
  });
});

describe('getAdminSubdivisionQuizPayload', () => {
  it('adds inset section labels for the USA non-contiguous states', async () => {
    const quiz = await getAdminSubdivisionQuizPayload('usa');
    const states = quiz.levels.find((level) => level.id === 'states');

    expect(states?.sectionLabels.map((label) => label.labelKey)).toEqual(['generic_inset', 'generic_inset']);
  });
});