import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import GuesserClientWrapper from './GuesserClientWrapper';
import { getCountryQuizPayload } from '~/lib/server/countryQuiz';
import { createRound } from '~/components/game/rounds';
import type { GameMode } from '~/components/game/types';

interface GuesserPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}

const GAME_MODES: GameMode[] = [
  'flag-to-country',
  'capital-to-country',
  'name-to-country',
  'country-to-capital',
  'country-to-name',
  'country-to-flag',
];

export async function generateMetadata({ params }: GuesserPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guesser' });
  const tLanding = await getTranslations({ locale, namespace: 'landing' });

  return {
    title: 'Atlas Guesser | ' + tLanding('eyebrow'),
    description: t('metadata_description'),
  };
}

export default async function GuesserPage({ params, searchParams }: GuesserPageProps) {
  const { locale } = await params;
  const { mode } = await searchParams;
  const quiz = await getCountryQuizPayload(locale);
  const initialMode: GameMode = GAME_MODES.includes(mode as GameMode)
    ? (mode as GameMode)
    : 'flag-to-country';
  const initialRound = createRound(quiz.countries, initialMode);

  return (
    <main className="h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100">
      <GuesserClientWrapper quiz={quiz} initialMode={initialMode} initialRound={initialRound} />
    </main>
  );
}