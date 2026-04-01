"use client";

import GuessCountryGame from "./GuessCountryGame";
import type { CountryQuizPayload } from "~/lib/server/countryQuiz";
import type { GameMode, RoundState } from "./types";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { GameProvider, useGame } from "./contexts/GameContext";
import { GameLayoutProvider } from "./contexts/GameLayoutContext";
import { GameMapProvider } from "./contexts/GameMapContext";

const GAME_MODES: GameMode[] = [
  "flag-to-country",
  "capital-to-country",
  "name-to-country",
  "country-to-capital",
  "country-to-name",
  "country-to-flag",
];

interface GuessCountryGameClientProps {
  quiz: CountryQuizPayload;
  initialMode: GameMode;
  initialRound: RoundState;
}

interface GameModeQuerySyncProps {
  modeParam: string | null;
  searchParams: ReturnType<typeof useSearchParams>;
  router: ReturnType<typeof useRouter>;
}

function GameModeQuerySync({ modeParam, searchParams, router }: GameModeQuerySyncProps) {
  const { mode, changeMode } = useGame();
  const initialized = useRef(false);
  const lastSource = useRef<'param' | 'ui' | null>(null);

  // On mount, set context mode from query param if needed
  useEffect(() => {
    if (!initialized.current && modeParam && GAME_MODES.includes(modeParam as GameMode) && mode !== modeParam) {
      lastSource.current = 'param';
      changeMode(modeParam as GameMode);
      initialized.current = true;
    } else if (!initialized.current) {
      initialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam]);

  // When query param changes (from navigation), update context mode if needed
  useEffect(() => {
    if (initialized.current && modeParam && GAME_MODES.includes(modeParam as GameMode) && mode !== modeParam) {
      // Only update if last change was not from UI
      if (lastSource.current !== 'ui') {
        lastSource.current = 'param';
        changeMode(modeParam as GameMode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam]);

  // When context mode changes (from UI), update query param if needed
  useEffect(() => {
    if (initialized.current && mode !== modeParam) {
      // Only update if last change was not from param
      if (lastSource.current !== 'param') {
        lastSource.current = 'ui';
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('mode', mode);
        router.replace(`?${params.toString()}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return null;
}

export default function GuessCountryGameClient({ quiz, initialMode, initialRound }: GuessCountryGameClientProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapReadyRef = useRef(false);
  const isMapTransitioningRef = useRef(true);
  const handleMapReady = useCallback(() => {
    if (!isMapTransitioningRef.current && mapReadyRef.current) {
      return;
    }
    isMapTransitioningRef.current = false;
    mapReadyRef.current = true;
    setMapReady(true);
  }, []);
  const handleMapLoadingStart = useCallback(() => {
    if (isMapTransitioningRef.current) {
      return;
    }
    isMapTransitioningRef.current = true;
    mapReadyRef.current = false;
    setMapReady(false);
  }, []);

  const searchParams = useSearchParams();
  const router = useRouter();
  const modeParam = searchParams?.get("mode");

  return (
    <GameProvider quiz={quiz} initialMode={initialMode} initialRound={initialRound}>
      <GameModeQuerySync modeParam={modeParam} searchParams={searchParams} router={router} />
      <GameLayoutProvider>
        <GameMapProvider>
          <GuessCountryGame
            quiz={quiz}
            mapReady={mapReady}
            handleMapReady={handleMapReady}
            handleMapLoadingStart={handleMapLoadingStart}
          />
        </GameMapProvider>
      </GameLayoutProvider>
    </GameProvider>
  );
}
