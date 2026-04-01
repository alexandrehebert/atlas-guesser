'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef } from 'react';
import { useGame } from './contexts/GameContext';
import GameMap2D from './GameMap2D';

const GameMap3D = dynamic(() => import('./GameMap3D'), {
  ssr: false,
});

interface GameMapProps {
  onInitialZoomEnd?: () => void;
  onViewChangeStart?: () => void;
}

export default function GameMap({ onInitialZoomEnd, onViewChangeStart }: GameMapProps) {
  const { mapView } = useGame();
  const previousViewRef = useRef(mapView);

  useEffect(() => {
    if (previousViewRef.current !== mapView) {
      onViewChangeStart?.();
      previousViewRef.current = mapView;
    }
  }, [mapView, onViewChangeStart]);

  const handleMapReady = useCallback(() => {
    onInitialZoomEnd?.();
  }, [onInitialZoomEnd]);

  if (mapView === 'flat') {
    return <GameMap2D onInitialZoomEnd={handleMapReady} />;
  }

  return <GameMap3D onInitialZoomEnd={handleMapReady} />;
}
