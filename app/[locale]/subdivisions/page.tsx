import { redirect } from '~/i18n/navigation';
import type { routing } from '~/i18n/routing';

interface SubdivisionsIndexPageProps {
  params: Promise<{ locale: (typeof routing.locales)[number] }>;
}

export default async function SubdivisionsIndexPage({ params }: SubdivisionsIndexPageProps) {
  const { locale } = await params;
  redirect({ href: '/subdivisions/france', locale });
}