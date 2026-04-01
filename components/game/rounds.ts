import type { QuizCountry } from '~/lib/server/countryQuiz';
import type { GameMode, RoundState } from './types';

const MAX_TARGET_HISTORY = 8;
const MAX_OPTION_HISTORY = 12;
const OPTION_COUNT = 4;

export interface RoundHistory {
  recentTargetCodes: string[];
  recentOptionSignatures: string[];
}

interface CreateRoundOptions {
  previousCode?: string | null;
  history?: RoundHistory | null;
}

function getDistanceBetweenCountries(first: QuizCountry, second: QuizCountry): number {
  return Math.hypot(first.centroid.x - second.centroid.x, first.centroid.y - second.centroid.y);
}

function getPreferredDistractorOrder(
  countries: QuizCountry[],
  targetCountry: QuizCountry,
  mode: GameMode,
): QuizCountry[] {
  const distractors = countries.filter((country) => country.code !== targetCountry.code);

  if (mode !== 'country-to-flag') {
    return distractors;
  }

  return [...distractors].sort((first, second) => {
    return getDistanceBetweenCountries(first, targetCountry) - getDistanceBetweenCountries(second, targetCountry);
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }

  return copy;
}

function trimHistory(items: string[], maxSize: number): string[] {
  return items.length > maxSize ? items.slice(items.length - maxSize) : items;
}

function buildOptionSignature(optionCodes: string[]): string {
  return [...optionCodes].sort().join('|');
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

function createOptionCodes(
  countries: QuizCountry[],
  mode: GameMode,
  targetCode: string,
  history?: RoundHistory | null,
): string[] {
  const optionCount = Math.min(OPTION_COUNT, countries.length);
  if (optionCount <= 1) {
    return targetCode ? [targetCode] : [];
  }

  const targetCountry = countries.find((country) => country.code === targetCode);
  if (!targetCountry) {
    return [];
  }

  const allDistractors = getPreferredDistractorOrder(countries, targetCountry, mode);
  const recentTargets = new Set(history?.recentTargetCodes || []);
  const preferredDistractors = allDistractors.filter((country) => !recentTargets.has(country.code));
  const recentOptionSignatures = new Set(history?.recentOptionSignatures || []);
  let fallbackOptionCodes = [targetCode, ...allDistractors.slice(0, optionCount - 1).map((country) => country.code)];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const distractorCodes: string[] = [];
    const preferredPool = mode === 'country-to-flag'
      ? preferredDistractors
      : shuffle(preferredDistractors);
    const fallbackPool = mode === 'country-to-flag'
      ? allDistractors
      : shuffle(allDistractors);

    for (const country of preferredPool) {
      if (distractorCodes.length >= optionCount - 1) break;
      distractorCodes.push(country.code);
    }

    for (const country of fallbackPool) {
      if (distractorCodes.length >= optionCount - 1) break;
      if (distractorCodes.includes(country.code)) continue;
      distractorCodes.push(country.code);
    }

    const optionCodes = shuffle([targetCode, ...distractorCodes]);
    fallbackOptionCodes = optionCodes;

    if (!recentOptionSignatures.has(buildOptionSignature(optionCodes))) {
      return optionCodes;
    }
  }

  return fallbackOptionCodes;
}

export function createRound(
  countries: QuizCountry[],
  mode: GameMode,
  options: CreateRoundOptions = {},
): RoundState {
  if (!countries.length) {
    return { mode, targetCode: '', optionCodes: [] };
  }

  const previousCode = options.previousCode;
  const basePool = countries.length > 1 && previousCode
    ? countries.filter((country) => country.code !== previousCode)
    : countries;

  const recentTargets = new Set(options.history?.recentTargetCodes || []);
  const freshPool = basePool.filter((country) => !recentTargets.has(country.code));
  const targetPool = freshPool.length ? freshPool : basePool;
  const target = pickRandom(targetPool.length ? targetPool : countries);
  const optionCodes = createOptionCodes(countries, mode, target.code, options.history);

  return {
    mode,
    targetCode: target.code,
    optionCodes,
  };
}

export function createInitialRound(countries: QuizCountry[], mode: GameMode): RoundState {
  if (!countries.length) {
    return { mode, targetCode: '', optionCodes: [] };
  }

  const target = countries[0];
  const distractors = shuffle(countries.slice(1)).slice(0, OPTION_COUNT - 1);
  const optionCodes = shuffle([target, ...distractors].map((country) => country.code));
  return { mode, targetCode: target.code, optionCodes };
}

export function recordRoundHistory(
  history: RoundHistory | null | undefined,
  round: RoundState,
): RoundHistory {
  const nextRecentTargetCodes = round.targetCode
    ? trimHistory([...(history?.recentTargetCodes || []), round.targetCode], MAX_TARGET_HISTORY)
    : history?.recentTargetCodes || [];
  const nextRecentOptionSignatures = round.optionCodes.length
    ? trimHistory([...(history?.recentOptionSignatures || []), buildOptionSignature(round.optionCodes)], MAX_OPTION_HISTORY)
    : history?.recentOptionSignatures || [];

  return {
    recentTargetCodes: nextRecentTargetCodes,
    recentOptionSignatures: nextRecentOptionSignatures,
  };
}