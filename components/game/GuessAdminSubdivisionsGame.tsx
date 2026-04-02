'use client';

import type { AdminSubdivisionQuizPayload } from '~/lib/server/adminSubdivisionQuiz';
import GuessAdminSubdivisionsGameClient from './GuessAdminSubdivisionsGameClient';

interface GuessAdminSubdivisionsGameProps {
  quiz: AdminSubdivisionQuizPayload;
}

/**
 * Public entry point for the administrative subdivisions game.
 * Delegates to GuessAdminSubdivisionsGameClient which sets up all contexts.
 */
export default function GuessAdminSubdivisionsGame({ quiz }: GuessAdminSubdivisionsGameProps) {
  return <GuessAdminSubdivisionsGameClient quiz={quiz} />;
}
