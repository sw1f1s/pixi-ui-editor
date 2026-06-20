import { componentsOf } from "../helpers.js";
import { EFFECT_COMPONENT_TYPES } from "./types.js";
import { clamp01, numberOr } from "./math.js";

const EFFECT_NORMALIZERS = {
  shadow: normalizeShadowProps,
  outline: normalizeOutlineProps
};

export function applyNodeEffectProps(node, props = {}) {
  return {
    ...props,
    ...getNodeEffectProps(node)
  };
}

export function getNodeEffectProps(node = {}) {
  const effects = {};
  for (const component of componentsOf(node)) {
    const type = String(component.type || "").toLowerCase();
    if (!EFFECT_COMPONENT_TYPES.has(type)) {
      continue;
    }

    const effect = EFFECT_NORMALIZERS[type]?.(component.props);
    if (effect) {
      effects[type] = effect;
    }
  }
  return effects;
}

function normalizeShadowProps(props = {}) {
  const alpha = clamp01(numberOr(props.alpha ?? props.opacity, 0.35));
  const blur = Math.max(0, numberOr(props.blur, 12));
  const offsetX = numberOr(props.offsetX ?? props.x, 0);
  const offsetY = numberOr(props.offsetY ?? props.y, 6);
  if (alpha <= 0 || (blur <= 0 && offsetX === 0 && offsetY === 0)) {
    return null;
  }

  return {
    color: props.color || "#000000",
    alpha,
    blur,
    offsetX,
    offsetY
  };
}

function normalizeOutlineProps(props = {}) {
  const width = Math.max(0, numberOr(props.width ?? props.thickness, 2));
  const alpha = clamp01(numberOr(props.alpha ?? props.opacity, 1));
  if (width <= 0 || alpha <= 0) {
    return null;
  }

  return {
    color: props.color || "#ffffff",
    alpha,
    width
  };
}
