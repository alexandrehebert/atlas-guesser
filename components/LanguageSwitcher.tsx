'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const pathname = usePathname();

  function switchLocalePath(targetLocale: string): string {
    // Replace the locale segment in the current path
    // e.g. /en/trips -> /fr/trips
    const segments = pathname.split('/');
    segments[1] = targetLocale;
    return segments.join('/') || '/';
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
      {(['en', 'fr'] as const).map((locale) => (
        <Link
          key={locale}
          href={switchLocalePath(locale)}
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider transition ${
            currentLocale === locale
              ? 'bg-amber-300 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
          aria-current={currentLocale === locale ? 'true' : undefined}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
