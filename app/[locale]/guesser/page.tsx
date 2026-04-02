import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from '~/i18n/navigation';
import type { routing } from '~/i18n/routing';

interface GuesserPageProps {
  params: Promise<{ locale: (typeof routing.locales)[number] }>;
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
  redirect({ href: '/guesser/flag-to-country', locale });
}