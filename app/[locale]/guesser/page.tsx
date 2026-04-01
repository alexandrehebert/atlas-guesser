import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import GuesserClientWrapper from './GuesserClientWrapper';
import { getCountryQuizPayload } from '~/lib/server/countryQuiz';

interface GuesserPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: GuesserPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guesser' });
  const tLanding = await getTranslations({ locale, namespace: 'landing' });

  return {
    title: 'Atlas Guesser | ' + tLanding('eyebrow'),
    description: t('metadata_description'),
  };
}

export default async function GuesserPage({ params }: GuesserPageProps) {
  const { locale } = await params;
  const quiz = await getCountryQuizPayload(locale);

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <GuesserClientWrapper quiz={quiz} />
    </main>
  );
}