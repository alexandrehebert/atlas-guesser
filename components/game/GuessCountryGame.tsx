
import { Globe, Map } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CountryQuizPayload } from '~/lib/server/countryQuiz';
import type { MapView } from './contexts/GameContext';
import GameBackground from './GameBackground';
import GameMap from './GameMap';
import GameSidebar from './GameSidebarDesktop';
import GameSidebarMobile from './GameSidebarMobile';
import { useGameLayout } from './contexts/GameLayoutContext';
import GameTopBar from './GameTopBar';

interface GuessCountryGameProps {
  quiz: CountryQuizPayload;
  mapReady: boolean;
  handleMapReady: () => void;
  loadingTargetView: MapView;
}

export default function GuessCountryGame({ quiz, mapReady, handleMapReady, loadingTargetView }: GuessCountryGameProps) {
  function SidebarSwitcher() {
    const { isMobile } = useGameLayout();
    // Avoid SSR mismatch: don't render sidebar until isMobile is known
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => { setHydrated(true); }, []);
    if (!hydrated) return null;
    return isMobile ? <GameSidebarMobile /> : <GameSidebar />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      <GameBackground />
      <GameTopBar />
      {/* Always render GameMap, fade in when ready */}
      <div className={`transition-opacity duration-700 ${mapReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <GameMap onInitialZoomEnd={handleMapReady} />
      </div>
      <div
        className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 transition-opacity duration-700 ${mapReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {loadingTargetView === 'globe' ? (
          <Globe className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
        ) : (
          <Map className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
        )}
      </div>
      <div
        className={`block transition-opacity duration-700 ${mapReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <SidebarSwitcher />
      </div>
    </div>
  );
}
