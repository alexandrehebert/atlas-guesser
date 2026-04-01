'use client';

import { useTranslations } from 'next-intl';
import CountryFlag from '~/components/CountryFlag';
import { useGame } from './contexts/GameContext';

export default function GamePrompt() {
  const t = useTranslations('guesser');
  const { mode, targetCountry } = useGame();

  switch (mode) {
    case 'flag-to-country':
      return (
        <div className="flex items-center gap-3">
          <CountryFlag country={targetCountry.name} countryCode={targetCountry.code} className="h-12 w-12 rounded-xl ring-2 ring-white/12" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100">{t('prompt_flag_eyebrow')}</p>
            <p className="text-sm text-slate-300">{t('prompt_flag_body')}</p>
          </div>
        </div>
      );
    case 'capital-to-country':
      return (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-100">{t('prompt_capital_eyebrow')}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{targetCountry.capital}</p>
          <p className="mt-1 text-sm text-slate-300">{t('prompt_capital_body')}</p>
        </div>
      );
    case 'name-to-country':
      return (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-100">{t('prompt_name_eyebrow')}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{targetCountry.name}</p>
          <p className="mt-1 text-sm text-slate-300">{t('prompt_name_body')}</p>
        </div>
      );
    case 'country-to-capital':
      return (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-100">{t('prompt_country_capital_eyebrow')}</p>
          <p className="mt-1 text-sm text-slate-300">{t('prompt_country_capital_body')}</p>
        </div>
      );
    case 'country-to-name':
      return (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime-100">{t('prompt_country_name_eyebrow')}</p>
          <p className="mt-1 text-sm text-slate-300">{t('prompt_country_name_body')}</p>
        </div>
      );
    case 'country-to-flag':
      return (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-100">{t('prompt_country_flag_eyebrow')}</p>
          <p className="mt-1 text-sm text-slate-300">{t('prompt_country_flag_body')}</p>
        </div>
      );
    default:
      return null;
  }
}
