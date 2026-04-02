'use client';

import { useTranslations } from 'next-intl';
import { useGame } from './contexts/GameContext';
import { MAP_MODES } from '../constants';
import GameOptions from './GameOptions';
import GamePrompt from './GamePrompt';
import GameResult from './GameResult';
import GameScore from './GameScore';

export function CountryGameSidebarContent() {
  const t = useTranslations('guesser');
  const { showOptions, mode, answer } = useGame();

  return (
    <>
      {!answer && (
        <div className="mb-0 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
          {MAP_MODES.has(mode) ? t('instruction_map') : t('instruction_choices')}
        </div>
      )}
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <GamePrompt />
        {showOptions ? <GameOptions /> : null}
        {answer && (
          <div className="mt-3">
            <GameResult />
          </div>
        )}
      </div>
    </>
  );
}

export function CountryGameSidebarFooter() {
  return <GameScore />;
}
