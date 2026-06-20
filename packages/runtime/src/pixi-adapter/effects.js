import { normalizeColor } from "./utils.js";

export function createEffectFilters({ DropShadowFilter, OutlineFilter }) {
  return function applyEffectFilters(displayObject, props = {}) {
    if (!displayObject) {
      return;
    }

    const shadow = normalizeShadowEffect(props.shadow);
    const outline = normalizeOutlineEffect(props.outline);
    displayObject.__pixiUiEditorEffectProps = {
      shadow,
      outline
    };

    const baseFilters = Array.isArray(displayObject.filters)
      ? displayObject.filters.filter((filter) => !filter?.__pixiUiEditorEffectFilter)
      : [];
    const effectFilters = "text" in displayObject
      ? []
      : [
        createDropShadowFilter(shadow, DropShadowFilter),
        createOutlineFilter(outline, OutlineFilter)
      ].filter(Boolean);

    if (baseFilters.length || effectFilters.length) {
      displayObject.filters = [...baseFilters, ...effectFilters];
    } else if (displayObject.filters) {
      displayObject.filters = baseFilters;
    }
  };
}

export function normalizeShadowEffect(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const alpha = normalizeEffectAlpha(value.alpha ?? value.opacity, 0.35);
  const blur = Math.max(0, Number(value.blur ?? 12) || 0);
  const offsetX = Number(value.offsetX ?? value.x ?? 0) || 0;
  const offsetY = Number(value.offsetY ?? value.y ?? 6) || 0;
  if (alpha <= 0 || (blur <= 0 && offsetX === 0 && offsetY === 0)) {
    return null;
  }

  return {
    color: normalizeEffectColor(value.color, "#000000"),
    alpha,
    blur,
    offsetX,
    offsetY,
    distance: Math.sqrt(offsetX * offsetX + offsetY * offsetY),
    angle: Math.atan2(offsetY, offsetX)
  };
}

export function normalizeOutlineEffect(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const width = Math.max(0, Number(value.width ?? value.thickness ?? 2) || 0);
  const alpha = normalizeEffectAlpha(value.alpha ?? value.opacity, 1);
  if (width <= 0 || alpha <= 0) {
    return null;
  }

  return {
    color: normalizeEffectColor(value.color, "#ffffff"),
    alpha,
    width
  };
}

export function createTextOutlineStyle(outline) {
  return {
    stroke: {
      color: outline.color,
      width: outline.width,
      alpha: outline.alpha
    },
    strokeThickness: outline.width,
    strokeAlpha: outline.alpha
  };
}

export function createTextShadowStyle(shadow) {
  return {
    dropShadow: {
      color: shadow.color,
      alpha: shadow.alpha,
      blur: shadow.blur,
      distance: shadow.distance,
      angle: shadow.angle,
      offset: { x: shadow.offsetX, y: shadow.offsetY }
    },
    dropShadowColor: shadow.color,
    dropShadowAlpha: shadow.alpha,
    dropShadowBlur: shadow.blur,
    dropShadowDistance: shadow.distance,
    dropShadowAngle: shadow.angle
  };
}

function createDropShadowFilter(shadow, DropShadowFilter) {
  if (!shadow || !DropShadowFilter) {
    return null;
  }

  const options = {
    color: normalizeColor(shadow.color),
    alpha: shadow.alpha,
    blur: shadow.blur,
    distance: shadow.distance,
    rotation: shadow.angle * 180 / Math.PI,
    offset: { x: shadow.offsetX, y: shadow.offsetY }
  };
  return createEffectFilter(DropShadowFilter, [options]);
}

function createOutlineFilter(outline, OutlineFilter) {
  if (!outline || !OutlineFilter) {
    return null;
  }

  return createEffectFilter(OutlineFilter, [
    { thickness: outline.width, width: outline.width, color: normalizeColor(outline.color), alpha: outline.alpha },
    outline.width,
    normalizeColor(outline.color),
    undefined,
    outline.alpha
  ]);
}

function createEffectFilter(FilterClass, args) {
  try {
    const filter = new FilterClass(...args.slice(0, 1));
    filter.__pixiUiEditorEffectFilter = true;
    return filter;
  } catch (_error) {
    try {
      const filter = new FilterClass(...args.slice(1));
      filter.__pixiUiEditorEffectFilter = true;
      return filter;
    } catch (_fallbackError) {
      return null;
    }
  }
}

function normalizeEffectColor(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function normalizeEffectAlpha(value, fallback) {
  const number = Number(value ?? fallback);
  return Math.min(1, Math.max(0, Number.isFinite(number) ? number : fallback));
}
