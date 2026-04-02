
'use client';
import React from 'react';

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CountryQuizPayload, QuizCountry } from '~/lib/server/countryQuiz';
import { MAP_MODES, MODE_ACCENTS } from '../../constants';
import { createRound, recordRoundHistory, type RoundHistory } from '../rounds';
import type { AnswerState, GameMode, RoundState, ScoreState } from '../types';

const SCORE_STORAGE_KEY = 'atlas-guesser-score:v1';
const MAP_VIEW_STORAGE_KEY = 'atlas-guesser-map-view:v1';

export type MapView = 'globe' | 'flat';

function parseStoredMapView(value: string | null): MapView {
  if (value === 'flat' || value === 'globe') return value;
  return 'flat';
}

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

interface GameContextValue {
  quiz: CountryQuizPayload;
  mode: GameMode;
  round: RoundState;
  answer: AnswerState | null;
  score: ScoreState;
  hoveredCode: string | null;
  targetCountry: QuizCountry;
  countriesByCode: Map<string, QuizCountry>;
  accent: string;
  showOptions: boolean;
  isFlagOptionsMode: boolean;
  isCapitalOptionsMode: boolean;
  isNameOptionsMode: boolean;
  mapView: MapView;
  setMapView: (view: MapView) => void;
  changeMode: (nextMode: GameMode) => void;
  submitAnswer: (selectedCode: string) => void;
  nextRound: () => void;
  clearScore: () => void;
  setHoveredCode: React.Dispatch<React.SetStateAction<string | null>>;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  quiz: CountryQuizPayload;
  children: ReactNode;
  initialMode?: GameMode;
  initialRound?: RoundState;
}

export function GameProvider({ quiz, children, initialMode = 'flag-to-country', initialRound }: GameProviderProps) {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [round, setRound] = useState<RoundState>(() => initialRound ?? createRound(quiz.countries, initialMode));
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreState>(createDefaultScore);
  const [scoreLoaded, setScoreLoaded] = useState(false);
  const [mapView, setMapViewState] = useState<MapView>('flat');
  const roundHistoryRef = useRef<Partial<Record<GameMode, RoundHistory>>>({});
  const skipNextScorePersistRef = useRef(false);

  const buildRound = useCallback((nextMode: GameMode, previousCode?: string | null) => {
    const history = roundHistoryRef.current[nextMode];
    const nextRound = createRound(quiz.countries, nextMode, { previousCode, history });
    roundHistoryRef.current[nextMode] = recordRoundHistory(history, nextRound);
    return nextRound;
  }, [quiz.countries]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setScore(parseStoredScore(window.localStorage.getItem(SCORE_STORAGE_KEY)));
    setMapViewState(parseStoredMapView(window.localStorage.getItem(MAP_VIEW_STORAGE_KEY)));
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

  const countriesByCode = useMemo(
    () => new Map(quiz.countries.map((country) => [country.code, country])),
    [quiz.countries],
  );

  const targetCountry = countriesByCode.get(round.targetCode) || quiz.countries[0];
  const accent = MODE_ACCENTS[mode];
  const showOptions = !MAP_MODES.has(mode);
  const isFlagOptionsMode = mode === 'country-to-flag';
  const isCapitalOptionsMode = mode === 'country-to-capital';
  const isNameOptionsMode = mode === 'country-to-name';

  const changeMode = useCallback((nextMode: GameMode) => {
    setMode(nextMode);
    setRound(buildRound(nextMode, round.targetCode));
    setAnswer(null);
    setHoveredCode(null);
  }, [buildRound, round.targetCode]);

  const submitAnswer = useCallback((selectedCode: string) => {
    if (answer) return;

    const isCorrect = selectedCode === round.targetCode;

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
  }, [answer, round.targetCode]);

  const nextRound = useCallback(() => {
    startTransition(() => {
      setRound((current) => buildRound(mode, current.targetCode));
      setAnswer(null);
      setHoveredCode(null);
    });
  }, [buildRound, mode]);

  const clearScore = useCallback(() => {
    skipNextScorePersistRef.current = true;
    setScore(createDefaultScore());
  }, []);

  const setMapView = useCallback((view: MapView) => {
    if (view === mapView) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('atlas-map-view-switch-start', {
        detail: { view },
      }));
    }
    setMapViewState(view);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, view);
    }
  }, [mapView]);

  const value = useMemo<GameContextValue>(() => ({
    quiz,
    mode,
    round,
    answer,
    score,
    hoveredCode,
    targetCountry,
    countriesByCode,
    accent,
    showOptions,
    isFlagOptionsMode,
    isCapitalOptionsMode,
    isNameOptionsMode,
    mapView,
    setMapView,
    changeMode,
    submitAnswer,
    nextRound,
    clearScore,
    setHoveredCode,
  }), [
    quiz,
    mode,
    round,
    answer,
    score,
    hoveredCode,
    targetCountry,
    countriesByCode,
    accent,
    showOptions,
    isFlagOptionsMode,
    isCapitalOptionsMode,
    isNameOptionsMode,
    mapView,
    setMapView,
    changeMode,
    submitAnswer,
    nextRound,
    clearScore,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
