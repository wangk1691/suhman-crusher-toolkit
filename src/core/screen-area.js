/**
 * Planning estimate for required screening area.
 * The published rate curve is intentionally simple and explicit.
 */
export function estimateScreenArea({ tph, density = 1.6, aperture, decks = 2, moisture = 'dry', efficiency = 90 }) {
  const target = Number(tph);
  const bulkDensity = Number(density);
  const apertureMm = Number(aperture);
  const deckCount = Math.max(1, Math.min(4, Math.round(Number(decks) || 2)));
  const targetEfficiency = Number(efficiency) || 90;

  function baseRate(mm) {
    const points = [[5, 8], [10, 12], [20, 18], [40, 24], [80, 30]];
    if (mm <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (mm <= points[i][0]) {
        const a = points[i - 1];
        const b = points[i];
        return a[1] + (b[1] - a[1]) * (mm - a[0]) / (b[0] - a[0]);
      }
    }
    return points[points.length - 1][1];
  }

  const densityFactor = bulkDensity / 1.6;
  const conditionFactor = moisture === 'wet' ? 0.65 : moisture === 'damp' ? 0.8 : 1;
  const efficiencyFactor = targetEfficiency >= 95 ? 0.9 : targetEfficiency >= 90 ? 1 : 1.15;
  const deckFactor = 1 + 0.08 * (deckCount - 1);
  const rate = baseRate(apertureMm);
  const rateUsed = rate * densityFactor * conditionFactor * efficiencyFactor;
  const areaPerDeck = target / rateUsed * deckFactor;
  const totalArea = areaPerDeck * deckCount;

  return {
    tph: target,
    density: bulkDensity,
    aperture: apertureMm,
    decks: deckCount,
    moisture,
    efficiency: targetEfficiency,
    rate,
    rateUsed,
    areaPerDeck,
    totalArea,
    planningLow: totalArea * 0.85,
    planningHigh: totalArea * 1.15,
    approxSquare: Math.sqrt(areaPerDeck),
  };
}
