import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atlas Guesser',
  description: 'A world map quiz with flags, capitals and country recognition rounds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}