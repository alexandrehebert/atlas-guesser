'use client';

import { useGame } from './contexts/GameContext';
import GameMap2D from './GameMap2D';
import GameMap3D from './GameMap3D';

interface GameMapProps {
  onInitialZoomEnd?: () => void;
}

export default function GameMap({ onInitialZoomEnd }: GameMapProps) {
  const { mapView } = useGame();

  if (mapView === 'flat') {
    return <GameMap2D onInitialZoomEnd={onInitialZoomEnd} />;
  }

  return <GameMap3D onInitialZoomEnd={onInitialZoomEnd} />;
}
