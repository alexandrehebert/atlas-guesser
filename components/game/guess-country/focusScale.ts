function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getCountryFocusScale(params: {
  bounds: { width: number; height: number };
  viewBox: { width: number; height: number };
  isMobile: boolean;
}): number {
  const { bounds, viewBox, isMobile } = params;

  if (bounds.width <= 0 || bounds.height <= 0 || viewBox.width <= 0 || viewBox.height <= 0) {
    return 1;
  }

  const widthRatio = bounds.width / viewBox.width;
  const heightRatio = bounds.height / viewBox.height;
  const footprintRatio = Math.sqrt((bounds.width * bounds.height) / (viewBox.width * viewBox.height));
  const sizeScore = Math.max(widthRatio, heightRatio, footprintRatio);
  const widthDominance = widthRatio / Math.max(heightRatio, 0.001);

  const zoomT = clamp(
    (sizeScore - (isMobile ? 0.16 : 0.14)) / (isMobile ? 0.42 : 0.38),
    0,
    1,
  );
  const baseMaxScale = isMobile ? 3.4 : 6;
  const minimumAdaptiveMaxScale = isMobile ? 1.4 : 1.65;
  const mobileWidthPenalty = isMobile
    ? clamp((widthRatio - 0.42) / 0.34, 0, 1) * clamp((widthDominance - 1.85) / 2.2, 0, 1)
    : 0;
  const adaptiveMaxScale = clamp(
    baseMaxScale
      - zoomT * (baseMaxScale - minimumAdaptiveMaxScale)
      - mobileWidthPenalty * 1.1,
    1,
    baseMaxScale,
  );

  const fillT = clamp(
    (sizeScore - (isMobile ? 0.14 : 0.12)) / (isMobile ? 0.44 : 0.4),
    0,
    1,
  );
  const targetWidthFill = clamp(
    (isMobile ? 0.72 : 0.82)
      - fillT * (isMobile ? 0.16 : 0.18)
      - mobileWidthPenalty * 0.16,
    isMobile ? 0.4 : 0.52,
    0.82,
  );
  const targetHeightFill = clamp((isMobile ? 0.6 : 0.74) - fillT * (isMobile ? 0.12 : 0.16), 0.48, 0.74);

  const scaleX = (viewBox.width * targetWidthFill) / bounds.width;
  const scaleY = (viewBox.height * targetHeightFill) / bounds.height;

  return clamp(Math.min(scaleX, scaleY), 1, adaptiveMaxScale);
}