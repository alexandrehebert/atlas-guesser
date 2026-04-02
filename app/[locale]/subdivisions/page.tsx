import { redirect } from 'next/navigation';

interface SubdivisionsIndexPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SubdivisionsIndexPage({ params }: SubdivisionsIndexPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/subdivisions/france`);
}