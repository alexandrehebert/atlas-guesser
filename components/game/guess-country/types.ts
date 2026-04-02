export type GameMode =
  | 'flag-to-country'
  | 'capital-to-country'
  | 'name-to-country'
  | 'country-to-capital'
  | 'country-to-name'
  | 'country-to-flag';

export interface RoundState {
  mode: GameMode;
  targetCode: string;
  optionCodes: string[];
}

export interface AnswerState {
  selectedCode: string;
  correct: boolean;
}

export interface ScoreState {
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
}
