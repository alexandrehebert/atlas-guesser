import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import GuesserClientWrapper from '../GuesserClientWrapper';
import { getCountryQuizPayload } from '~/lib/server/countryQuiz';
import { createRound } from '~/components/game/guess-country/rounds';
import type { GameMode } from '~/components/game/guess-country/types';

interface GuesserModePageProps {
  params: Promise<{ locale: string; mode: string }>;
}

const GAME_MODES: GameMode[] = [
  'flag-to-country',
  'capital-to-country',
  'name-to-country',
  'country-to-capital',
  'country-to-name',
  'country-to-flag',
];

export async function generateStaticParams() {
  return GAME_MODES.map((mode) => ({ mode }));
}

export async function generateMetadata({ params }: GuesserModePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guesser' });
  const tLanding = await getTranslations({ locale, namespace: 'landing' });

  return {
    title: 'Atlas Guesser | ' + tLanding('eyebrow'),
    description: t('metadata_description'),
  };
}

export default async function GuesserModePage({ params }: GuesserModePageProps) {
  const { locale, mode } = await params;

  if (!GAME_MODES.includes(mode as GameMode)) {
    notFound();
  }

  const initialMode = mode as GameMode;
  const quiz = await getCountryQuizPayload(locale);
  const initialRound = createRound(quiz.countries, initialMode);

  return (
    <main className="h-[100svh] w-full overflow-hidden bg-slate-950 text-slate-100">
      <GuesserClientWrapper quiz={quiz} initialMode={initialMode} initialRound={initialRound} />
    </main>
  );
}
