import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GameProvider, useGame } from '~/components/game/guess-country/contexts/GameContext';
import type { CountryQuizPayload, QuizCountry } from '~/lib/server/countryQuiz';

const SCORE_STORAGE_KEY = 'atlas-guesser-score:v1';

function createCountry(code: string): QuizCountry {
  return {
    code,
    name: `Country ${code}`,
    capital: `Capital ${code}`,
    flag: `Flag ${code}`,
    path: `M${code}`,
    centroid: { x: 0, y: 0 },
    capitalPoint: { x: 0, y: 0 },
    focusBounds: { x: 0, y: 0, width: 10, height: 10 },
    latlng: [0, 0],
  };
}

const quiz: CountryQuizPayload = {
  countries: ['AA', 'BB', 'CC', 'DD', 'EE'].map(createCountry),
  viewBox: { width: 1000, height: 560 },
};

function ScoreHarness() {
  const { round, score, submitAnswer, clearScore } = useGame();

  return (
    <div>
      <div data-testid="score">{JSON.stringify(score)}</div>
      <button type="button" onClick={() => submitAnswer(round.targetCode)}>
        answer
      </button>
      <button type="button" onClick={clearScore}>
        clear
      </button>
    </div>
  );
}

describe('GameContext', () => {
  it('hydrates score from local storage and clears it on demand', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify({
      correct: 3,
      total: 5,
      streak: 2,
      bestStreak: 4,
    }));

    render(
      <GameProvider quiz={quiz}>
        <ScoreHarness />
      </GameProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('score')).toHaveTextContent('"correct":3');
      expect(screen.getByTestId('score')).toHaveTextContent('"total":5');
    });

    await user.click(screen.getByRole('button', { name: 'answer' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SCORE_STORAGE_KEY)).toContain('"correct":4');
      expect(window.localStorage.getItem(SCORE_STORAGE_KEY)).toContain('"total":6');
    });

    await user.click(screen.getByRole('button', { name: 'clear' }));

    await waitFor(() => {
      expect(screen.getByTestId('score')).toHaveTextContent('"correct":0');
      expect(screen.getByTestId('score')).toHaveTextContent('"total":0');
      expect(window.localStorage.getItem(SCORE_STORAGE_KEY)).toBeNull();
    });
  });
});