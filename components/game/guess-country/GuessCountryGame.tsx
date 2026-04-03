
import { Globe, Map } from 'lucide-react';
import type { MapView } from './contexts/GameContext';
import GameMap from './GameMap';
import GameMapViewToggle from './GameMapViewToggle';
import GameSettingsMenu from './GameSettingsMenu';
import GameShell from '../GameShell';
import GameTopBar from '../GameTopBar';
import { CountryGameSidebarContent, CountryGameSidebarFooter } from './CountryGameSidebarContent';
import GameScoreChip from './GameScoreChip';

interface GuessCountryGameProps {
  mapReady: boolean;
  handleMapReady: () => void;
  loadingTargetView: MapView;
}

export default function GuessCountryGame({ mapReady, handleMapReady, loadingTargetView }: GuessCountryGameProps) {
  return (
    <GameShell
      mapContent={(
        <>
          <GameMap onInitialZoomEnd={handleMapReady} />
          <GameScoreChip />
        </>
      )}
      sidebarContent={<CountryGameSidebarContent />}
      sidebarFooter={<CountryGameSidebarFooter />}
      isLoading={!mapReady}
      loadingContent={
        loadingTargetView === 'globe'
          ? <Globe className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
          : <Map className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
      }
      topBar={
        <GameTopBar
          extraControls={<GameMapViewToggle />}
          settingsMenu={<GameSettingsMenu />}
        />
      }
    />
  );
}
