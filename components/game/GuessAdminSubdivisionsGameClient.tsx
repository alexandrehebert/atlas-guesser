'use client';

import type { AdminSubdivisionQuizPayload } from '~/lib/server/adminSubdivisionQuiz';
import { AdminGameProvider } from './contexts/AdminGameContext';
import { AdminGameMapProvider } from './contexts/AdminGameMapContext';
import { GameLayoutProvider } from './contexts/GameLayoutContext';
import GameShell from './GameShell';
import GameTopBar from './GameTopBar';
import AdminGameSettingsMenu from './AdminGameSettingsMenu';
import AdminGameSidebarContent from './AdminGameSidebarContent';
import GuessAdminSubdivisionsMap from './GuessAdminSubdivisionsMap';

interface GuessAdminSubdivisionsGameClientProps {
  quiz: AdminSubdivisionQuizPayload;
}

export default function GuessAdminSubdivisionsGameClient({ quiz }: GuessAdminSubdivisionsGameClientProps) {
  return (
    <AdminGameProvider quiz={quiz}>
      <GameLayoutProvider>
        <AdminGameMapProvider viewBoxWidth={quiz.viewBox.width} viewBoxHeight={quiz.viewBox.height}>
          <GameShell
            mapContent={<GuessAdminSubdivisionsMap />}
            sidebarContent={<AdminGameSidebarContent />}
            showBackgroundGrid
            topBar={
              <GameTopBar
                showMapViewToggle={false}
                settingsMenu={<AdminGameSettingsMenu />}
              />
            }
          />
        </AdminGameMapProvider>
      </GameLayoutProvider>
    </AdminGameProvider>
  );
}
