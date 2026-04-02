'use client';

import { useTranslations } from 'next-intl';
import { useGame } from './contexts/GameContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { MODE_ORDER } from '../constants';

export default function GameModeSelector() {
  const t = useTranslations('guesser');
  const { mode } = useGame();
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <div className="order-3 rounded-2xl border border-white/10 bg-white/6 p-4 md:order-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('mode_eyebrow')}</p>

      <div className="mt-3 grid gap-2">
        {MODE_ORDER.map((item) => {
          const isActive = item === mode;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString() || '');
                params.set('mode', item);
                router.replace(`?${params.toString()}`);
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition-[background-color,border-color,color,box-shadow] duration-150 ${isActive ? 'border-white/22 bg-white/15 text-white' : 'border-white/10 bg-slate-950/45 text-slate-300 hover:bg-white/10 hover:border-white/16 hover:text-slate-100'}`}
            >
              {t(`mode_moves.${item}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
