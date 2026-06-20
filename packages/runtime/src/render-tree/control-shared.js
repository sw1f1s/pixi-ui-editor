import { numberOr, clamp01 } from "./math.js";

export function normalizeProgressValue(value, props = {}) {
  const min = numberOr(props.min, 0);
  const max = numberOr(props.max, 1);
  const current = numberOr(value, min);
  if (max <= min) {
    return 0;
  }

  return clamp01((current - min) / (max - min));
}

export function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["false", "0", "off", "no", "unchecked"].includes(normalized)) {
    return false;
  }
  if (["true", "1", "on", "yes", "checked"].includes(normalized)) {
    return true;
  }
  return Boolean(value);
}

export function parseControlOptions(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getComponentType(component = {}) {
  return String(component.type || component.kind || component.id || "").toLowerCase();
}
