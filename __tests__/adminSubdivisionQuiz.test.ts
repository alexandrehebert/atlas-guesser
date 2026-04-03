import { describe, expect, it } from 'vitest';
import { SUPPORTED_ADMIN_QUIZ_COUNTRIES } from '~/lib/adminQuizCountries';
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

  it('exposes federal districts and subjects for Russia with a districts default level', async () => {
    const quiz = await getAdminSubdivisionQuizPayload('russia');
    const federalDistricts = quiz.levels.find((level) => level.id === 'federal_districts');
    const subjects = quiz.levels.find((level) => level.id === 'subjects');

    expect(quiz.defaultLevelId).toBe('federal_districts');
    expect(federalDistricts?.areas.length ?? 0).toBeGreaterThan(0);
    expect(subjects?.areas.length ?? 0).toBeGreaterThan(0);
  });

  it('builds an Argentina provinces payload', async () => {
    const quiz = await getAdminSubdivisionQuizPayload('argentina');
    const provinces = quiz.levels.find((level) => level.id === 'provinces');

    expect(quiz.defaultLevelId).toBe('provinces');
    expect(quiz.countryCode).toBe('AR');
    expect(provinces?.areas.length ?? 0).toBeGreaterThan(0);

    const fullWidth = quiz.viewBox.width;
    const fullHeight = quiz.viewBox.height;
    const nearFullMapAreas = (provinces?.areas ?? []).filter((area) => (
      area.focusBounds.width >= fullWidth * 0.95
      && area.focusBounds.height >= fullHeight * 0.95
    ));

    expect(nearFullMapAreas.length).toBeLessThan(3);
  });

  it('builds a United Kingdom countries payload', async () => {
    const quiz = await getAdminSubdivisionQuizPayload('united-kingdom');
    const countries = quiz.levels.find((level) => level.id === 'countries');
    const counties = quiz.levels.find((level) => level.id === 'counties');

    expect(quiz.defaultLevelId).toBe('countries');
    expect(quiz.countryCode).toBe('GB');
    expect(countries?.areas).toHaveLength(4);
    expect(countries?.areas.map((area) => area.name).sort()).toEqual([
      'England',
      'Northern Ireland',
      'Scotland',
      'Wales',
    ]);
    expect(counties?.areas.length ?? 0).toBeGreaterThan(200);
  });

  it('builds an Algeria wilayas payload', async () => {
    const quiz = await getAdminSubdivisionQuizPayload('algeria');
    const wilayas = quiz.levels.find((level) => level.id === 'wilayas');

    expect(quiz.defaultLevelId).toBe('wilayas');
    expect(quiz.countryCode).toBe('DZ');
    expect(wilayas?.areas.length ?? 0).toBeGreaterThan(40);

    const areas = wilayas?.areas ?? [];
    const minX = Math.min(...areas.map((area) => area.focusBounds.x));
    const minY = Math.min(...areas.map((area) => area.focusBounds.y));
    const maxX = Math.max(...areas.map((area) => area.focusBounds.x + area.focusBounds.width));
    const maxY = Math.max(...areas.map((area) => area.focusBounds.y + area.focusBounds.height));
    const unionWidth = Math.max(1, maxX - minX);
    const unionHeight = Math.max(1, maxY - minY);

    const fitPadding = 24;
    const fitScaleFactor = 0.94;
    const inferredHomeZoom = Math.min(
      quiz.viewBox.width / (unionWidth + fitPadding * 2),
      quiz.viewBox.height / (unionHeight + fitPadding * 2),
    ) * fitScaleFactor;

    expect(inferredHomeZoom).toBeLessThan(2);
  });

  it('builds a Nigeria states payload', async () => {
    const quiz = await getAdminSubdivisionQuizPayload('nigeria');
    const states = quiz.levels.find((level) => level.id === 'states');

    expect(quiz.defaultLevelId).toBe('states');
    expect(quiz.countryCode).toBe('NG');
    expect(states?.areas).toHaveLength(37);
  });

  it('avoids inverted full-map geometries across subdivision datasets', async () => {
    for (const country of SUPPORTED_ADMIN_QUIZ_COUNTRIES) {
      const quiz = await getAdminSubdivisionQuizPayload(country);

      for (const level of quiz.levels) {
        if (level.areas.length <= 5) continue;

        const uniqueFocusBounds = new Set(
          level.areas.map((area) => {
            const x = area.focusBounds.x.toFixed(2);
            const y = area.focusBounds.y.toFixed(2);
            const width = area.focusBounds.width.toFixed(2);
            const height = area.focusBounds.height.toFixed(2);
            return `${x}:${y}:${width}:${height}`;
          }),
        );

        expect(uniqueFocusBounds.size).toBeGreaterThan(1);
      }
    }
  });
});