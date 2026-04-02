import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import GuessFranceDepartmentsGame from '~/components/game/GuessFranceDepartmentsGame';
import { getFranceAdminQuizPayload } from '~/lib/server/franceDepartmentQuiz';

interface DepartementsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DepartementsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'departmentsGuesser' });

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
  };
}

export default async function DepartementsPage() {
  const quiz = await getFranceAdminQuizPayload();

  return (
    <main className="h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100">
      <GuessFranceDepartmentsGame quiz={quiz} />
    </main>
  );
}
