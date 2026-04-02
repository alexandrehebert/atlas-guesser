import { zoomIdentity } from 'd3-zoom';
import type { GameMode } from './guess-country/types';

export const MODE_ORDER: GameMode[] = [
  'flag-to-country',
  'capital-to-country',
  'name-to-country',
  'country-to-capital',
  'country-to-name',
  'country-to-flag',
];

export const MAP_MODES = new Set<GameMode>(['flag-to-country', 'capital-to-country', 'name-to-country']);

export const MODE_ACCENTS: Record<GameMode, string> = {
  'flag-to-country': 'rgba(251,191,36,0.95)',
  'capital-to-country': 'rgba(45,212,191,0.95)',
  'name-to-country': 'rgba(244,114,182,0.92)',
  'country-to-capital': 'rgba(56,189,248,0.95)',
  'country-to-name': 'rgba(163,230,53,0.95)',
  'country-to-flag': 'rgba(248,113,113,0.95)',
};

export const DESKTOP_DEFAULT_MAP_TRANSFORM = zoomIdentity.translate(10, 36);
export const SIDEBAR_RIGHT_REM = 0.75;
export const SIDEBAR_FOLDED_VISIBLE_REM = 1.25;
export const TOGGLE_GAP_REM = 0.6;
