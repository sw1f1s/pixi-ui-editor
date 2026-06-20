import {
  DRAWABLE_TYPES,
  getNodeType
} from "../adapter-shared.js";

export const DRAWABLE_CONTAINER_TYPES = new Set(["button"]);

export const DRAWABLE_GRAPHICS_TYPES = DRAWABLE_TYPES;

export { getNodeType };

export function assignIfPresent(target, key, value) {
  if (value !== undefined && target) {
    target[key] = value;
  }
}

export function normalizeColor(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  if (/^#([0-9a-f]{3})$/i.test(value)) {
    const [, short] = value.match(/^#([0-9a-f]{3})$/i);
    return Number.parseInt(short.split("").map((part) => part + part).join(""), 16);
  }

  if (/^#([0-9a-f]{6})$/i.test(value)) {
    return Number.parseInt(value.slice(1), 16);
  }

  if (/^0x[0-9a-f]+$/i.test(value)) {
    return Number.parseInt(value.slice(2), 16);
  }

  return value;
}

export function isTextureFlagEnabled(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}
