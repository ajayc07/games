/** App-wide settings. Universe-specific settings live in each universe's manifest. */
export const config = {
  /** Universe opened at boot. No launcher screen until a second universe exists (D-007). */
  defaultUniverse: 'robo',
  /** Sky colour, also used for the page background so letterbox bars blend in. */
  skyColor: '#6ec6ff',
  /** Simultaneous touch points (move + jump + power later). */
  activePointers: 4,
} as const;
