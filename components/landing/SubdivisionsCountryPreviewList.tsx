'use client';

import { useEffect, useRef } from 'react';
import CountryShapeIcon from '~/components/CountryShapeIcon';
import { RouteLoadingLink } from '~/components/RouteLoadingLink';
import type { CountryShapePreview } from '~/lib/server/adminQuizCountryShapePreviews';

interface SubdivisionCountryOption {
  country: string;
  label: string;
  preview: CountryShapePreview;
}

interface SubdivisionsCountryPreviewListProps {
  countries: SubdivisionCountryOption[];
  selectedCountry: string;
}

export function SubdivisionsCountryPreviewList({ countries, selectedCountry }: SubdivisionsCountryPreviewListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const selectedElement = listElement.querySelector<HTMLElement>('[data-selected-country="true"]');
    if (!selectedElement) return;

    // Scroll only the list container to avoid triggering a page-level jump.
    const nextScrollTop = selectedElement.offsetTop - (listElement.clientHeight / 2) + (selectedElement.clientHeight / 2);
    const maxScrollTop = Math.max(0, listElement.scrollHeight - listElement.clientHeight);
    listElement.scrollTop = Math.max(0, Math.min(nextScrollTop, maxScrollTop));
  }, [selectedCountry]);

  return (
    <div className="relative p-2.5">
      <div ref={listRef} className="max-h-44 space-y-1.5 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]">
        {countries.map((countryOption) => {
          const isSelected = countryOption.country === selectedCountry;
          return (
            <RouteLoadingLink
              key={`landing-subdivision-country-${countryOption.country}`}
              href={`/subdivisions/${countryOption.country}`}
              data-selected-country={isSelected ? 'true' : undefined}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${isSelected ? 'border-emerald-400/45 bg-emerald-500/12 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]'}`}
            >
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-emerald-300/30 bg-emerald-300/15 text-emerald-100' : 'border-white/12 bg-slate-900/65 text-slate-200'}`}>
                <CountryShapeIcon preview={countryOption.preview} className="h-[14px] w-[14px]" />
              </span>
              <span className="truncate">{countryOption.label}</span>
            </RouteLoadingLink>
          );
        })}
      </div>
    </div>
  );
}