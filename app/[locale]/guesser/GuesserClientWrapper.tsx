"use client";
import GuessCountryGameClient from "~/components/game/GuessCountryGameClient";
import type { CountryQuizPayload } from "~/lib/server/countryQuiz";

export default function GuesserClientWrapper({ quiz }: { quiz: CountryQuizPayload }) {
  return <GuessCountryGameClient quiz={quiz} />;
}
