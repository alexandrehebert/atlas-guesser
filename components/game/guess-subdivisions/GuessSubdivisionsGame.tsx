'use client';

import type { AdminSubdivisionQuizPayload } from '~/lib/server/adminSubdivisionQuiz';
import GuessSubdivisionsGameClient from './GuessSubdivisionsGameClient';

interface GuessSubdivisionsGameProps {
  quiz: AdminSubdivisionQuizPayload;
}

/**
 * Public entry point for the administrative subdivisions game.
 * Delegates to GuessSubdivisionsGameClient which sets up all contexts.
 */
export default function GuessSubdivisionsGame({ quiz }: GuessSubdivisionsGameProps) {
  return <GuessSubdivisionsGameClient quiz={quiz} />;
}
