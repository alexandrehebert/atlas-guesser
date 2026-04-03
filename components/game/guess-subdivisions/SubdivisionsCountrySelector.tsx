'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CountryShapeIcon from '~/components/CountryShapeIcon';
import { useRouter } from '~/i18n/navigation';
import { useGlobalRouteLoading } from '~/components/GlobalRouteLoadingProvider';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';

interface SubdivisionsCountrySelectorProps {
  variant: 'topbar' | 'settings';
}

export default function SubdivisionsCountrySelector({ variant }: SubdivisionsCountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const t = useTranslations('subdivisionsGuesser');
  const router = useRouter();
  const { startRouteLoading } = useGlobalRouteLoading();
  const { quiz, countryName } = useSubdivisionsGame();

  useEffect(() => {
    if (variant !== 'topbar' || !open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, variant]);

  if (quiz.availableCountries.length <= 1) {
    return null;
  }

  const navigateToCountry = (country: string) => {
    setOpen(false);
    if (country === quiz.country) return;
    startRouteLoading();
    router.push(`/subdivisions/${country}`);
  };

  const activePreview = quiz.countryPreviews[quiz.country];

  if (variant === 'settings') {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t('country_label')}</span>
        <div className="grid grid-cols-2 gap-2">
          {quiz.availableCountries.map((country) => {
            const isActiveCountry = country === quiz.country;
            return (
              <button
                key={country}
                type="button"
                onClick={() => navigateToCountry(country)}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${isActiveCountry ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
              >
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isActiveCountry ? 'border-sky-200/20 bg-sky-300/10' : 'border-white/10 bg-slate-900/60'}`}>
                  <CountryShapeIcon preview={quiz.countryPreviews[country]} className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate">{t(`countries.${country}`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-20' : ''}`}>
      <div className="rounded-full border border-white/12 bg-slate-950/40 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-9 items-center justify-between gap-2 rounded-full border border-white/12 bg-slate-950/80 px-2.5 pr-3 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-900 hover:border-white/20"
          aria-label={t('country_label')}
          aria-expanded={open}
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100/90">
            <CountryShapeIcon preview={activePreview} className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.08em]">{countryName}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open ? (
        <div className="absolute right-0 top-full mt-2 max-h-[min(26rem,calc(100svh-7rem))] min-w-full overflow-y-auto rounded-3xl border border-white/12 bg-slate-950/95 py-1 shadow-[0_20px_60px_rgba(2,6,23,0.6)] backdrop-blur-md">
          {quiz.availableCountries.map((country) => {
            const isActiveCountry = country === quiz.country;
            return (
              <button
                key={country}
                type="button"
                onClick={() => navigateToCountry(country)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] transition ${isActiveCountry ? 'bg-sky-400/16 text-sky-100' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isActiveCountry ? 'border-sky-200/20 bg-sky-300/10' : 'border-white/10 bg-slate-900/60'}`}>
                  <CountryShapeIcon preview={quiz.countryPreviews[country]} className="h-[14px] w-[14px]" />
                </span>
                <span>{t(`countries.${country}`)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}