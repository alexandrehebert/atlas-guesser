'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './contexts/GameContext';
import GameMap2D from './GameMap2D';

const GameMap3D = dynamic(() => import('./GameMap3D'), {
  ssr: false,
});

const MAP_SWITCH_RENDER_DELAY_MS = 700;

interface GameMapProps {
  onInitialZoomEnd?: () => void;
}

export default function GameMap({ onInitialZoomEnd }: GameMapProps) {
  const { mapView } = useGame();
  const [renderedMapView, setRenderedMapView] = useState(mapView);
  const switchTimeoutRef = useRef<number | null>(null);
  const mapViewRef = useRef(mapView);
  const renderedMapViewRef = useRef(renderedMapView);

  useEffect(() => {
    mapViewRef.current = mapView;
  }, [mapView]);

  useEffect(() => {
    renderedMapViewRef.current = renderedMapView;
  }, [renderedMapView]);

  useEffect(() => {
    if (renderedMapView === mapView) return;

    if (switchTimeoutRef.current !== null) {
      window.clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }

    switchTimeoutRef.current = window.setTimeout(() => {
      switchTimeoutRef.current = null;
      setRenderedMapView(mapViewRef.current);
    }, MAP_SWITCH_RENDER_DELAY_MS);

    return () => {
      if (switchTimeoutRef.current !== null) {
        window.clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
    };
  }, [mapView, renderedMapView]);

  const handleMapReady = useCallback(() => {
    // Ignore ready signals from the previous map while waiting to swap views.
    if (renderedMapViewRef.current !== mapViewRef.current) {
      return;
    }
    onInitialZoomEnd?.();
  }, [onInitialZoomEnd]);

  if (renderedMapView === 'flat') {
    return <GameMap2D onInitialZoomEnd={handleMapReady} />;
  }

  return <GameMap3D onInitialZoomEnd={handleMapReady} />;
}
