'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ExternalLink, Globe, Map as MapIcon } from 'lucide-react';
import CountryFlag from '~/components/CountryFlag';
import CountryShapeIcon from '~/components/CountryShapeIcon';
import { RouteLoadingLink } from '~/components/RouteLoadingLink';
import type { CountryShapePreview } from '~/lib/server/adminQuizCountryShapePreviews';

const MODAL_EXIT_ANIMATION_MS = 220;

type WorldModeOption = {
  mode: string;
  label: string;
  prompt: string;
};

type SubdivisionCountryOption = {
  country: string;
  label: string;
  preview: CountryShapePreview;
};

type MapCountryOption = {
  code: string;
  name: string;
  path: string;
  focusBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

interface LandingGameStartCtasProps {
  worldCtaLabel: string;
  subdivisionsCtaLabel: string;
  countriesCtaLabel: string;
  modalCloseLabel: string;
  worldModalTitle: string;
  worldModalDescription: string;
  worldModalListLabel: string;
  subdivisionsModalTitle: string;
  subdivisionsModalDescription: string;
  subdivisionsModalListLabel: string;
  countriesModalTitle: string;
  countriesModalDescription: string;
  countriesModalListLabel: string;
  countriesSearchPlaceholder: string;
  countriesAvailableLabel: string;
  worldModes: WorldModeOption[];
  subdivisionCountries: SubdivisionCountryOption[];
  mapCountries: MapCountryOption[];
}

export function LandingGameStartCtas({
  worldCtaLabel,
  subdivisionsCtaLabel,
  countriesCtaLabel,
  modalCloseLabel,
  worldModalTitle,
  worldModalDescription,
  worldModalListLabel,
  subdivisionsModalTitle,
  subdivisionsModalDescription,
  subdivisionsModalListLabel,
  countriesModalTitle,
  countriesModalDescription,
  countriesModalListLabel,
  countriesSearchPlaceholder,
  countriesAvailableLabel,
  worldModes,
  subdivisionCountries,
  mapCountries,
}: LandingGameStartCtasProps) {
  const [openModal, setOpenModal] = useState<'world' | 'subdivisions' | 'countries' | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [countryFilter, setCountryFilter] = useState('');

  const filteredMapCountries = useMemo(() => {
    const normalizedFilter = countryFilter.trim().toLowerCase();
    if (!normalizedFilter) {
      return mapCountries;
    }

    return mapCountries.filter((country) => (
      country.name.toLowerCase().includes(normalizedFilter)
      || country.code.toLowerCase().includes(normalizedFilter)
    ));
  }, [countryFilter, mapCountries]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!openModal) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsClosingModal(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  useEffect(() => {
    if (!openModal || !isClosingModal) {
      return undefined;
    }

    const id = window.setTimeout(() => {
      setOpenModal(null);
      setIsClosingModal(false);
    }, MODAL_EXIT_ANIMATION_MS);

    return () => window.clearTimeout(id);
  }, [isClosingModal, openModal]);

  useEffect(() => {
    if (!openModal) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [openModal]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsClosingModal(false);
          setOpenModal('world');
        }}
        className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
      >
        <Globe className="h-4 w-4" />
        {worldCtaLabel}
        <ArrowRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => {
          setIsClosingModal(false);
          setOpenModal('subdivisions');
        }}
        className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
      >
        <MapIcon className="h-4 w-4" />
        {subdivisionsCtaLabel}
        <ArrowRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => {
          setIsClosingModal(false);
          setCountryFilter('');
          setOpenModal('countries');
        }}
        className="inline-flex items-center gap-1.5 ml-4 text-sm font-semibold text-slate-300 underline transition hover:text-slate-100"
      >
        {countriesCtaLabel}
        <ExternalLink className="h-4 w-4" />
      </button>

      {openModal === 'world' && portalRoot
        ? createPortal(
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/74 p-4 backdrop-blur-sm ${isClosingModal ? 'animate-fade-out pointer-events-none' : 'animate-fade-in-up'}`}
          onClick={() => setIsClosingModal(true)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-world-title"
            className={`w-full max-w-2xl rounded-[1.5rem] border border-white/12 bg-slate-950/95 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)] ${isClosingModal ? 'animate-scale-out' : 'animate-scale-in'}`}
            style={{ animationDuration: '260ms' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-200/85">
                  {worldModalListLabel}
                </p>
                <h2 id="start-world-title" className="mt-2 text-xl font-semibold text-white">
                  {worldModalTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-300">{worldModalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingModal(true)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {modalCloseLabel}
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {worldModes.map((option) => (
                <RouteLoadingLink
                  key={option.mode}
                  href={`/guesser/${option.mode}`}
                  className="group rounded-xl border border-white/12 bg-white/5 px-3 py-3 transition hover:border-amber-300/50 hover:bg-amber-300/10"
                >
                  <p className="text-sm font-semibold text-slate-100 transition group-hover:text-amber-100">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 transition group-hover:text-slate-300">
                    {option.prompt}
                  </p>
                </RouteLoadingLink>
              ))}
            </div>
          </div>
        </div>,
        portalRoot,
      )
        : null}

      {openModal === 'subdivisions' && portalRoot
        ? createPortal(
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/74 p-4 backdrop-blur-sm ${isClosingModal ? 'animate-fade-out pointer-events-none' : 'animate-fade-in-up'}`}
          onClick={() => setIsClosingModal(true)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-subdivisions-title"
            className={`w-full max-w-2xl rounded-[1.5rem] border border-white/12 bg-slate-950/95 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)] ${isClosingModal ? 'animate-scale-out' : 'animate-scale-in'}`}
            style={{ animationDuration: '260ms' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
                  {subdivisionsModalListLabel}
                </p>
                <h2 id="start-subdivisions-title" className="mt-2 text-xl font-semibold text-white">
                  {subdivisionsModalTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-300">{subdivisionsModalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingModal(true)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {modalCloseLabel}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {subdivisionCountries.map((option) => (
                <RouteLoadingLink
                  key={option.country}
                  href={`/subdivisions/${option.country}`}
                  className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-100"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-cyan-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <CountryShapeIcon preview={option.preview} className="h-5 w-5" />
                  </span>
                  <span>{option.label}</span>
                </RouteLoadingLink>
              ))}
            </div>
          </div>
        </div>,
        portalRoot,
      )
        : null}

      {openModal === 'countries' && portalRoot
        ? createPortal(
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/74 p-4 backdrop-blur-sm ${isClosingModal ? 'animate-fade-out pointer-events-none' : 'animate-fade-in-up'}`}
          onClick={() => setIsClosingModal(true)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="countries-catalog-title"
            className={`w-full max-w-4xl rounded-[1.5rem] border border-white/12 bg-slate-950/95 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)] ${isClosingModal ? 'animate-scale-out' : 'animate-scale-in'}`}
            style={{ animationDuration: '260ms' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-200/85">
                  {countriesModalListLabel}
                </p>
                <h2 id="countries-catalog-title" className="mt-2 text-xl font-semibold text-white">
                  {countriesModalTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-300">{countriesModalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingModal(true)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {modalCloseLabel}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="sr-only" htmlFor="landing-country-filter">
                {countriesSearchPlaceholder}
              </label>
              <input
                id="landing-country-filter"
                type="search"
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
                placeholder={countriesSearchPlaceholder}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-emerald-300/50 focus:bg-emerald-300/10 sm:max-w-sm"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {countriesAvailableLabel.replace('{count}', String(filteredMapCountries.length))}
              </p>
            </div>

            <div className="mt-4 max-h-[min(72vh,40rem)] overflow-y-auto pr-1">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMapCountries.map((country) => {
                  return (
                    <div
                      key={country.code}
                      className="rounded-xl border border-white/12 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <CountryFlag country={country.name} countryCode={country.code} size="md" />
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900/70 text-emerald-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                          <svg
                            aria-hidden="true"
                            viewBox={`${country.focusBounds.x} ${country.focusBounds.y} ${Math.max(1, country.focusBounds.width)} ${Math.max(1, country.focusBounds.height)}`}
                            className="h-[18px] w-[18px]"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <path d={country.path} fill="currentColor" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{country.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{country.code}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        portalRoot,
      )
        : null}
    </>
  );
}
