export function numberOr(value, fallback, emptyFallback = fallback) {
  if (value === undefined || value === null || value === "") {
    return emptyFallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}
