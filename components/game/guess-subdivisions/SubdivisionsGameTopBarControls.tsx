'use client';

import { useTranslations } from 'next-intl';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';

export default function SubdivisionsGameTopBarControls() {
  const t = useTranslations('subdivisionsGuesser');
  const { quiz, quizLevelId, gameMode, switchQuizLevel, switchGameMode } = useSubdivisionsGame();
  const hasMultipleLevels = quiz.levels.length > 1;

  return (
    <>
      {hasMultipleLevels ? (
        <div className="flex items-center gap-1 rounded-full border border-white/12 bg-slate-950/40 p-1 backdrop-blur-sm">
          {quiz.levels.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => switchQuizLevel(level.id)}
              className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2.5 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 md:px-3 ${quizLevelId === level.id ? 'border-sky-300/45 bg-sky-400/16' : 'border-white/12 bg-slate-950/80 hover:bg-slate-900 hover:border-white/20'}`}
            >
              <span className="text-xs font-medium uppercase tracking-[0.08em]">{t(`mode.${level.id}`)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-1 rounded-full border border-white/12 bg-slate-950/40 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => switchGameMode('map-click')}
          className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2.5 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 md:px-3 ${gameMode === 'map-click' ? 'border-sky-300/45 bg-sky-400/16' : 'border-white/12 bg-slate-950/80 hover:bg-slate-900 hover:border-white/20'}`}
          aria-label={t('game_mode_map_click')}
        >
          <span className="text-xs font-medium uppercase tracking-[0.08em]">{t('game_mode_map_click')}</span>
        </button>
        <button
          type="button"
          onClick={() => switchGameMode('highlighted-to-name')}
          className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2.5 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 md:px-3 ${gameMode === 'highlighted-to-name' ? 'border-sky-300/45 bg-sky-400/16' : 'border-white/12 bg-slate-950/80 hover:bg-slate-900 hover:border-white/20'}`}
          aria-label={t('game_mode_highlighted_to_name')}
        >
          <span className="text-xs font-medium uppercase tracking-[0.08em]">{t('game_mode_highlighted_to_name')}</span>
        </button>
      </div>
    </>
  );
}
