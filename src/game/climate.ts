// Lagos seasons, daily weather and outdoor temperature.
// The game year is 360 days: twelve 30-day months, with day 1 on 1 January.
// There is no snow in Lagos: harmattan is the cold, dusty season.
import type { GameState, LagosWeather } from './types';

export type SeasonId = 'harmattan' | 'hotSeason' | 'rains' | 'augustBreak' | 'lateRains' | 'drySeason';

export interface Season {
  id: SeasonId;
  name: string;
  icon: string;
  /** What players should expect, in one line. */
  blurb: string;
  /** Typical daily low / high in °C. */
  low: number;
  high: number;
  /** Weather odds for a day in this season. */
  odds: Partial<Record<LagosWeather, number>>;
}

export const SEASONS: Record<SeasonId, Season> = {
  harmattan: { id: 'harmattan', name: 'Harmattan', icon: '🌫️', blurb: 'Dusty haze, chilly mornings, hot afternoons. Jackets and covered looks sell.', low: 19, high: 32, odds: { harmattan: 0.6, cloudy: 0.18, sunny: 0.22 } },
  hotSeason: { id: 'hotSeason', name: 'Hot season', icon: '🔥', blurb: 'The hottest weeks of the year. Fans and AC work hard; early storms roll in.', low: 26, high: 35, odds: { sunny: 0.68, cloudy: 0.2, storm: 0.12 } },
  rains: { id: 'rains', name: 'Rainy season', icon: '🌧️', blurb: 'Heavy rain and thunderstorms. Fewer walk-ins, more blackouts, flats over heels.', low: 23, high: 29, odds: { rainy: 0.5, storm: 0.2, cloudy: 0.2, sunny: 0.1 } },
  augustBreak: { id: 'augustBreak', name: 'August break', icon: '⛅', blurb: 'A cool, cloudy pause in the rains. Good shopping weather.', low: 23, high: 28, odds: { cloudy: 0.55, rainy: 0.2, sunny: 0.25 } },
  lateRains: { id: 'lateRains', name: 'Late rains', icon: '🌦️', blurb: 'The rains come back for a last round, with storms in the evenings.', low: 23, high: 30, odds: { rainy: 0.5, storm: 0.15, cloudy: 0.25, sunny: 0.1 } },
  drySeason: { id: 'drySeason', name: 'Dry season', icon: '🌤️', blurb: 'Warm and dry, with owambe season around the corner.', low: 24, high: 33, odds: { sunny: 0.5, cloudy: 0.4, rainy: 0.1 } },
};

const MONTH_SEASON: SeasonId[] = ['harmattan', 'harmattan', 'hotSeason', 'hotSeason', 'rains', 'rains', 'rains', 'augustBreak', 'lateRains', 'lateRains', 'drySeason', 'harmattan'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const monthOf = (day: number) => Math.floor(((Math.max(1, day) - 1) % 360) / 30);
export const seasonOf = (day: number): Season => SEASONS[MONTH_SEASON[monthOf(day)]];
/** "12 Mar" */
export const dateLabel = (day: number) => `${((Math.max(1, day) - 1) % 30) + 1} ${MONTHS[monthOf(day)]}`;
/** December: owambe season, weddings and end-of-year parties everywhere. */
export const festive = (day: number) => monthOf(day) === 11;

/** A stable 0..1 number for a day and a purpose. */
function noise(seed: number, day: number, salt: number): number {
  const n = Math.sin((seed % 9973) * 0.137 + day * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function weatherFor(day: number, seed: number): LagosWeather {
  const r = noise(seed, day, 1);
  let acc = 0;
  const odds = Object.entries(seasonOf(day).odds) as [LagosWeather, number][];
  for (const [w, p] of odds) {
    acc += p;
    if (r < acc) return w;
  }
  return odds[odds.length - 1][0];
}

export const WEATHER_INFO: Record<LagosWeather, { icon: string; title: string; detail: string }> = {
  sunny: { icon: '☀️', title: 'Sunny', detail: 'Hot and bright. Busy streets, but heat tires everyone out without cooling.' },
  cloudy: { icon: '☁️', title: 'Cloudy', detail: 'Mild weather with normal customer traffic.' },
  rainy: { icon: '🌧️', title: 'Rain', detail: 'Fewer walk-ins; a canopy at the door keeps more of them.' },
  storm: { icon: '⛈️', title: 'Thunderstorm', detail: 'Heavy rain and lightning. Far fewer walk-ins and NEPA is likely to take light.' },
  harmattan: { icon: '🌫️', title: 'Dusty haze', detail: 'Dusty haze. Cold morning, hot afternoon. Keep the clothes covered.' },
};

/** Weather nudges the day's range: storms and rain cool things down, clear sun heats up. */
const WEATHER_SHIFT: Record<LagosWeather, { low: number; high: number }> = {
  sunny: { low: 0, high: 1.5 }, cloudy: { low: 0.5, high: -1.5 }, rainy: { low: 0, high: -3 }, storm: { low: -0.5, high: -4.5 }, harmattan: { low: -2, high: 0.5 },
};

/** Today's outdoor low and high, °C. */
export function dayRange(day: number, seed: number, weather = weatherFor(day, seed)): { low: number; high: number } {
  const season = seasonOf(day);
  const wobble = (noise(seed, day, 2) - 0.5) * 2.4;
  const shift = WEATHER_SHIFT[weather];
  const low = season.low + shift.low + wobble * 0.6;
  const high = Math.max(low + 3, season.high + shift.high + wobble);
  return { low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10 };
}

/**
 * Outdoor temperature at a shop-clock minute (0 = 8am, 720 = 8pm). Coolest at dawn,
 * hottest around 2–3pm.
 */
export function outdoorTemp(day: number, seed: number, clock: number, weather?: LagosWeather): number {
  const { low, high } = dayRange(day, seed, weather);
  const hour = 8 + Math.max(-120, Math.min(840, clock)) / 60;
  // 0 at 6am, 1 at 2:30pm, back towards 0.35 by 10pm.
  const k = hour <= 14.5 ? Math.sin(((hour - 6) / 8.5) * (Math.PI / 2)) : 1 - (hour - 14.5) / 11.5;
  return Math.round((low + (high - low) * Math.max(0, Math.min(1, k))) * 10) / 10;
}

export const outdoorNow = (s: Pick<GameState, 'day' | 'seed' | 'clock' | 'weather'>) => outdoorTemp(s.day, s.seed, s.clock, s.weather);
