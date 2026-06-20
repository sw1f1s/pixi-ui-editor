export const DRAWABLE_TYPES = new Set(["graphics", "shape", "rect", "rectangle", "circle", "ellipse", "button"]);

export function getNodeType(node = {}) {
  return String(node.type || "").toLowerCase();
}

export function resolveShape(node = {}, props = {}) {
  const shape = String(props.shape || "").toLowerCase();
  if (shape) {
    return shape;
  }

  const type = getNodeType(node);
  return ["circle", "ellipse", "rect", "rectangle"].includes(type) ? type : "rect";
}

export function normalizeRadius(radius, width, height) {
  const value = typeof radius === "object" ? radius?.value ?? radius?.all ?? radius?.topLeft : radius;
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.min(numeric, Math.max(0, Number(width || 0) / 2), Math.max(0, Number(height || 0) / 2));
}
