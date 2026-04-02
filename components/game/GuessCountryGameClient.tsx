"use client";

import GuessCountryGame from "./GuessCountryGame";
import type { CountryQuizPayload } from "~/lib/server/countryQuiz";
import type { GameMode, RoundState } from "./types";
import type { MapView } from "./contexts/GameContext";
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

const MIN_MAP_LOADING_MS = 2000;

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
  const [loadingTargetView, setLoadingTargetView] = useState<MapView>('flat');
  const mapReadyRef = useRef(false);
  const isMapTransitioningRef = useRef(true);
  const mapTransitionStartedAtRef = useRef<number | null>(null);
  const mapReadyTimeoutRef = useRef<number | null>(null);

  const handleMapLoadingStart = useCallback((targetView?: MapView) => {
    if (mapReadyTimeoutRef.current !== null) {
      window.clearTimeout(mapReadyTimeoutRef.current);
      mapReadyTimeoutRef.current = null;
    }

    if (targetView) {
      setLoadingTargetView(targetView);
    }

    isMapTransitioningRef.current = true;
    mapTransitionStartedAtRef.current = Date.now();
    mapReadyRef.current = false;
    setMapReady(false);
  }, []);

  const handleMapReady = useCallback(() => {
    if (mapReadyTimeoutRef.current !== null) {
      window.clearTimeout(mapReadyTimeoutRef.current);
      mapReadyTimeoutRef.current = null;
    }

    const startedAt = mapTransitionStartedAtRef.current;
    if (startedAt !== null) {
      const elapsed = Date.now() - startedAt;
      const remaining = MIN_MAP_LOADING_MS - elapsed;

      if (remaining > 0) {
        mapReadyTimeoutRef.current = window.setTimeout(() => {
          mapReadyTimeoutRef.current = null;
          mapTransitionStartedAtRef.current = null;
          isMapTransitioningRef.current = false;
          mapReadyRef.current = true;
          setMapReady(true);
        }, remaining);
        return;
      }
    }

    if (!isMapTransitioningRef.current && mapReadyRef.current) {
      return;
    }

    mapTransitionStartedAtRef.current = null;
    isMapTransitioningRef.current = false;
    mapReadyRef.current = true;
    setMapReady(true);
  }, []);

  useEffect(() => {
    const onMapViewSwitchStart = (event: Event) => {
      const customEvent = event as CustomEvent<{ view?: MapView }>;
      handleMapLoadingStart(customEvent.detail?.view);
    };

    window.addEventListener('atlas-map-view-switch-start', onMapViewSwitchStart);
    return () => {
      window.removeEventListener('atlas-map-view-switch-start', onMapViewSwitchStart);
    };
  }, [handleMapLoadingStart]);

  useEffect(() => {
    return () => {
      if (mapReadyTimeoutRef.current !== null) {
        window.clearTimeout(mapReadyTimeoutRef.current);
      }
    };
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
            mapReady={mapReady}
            handleMapReady={handleMapReady}
            loadingTargetView={loadingTargetView}
          />
        </GameMapProvider>
      </GameLayoutProvider>
    </GameProvider>
  );
}
