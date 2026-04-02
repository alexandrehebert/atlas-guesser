'use client';

import type { AdminSubdivisionQuizPayload } from '~/lib/server/adminSubdivisionQuiz';
import { SubdivisionsGameProvider } from './contexts/SubdivisionsGameContext';
import { SubdivisionsGameMapProvider } from './contexts/SubdivisionsGameMapContext';
import { GameLayoutProvider } from '../contexts/GameLayoutContext';
import GameShell from '../GameShell';
import GameTopBar from '../GameTopBar';
import SubdivisionsGameTopBarControls from './SubdivisionsGameTopBarControls';
import SubdivisionsGameSettingsMenu from './SubdivisionsGameSettingsMenu';
import SubdivisionsGameSidebarContent from './SubdivisionsGameSidebarContent';
import SubdivisionsGameScore from './SubdivisionsGameScore';
import GuessSubdivisionsMap from './GuessSubdivisionsMap';

interface GuessSubdivisionsGameClientProps {
  quiz: AdminSubdivisionQuizPayload;
}

export default function GuessSubdivisionsGameClient({ quiz }: GuessSubdivisionsGameClientProps) {
  return (
    <SubdivisionsGameProvider quiz={quiz}>
      <GameLayoutProvider>
        <SubdivisionsGameMapProvider viewBoxWidth={quiz.viewBox.width} viewBoxHeight={quiz.viewBox.height}>
          <GameShell
            mapContent={<GuessSubdivisionsMap />}
            sidebarContent={<SubdivisionsGameSidebarContent />}
            sidebarFooter={<SubdivisionsGameScore />}
            showBackgroundGrid
            topBar={
              <GameTopBar
                extraControls={<SubdivisionsGameTopBarControls />}
                settingsMenu={<SubdivisionsGameSettingsMenu />}
              />
            }
          />
        </SubdivisionsGameMapProvider>
      </GameLayoutProvider>
    </SubdivisionsGameProvider>
  );
}
