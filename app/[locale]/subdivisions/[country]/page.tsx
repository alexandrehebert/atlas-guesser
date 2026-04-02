import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import GuessAdminSubdivisionsGame from '~/components/game/GuessAdminSubdivisionsGame';
import { SUPPORTED_ADMIN_QUIZ_COUNTRIES, isAdminQuizCountrySlug } from '~/lib/adminQuizCountries';
import { getAdminSubdivisionQuizPayload } from '~/lib/server/adminSubdivisionQuiz';

interface SubdivisionsPageProps {
  params: Promise<{ locale: string; country: string }>;
}

export function generateStaticParams() {
  return SUPPORTED_ADMIN_QUIZ_COUNTRIES.map((country) => ({ country }));
}

export async function generateMetadata({ params }: SubdivisionsPageProps): Promise<Metadata> {
  const { locale, country } = await params;
  const t = await getTranslations({ locale, namespace: 'subdivisionsGuesser' });

  if (!isAdminQuizCountrySlug(country)) {
    return {
      title: 'Atlas Guesser',
      description: 'Atlas Guesser map quizzes.',
    };
  }

  const countryName = t(`countries.${country}`);

  return {
    title: t('metadata_title', { countryName }),
    description: t('metadata_description', { countryName }),
  };
}

export default async function SubdivisionsPage({ params }: SubdivisionsPageProps) {
  const { country } = await params;

  if (!isAdminQuizCountrySlug(country)) {
    notFound();
  }

  const quiz = await getAdminSubdivisionQuizPayload(country);

  return (
    <main className="h-[100svh] w-full overflow-hidden bg-slate-950 text-slate-100">
      <GuessAdminSubdivisionsGame key={quiz.country} quiz={quiz} />
    </main>
  );
}