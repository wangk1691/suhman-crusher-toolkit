/**
 * Feed opening check. Returns a planning verdict, not a capacity guarantee.
 */
export function checkFeedOpening({ opening, lump, shape = 'cubical' }) {
  const width = Number(opening);
  const lumpSize = Number(lump);
  const limit = shape === 'slabby' ? 0.8 : 0.85;
  const ratio = lumpSize / width;
  const recommended = width * limit;

  let verdict = 'good';
  if (ratio > limit) verdict = 'fail';
  else if (ratio > 0.75) verdict = 'caution';

  return {
    opening: width,
    lump: lumpSize,
    shape,
    limit,
    ratio,
    ratioPercent: Math.round(ratio * 100),
    recommendedMaxLump: Math.round(recommended),
    verdict,
  };
}
