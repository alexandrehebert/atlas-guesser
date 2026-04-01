"use client";

import GuessCountryGame from "./GuessCountryGame";
import type { CountryQuizPayload } from "~/lib/server/countryQuiz";
import type { GameMode } from "./types";
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

export default function GuessCountryGameClient({ quiz }: { quiz: CountryQuizPayload }) {
  const [mapReady, setMapReady] = useState(false);
  const mapReadyRef = useRef(false);
  const handleMapReady = useCallback(() => {
    if (!mapReadyRef.current) {
      setMapReady(true);
      mapReadyRef.current = true;
    }
  }, []);

  const searchParams = useSearchParams();
  const router = useRouter();
  const modeParam = searchParams?.get("mode");
  const initialMode: GameMode = GAME_MODES.includes(modeParam as GameMode)
    ? (modeParam as GameMode)
    : "flag-to-country";
  // Track if we've initialized mode from the query param
  const initialized = useRef(false);

  function GameProviderWithQuerySync({ children }: { children: React.ReactNode }) {
    return (
      <GameProvider quiz={quiz} initialMode={initialMode}>
        <GameModeQuerySync />
        {children}
      </GameProvider>
    );
  }

  function GameModeQuerySync() {
    const { mode, changeMode } = useGame();
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
          const params = new URLSearchParams(searchParams?.toString() || "");
          params.set("mode", mode);
          router.replace(`?${params.toString()}`);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);
    return null;
  }

  return (
    <GameProviderWithQuerySync>
      <GameLayoutProvider>
        <GameMapProvider>
          <GuessCountryGame quiz={quiz} mapReady={mapReady} handleMapReady={handleMapReady} />
        </GameMapProvider>
      </GameLayoutProvider>
    </GameProviderWithQuerySync>
  );
}
