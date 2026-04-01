import type { QuizCountry } from '~/lib/server/countryQuiz';
import type { GameMode, RoundState } from './types';

const MAX_TARGET_HISTORY = 8;
const MAX_OPTION_HISTORY = 12;
const OPTION_COUNT = 4;
const CLOSE_DISTRACTOR_CANDIDATES = 3;
const MAX_CLOSE_DISTRACTORS = 2;

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

function addDistractorsFromPool(
  distractorCodes: string[],
  pool: QuizCountry[],
  maxCount: number,
): void {
  for (const country of pool) {
    if (distractorCodes.length >= maxCount) {
      break;
    }

    if (distractorCodes.includes(country.code)) {
      continue;
    }

    distractorCodes.push(country.code);
  }
}

function getCloseDistractorCount(totalSlots: number, availableClose: number, availableFar: number): number {
  if (totalSlots <= 0 || availableClose <= 0) {
    return 0;
  }

  if (totalSlots === 1) {
    return 1;
  }

  const maxClose = Math.min(
    MAX_CLOSE_DISTRACTORS,
    availableClose,
    availableFar > 0 ? totalSlots - 1 : totalSlots,
  );

  if (maxClose <= 1) {
    return 1;
  }

  return 1 + Math.floor(Math.random() * maxClose);
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

  const closeCandidateCodes = new Set(
    allDistractors
      .slice(0, Math.min(CLOSE_DISTRACTOR_CANDIDATES, allDistractors.length))
      .map((country) => country.code),
  );

  const preferredCloseDistractors = preferredDistractors.filter((country) => closeCandidateCodes.has(country.code));
  const preferredFarDistractors = preferredDistractors.filter((country) => !closeCandidateCodes.has(country.code));
  const fallbackCloseDistractors = allDistractors.filter((country) => closeCandidateCodes.has(country.code));
  const fallbackFarDistractors = allDistractors.filter((country) => !closeCandidateCodes.has(country.code));

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const distractorCodes: string[] = [];
    const maxDistractors = optionCount - 1;

    if (mode === 'country-to-flag') {
      const closeDistractorCount = getCloseDistractorCount(
        maxDistractors,
        fallbackCloseDistractors.length,
        fallbackFarDistractors.length,
      );

      addDistractorsFromPool(distractorCodes, preferredCloseDistractors, closeDistractorCount);
      addDistractorsFromPool(distractorCodes, fallbackCloseDistractors, closeDistractorCount);
      addDistractorsFromPool(distractorCodes, shuffle(preferredFarDistractors), maxDistractors);
      addDistractorsFromPool(distractorCodes, shuffle(fallbackFarDistractors), maxDistractors);
      addDistractorsFromPool(distractorCodes, shuffle(preferredCloseDistractors), maxDistractors);
      addDistractorsFromPool(distractorCodes, shuffle(fallbackCloseDistractors), maxDistractors);
    } else {
      addDistractorsFromPool(distractorCodes, shuffle(preferredDistractors), maxDistractors);
      addDistractorsFromPool(distractorCodes, shuffle(allDistractors), maxDistractors);
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