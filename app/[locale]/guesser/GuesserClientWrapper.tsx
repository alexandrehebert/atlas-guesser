"use client";
import GuessCountryGameClient from "~/components/game/guess-country/GuessCountryGameClient";
import type { CountryQuizPayload } from "~/lib/server/countryQuiz";
import type { GameMode, RoundState } from "~/components/game/guess-country/types";

interface GuesserClientWrapperProps {
  quiz: CountryQuizPayload;
  initialMode: GameMode;
  initialRound: RoundState;
}

export default function GuesserClientWrapper({ quiz, initialMode, initialRound }: GuesserClientWrapperProps) {
  return <GuessCountryGameClient quiz={quiz} initialMode={initialMode} initialRound={initialRound} />;
}
