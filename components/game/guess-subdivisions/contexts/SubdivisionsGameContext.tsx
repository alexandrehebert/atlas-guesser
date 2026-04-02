'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import type { AdminQuizLevel, AdminSubdivisionQuizPayload, QuizArea } from '~/lib/server/adminSubdivisionQuiz';

export type QuizLevelId = string;
export type SubdivisionsGameMode = 'map-click' | 'highlighted-to-name';

export interface ScoreState {
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
}

export interface AnswerState {
  selectedCode: string;
  correct: boolean;
}

interface MapSourceItem {
  filePath: string;
  sourceLabel: string;
  note: string;
  url?: string;
}

export interface MapSourceSection {
  id: string;
  title: string;
  items: MapSourceItem[];
}

const SCORE_STORAGE_KEY = 'atlas-guesser-subdivisions-score:v1';

function createDefaultScore(): ScoreState {
  return { correct: 0, total: 0, streak: 0, bestStreak: 0 };
}

function parseStoredScore(value: string | null): ScoreState {
  if (!value) {
    return createDefaultScore();
  }

  try {
    const parsed = JSON.parse(value) as Partial<ScoreState> | null;
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultScore();
    }

    const correct = Number.isFinite(parsed.correct) ? Math.max(0, parsed.correct as number) : 0;
    const total = Number.isFinite(parsed.total) ? Math.max(0, parsed.total as number) : 0;
    const streak = Number.isFinite(parsed.streak) ? Math.max(0, parsed.streak as number) : 0;
    const bestStreak = Number.isFinite(parsed.bestStreak) ? Math.max(0, parsed.bestStreak as number) : 0;

    return { correct, total, streak, bestStreak };
  } catch {
    return createDefaultScore();
  }
}

function pickNextTarget(areas: QuizArea[], previousCode: string | null): string {
  if (!areas.length) return '';
  const pool = previousCode && areas.length > 1
    ? areas.filter((item) => item.code !== previousCode)
    : areas;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex]?.code ?? areas[0].code;
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

function createOptionCodes(areas: QuizArea[], targetCode: string, randomize: boolean): string[] {
  if (!areas.length || !targetCode) return [];

  const optionCount = Math.min(4, areas.length);
  const distractors = areas.filter((area) => area.code !== targetCode);
  const selectedDistractors = (randomize ? shuffle(distractors) : distractors).slice(0, optionCount - 1);
  const base = [targetCode, ...selectedDistractors.map((area) => area.code)];
  return randomize ? shuffle(base) : base;
}

function getDefaultLevel(quiz: AdminSubdivisionQuizPayload): AdminQuizLevel | undefined {
  return quiz.levels.find((level) => level.id === quiz.defaultLevelId) ?? quiz.levels[0];
}

interface SubdivisionsGameContextValue {
  quiz: AdminSubdivisionQuizPayload;
  quizLevelId: QuizLevelId;
  gameMode: SubdivisionsGameMode;
  targetCode: string;
  targetArea: QuizArea | undefined;
  optionCodes: string[];
  answer: AnswerState | null;
  score: ScoreState;
  hoveredCode: string | null;
  activeLevel: AdminQuizLevel | undefined;
  activeAreas: QuizArea[];
  areasByCode: Map<string, QuizArea>;
  isChoiceMode: boolean;
  promptAreaLabel: string;
  promptBodyLabel: string;
  countryName: string;
  dataSourceSections: MapSourceSection[];
  switchQuizLevel: (levelId: QuizLevelId) => void;
  switchGameMode: (mode: SubdivisionsGameMode) => void;
  submitAnswer: (code: string) => void;
  nextRound: () => void;
  clearScore: () => void;
  setHoveredCode: (code: string | null) => void;
}

const SubdivisionsGameContext = createContext<SubdivisionsGameContextValue | null>(null);

interface SubdivisionsGameProviderProps {
  quiz: AdminSubdivisionQuizPayload;
  children: ReactNode;
}

export function SubdivisionsGameProvider({ quiz, children }: SubdivisionsGameProviderProps) {
  const t = useTranslations('subdivisionsGuesser');
  const defaultLevel = getDefaultLevel(quiz);

  const [quizLevelId, setQuizLevelId] = useState<QuizLevelId>(() => defaultLevel?.id ?? '');
  const [gameMode, setGameMode] = useState<SubdivisionsGameMode>('map-click');
  const [targetCode, setTargetCode] = useState(() => defaultLevel?.areas[0]?.code ?? '');
  const [optionCodes, setOptionCodes] = useState<string[]>(() =>
    createOptionCodes(defaultLevel?.areas ?? [], defaultLevel?.areas[0]?.code ?? '', false),
  );
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [score, setScore] = useState<ScoreState>(createDefaultScore);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [scoreLoaded, setScoreLoaded] = useState(false);
  const skipNextScorePersistRef = useRef(false);

  // Keep a stable ref so the suppressClick check in the map can call this without closure issues
  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setScore(parseStoredScore(window.localStorage.getItem(SCORE_STORAGE_KEY)));
    setScoreLoaded(true);
  }, []);

  useEffect(() => {
    if (!scoreLoaded || typeof window === 'undefined') {
      return;
    }

    if (skipNextScorePersistRef.current) {
      skipNextScorePersistRef.current = false;
      window.localStorage.removeItem(SCORE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(score));
  }, [score, scoreLoaded]);

  const activeLevel = quiz.levels.find((level) => level.id === quizLevelId) ?? defaultLevel;
  const activeAreas = activeLevel?.areas ?? [];
  const activeLevelId = activeLevel?.id ?? quiz.defaultLevelId;
  const countryName = t(`countries.${quiz.country}`);

  const areasByCode = useMemo(
    () => new Map(activeAreas.map((area) => [area.code, area])),
    [activeAreas],
  );

  const targetArea = areasByCode.get(targetCode) ?? activeAreas[0];
  const isChoiceMode = gameMode === 'highlighted-to-name';
  const promptAreaLabel = isChoiceMode ? '' : (targetArea?.name ?? '');
  const promptBodyLabel = isChoiceMode
    ? t(`prompt_body_choices.${activeLevelId}`, { countryName })
    : t(`prompt_body.${activeLevelId}`, { countryName });

  const dataSourceSections = useMemo<MapSourceSection[]>(() => {
    const playableItems: MapSourceItem[] = [];

    if (quiz.country === 'france') {
      playableItems.push(
        {
          filePath: 'public/maps/france-departements.geojson',
          sourceLabel: 'geo.api.gouv.fr / IGN',
          note: t('sources.france_note'),
          url: 'https://geo.api.gouv.fr/departements',
        },
        {
          filePath: 'public/maps/france-regions.geojson',
          sourceLabel: 'geo.api.gouv.fr / IGN',
          note: t('sources.france_note'),
          url: 'https://geo.api.gouv.fr/regions',
        },
        {
          filePath: 'public/maps/france-overseas.geojson',
          sourceLabel: 'france-geojson.gregoiredavid.fr',
          note: t('sources.overseas_note'),
          url: 'https://france-geojson.gregoiredavid.fr/',
        },
      );
    }

    if (quiz.country === 'germany') {
      playableItems.push({
        filePath: 'public/maps/germany-states.geojson',
        sourceLabel: 'isellsoap/deutschlandGeoJSON (likely)',
        note: t('sources.unverified_note'),
        url: 'https://github.com/isellsoap/deutschlandGeoJSON',
      });
    }

    if (quiz.country === 'spain') {
      playableItems.push({
        filePath: 'public/maps/spain-communities.geojson',
        sourceLabel: 'codeforgermany/click_that_hood (likely)',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    if (quiz.country === 'italy') {
      playableItems.push({
        filePath: 'public/maps/italy-regions.geojson',
        sourceLabel: 'codeforgermany/click_that_hood (likely)',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    if (quiz.country === 'canada') {
      playableItems.push({
        filePath: 'public/maps/canada-provinces.geojson',
        sourceLabel: 'codeforgermany/click_that_hood (likely)',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    if (quiz.country === 'usa') {
      playableItems.push({
        filePath: 'public/maps/usa-states.geojson',
        sourceLabel: 'PublicaMundi/MappingAPI us-states.json (likely)',
        note: t('sources.unverified_note'),
        url: 'https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json',
      });
    }

    if (quiz.country === 'brazil') {
      playableItems.push({
        filePath: 'public/maps/brazil-states.geojson',
        sourceLabel: 'codeforgermany/click_that_hood',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    if (quiz.country === 'china') {
      playableItems.push({
        filePath: 'public/maps/china-provinces.geojson',
        sourceLabel: 'codeforgermany/click_that_hood',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    if (quiz.country === 'india') {
      playableItems.push({
        filePath: 'public/maps/india-states.geojson',
        sourceLabel: 'codeforgermany/click_that_hood',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    if (quiz.country === 'russia') {
      playableItems.push(
        {
          filePath: 'public/maps/russia-federal-districts.geojson',
          sourceLabel: 'codeforgermany/click_that_hood',
          note: t('sources.unverified_note'),
          url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
        },
        {
          filePath: 'public/maps/russia-subjects.geojson',
          sourceLabel: 'codeforgermany/click_that_hood',
          note: t('sources.unverified_note'),
          url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
        },
      );
    }

    if (quiz.country === 'australia') {
      playableItems.push({
        filePath: 'public/maps/australia-states.geojson',
        sourceLabel: 'codeforgermany/click_that_hood',
        note: t('sources.unverified_note'),
        url: 'https://github.com/codeforgermany/click_that_hood/tree/main/public/data',
      });
    }

    return [
      {
        id: 'playable',
        title: t('sources.playable_title'),
        items: playableItems,
      },
      {
        id: 'context',
        title: t('sources.context_title'),
        items: [
          {
            filePath: 'public/maps/world-countries-110m.geojson',
            sourceLabel: 'Natural Earth',
            note: t('sources.natural_earth_note'),
            url: 'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/',
          },
        ],
      },
    ].filter((section) => section.items.length > 0);
  }, [quiz.country, t]);

  const switchQuizLevel = useCallback((nextLevelId: QuizLevelId) => {
    if (nextLevelId === quizLevelId) return;
    const nextLevel = quiz.levels.find((level) => level.id === nextLevelId);
    if (!nextLevel) return;
    const nextAreas = nextLevel.areas;
    const nextTargetCode = pickNextTarget(nextAreas, null);
    setQuizLevelId(nextLevelId);
    setTargetCode(nextTargetCode);
    setOptionCodes(createOptionCodes(nextAreas, nextTargetCode, true));
    setAnswer(null);
    setHoveredCode(null);
  }, [quiz.levels, quizLevelId]);

  const switchGameMode = useCallback((nextMode: SubdivisionsGameMode) => {
    if (nextMode === gameMode) return;
    setGameMode(nextMode);
    setAnswer(null);
    setHoveredCode(null);
  }, [gameMode]);

  const submitAnswer = useCallback((selectedCode: string) => {
    if (answerRef.current) return;
    if (!targetArea) return;

    const isCorrect = selectedCode === targetArea.code;
    setAnswer({ selectedCode, correct: isCorrect });
    setScore((current) => {
      const nextStreak = isCorrect ? current.streak + 1 : 0;
      return {
        correct: current.correct + (isCorrect ? 1 : 0),
        total: current.total + 1,
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
      };
    });
  }, [targetArea]);

  const nextRound = useCallback(() => {
    if (!targetArea) return;
    const nextTargetCode = pickNextTarget(activeAreas, targetArea.code);
    setTargetCode(nextTargetCode);
    setOptionCodes(createOptionCodes(activeAreas, nextTargetCode, true));
    setAnswer(null);
    setHoveredCode(null);
  }, [activeAreas, targetArea]);

  const clearScore = useCallback(() => {
    skipNextScorePersistRef.current = true;
    setScore(createDefaultScore());
  }, []);

  const value = useMemo<SubdivisionsGameContextValue>(() => ({
    quiz,
    quizLevelId,
    gameMode,
    targetCode,
    targetArea,
    optionCodes,
    answer,
    score,
    hoveredCode,
    activeLevel,
    activeAreas,
    areasByCode,
    isChoiceMode,
    promptAreaLabel,
    promptBodyLabel,
    countryName,
    dataSourceSections,
    switchQuizLevel,
    switchGameMode,
    submitAnswer,
    nextRound,
    clearScore,
    setHoveredCode,
  }), [
    quiz,
    quizLevelId,
    gameMode,
    targetCode,
    targetArea,
    optionCodes,
    answer,
    score,
    hoveredCode,
    activeLevel,
    activeAreas,
    areasByCode,
    isChoiceMode,
    promptAreaLabel,
    promptBodyLabel,
    countryName,
    dataSourceSections,
    switchQuizLevel,
    switchGameMode,
    submitAnswer,
    nextRound,
    clearScore,
  ]);

  return <SubdivisionsGameContext.Provider value={value}>{children}</SubdivisionsGameContext.Provider>;
}

export function useSubdivisionsGame(): SubdivisionsGameContextValue {
  const context = useContext(SubdivisionsGameContext);
  if (!context) {
    throw new Error('useSubdivisionsGame must be used within a SubdivisionsGameProvider');
  }
  return context;
}
