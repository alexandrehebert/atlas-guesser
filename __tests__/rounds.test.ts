import { describe, expect, it, vi } from 'vitest';
import { createRound } from '~/components/game/rounds';
import type { QuizCountry } from '~/lib/server/countryQuiz';

function createCountry(code: string, x: number): QuizCountry {
  return {
    code,
    name: `Country ${code}`,
    capital: `Capital ${code}`,
    flag: `Flag ${code}`,
    path: `M${code}`,
    centroid: { x, y: 0 },
    capitalPoint: { x, y: 0 },
    focusBounds: { x: 0, y: 0, width: 10, height: 10 },
    latlng: [0, 0],
  };
}

describe('createRound', () => {
  it('limits country-to-flag rounds to one nearby distractor when possible', () => {
    const countries = [
      createCountry('AA', 0),
      createCountry('BB', 1),
      createCountry('CC', 2),
      createCountry('DD', 3),
      createCountry('EE', 20),
      createCountry('FF', 40),
    ];

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const round = createRound(countries, 'country-to-flag');
      const nearbyDistractors = round.optionCodes.filter((code) => ['BB', 'CC', 'DD'].includes(code));

      expect(round.targetCode).toBe('AA');
      expect(nearbyDistractors).toHaveLength(1);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('limits country-to-flag rounds to two nearby distractors when two are selected', () => {
    const countries = [
      createCountry('AA', 0),
      createCountry('BB', 1),
      createCountry('CC', 2),
      createCountry('DD', 3),
      createCountry('EE', 20),
      createCountry('FF', 40),
    ];

    const randomValues = [0, 0.99, 0, 0, 0, 0, 0, 0, 0, 0];
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0);

    try {
      const round = createRound(countries, 'country-to-flag');
      const nearbyDistractors = round.optionCodes.filter((code) => ['BB', 'CC', 'DD'].includes(code));

      expect(round.targetCode).toBe('AA');
      expect(nearbyDistractors).toHaveLength(2);
    } finally {
      randomSpy.mockRestore();
    }
  });
});