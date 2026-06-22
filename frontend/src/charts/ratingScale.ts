/** Moody's implied-rating notches, best→worst, for mapping ratings to a Y-axis index. */
export const RATING_SCALE = [
  'Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3',
  'Baa1', 'Baa2', 'Baa3', 'Ba1', 'Ba2', 'Ba3',
  'B1', 'B2', 'B3', 'Caa1', 'Caa2', 'Caa3', 'Ca', 'C',
]

/** Index of a rating in the scale, or -1 if unknown. */
export const ratingNotch = (rating?: string | null): number =>
  rating ? RATING_SCALE.indexOf(rating) : -1
