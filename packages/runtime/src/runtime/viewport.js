export function getScreenViewport(screen = {}) {
  const canvas = screen.canvas || {};
  const width = Number(canvas.width);
  const height = Number(canvas.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return undefined;
  }

  return {
    width,
    height,
    safeArea: normalizeViewportSafeArea(canvas.safeArea)
  };
}

function normalizeViewportSafeArea(safeArea = {}) {
  return {
    top: Math.max(0, Number(safeArea.top || 0)),
    right: Math.max(0, Number(safeArea.right || 0)),
    bottom: Math.max(0, Number(safeArea.bottom || 0)),
    left: Math.max(0, Number(safeArea.left || 0))
  };
}
