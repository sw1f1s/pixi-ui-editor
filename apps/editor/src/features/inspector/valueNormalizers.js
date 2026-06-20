import { cssColorIsSupported } from "./deps.js";

const NON_NEGATIVE_LAYOUT_KEYS = new Set(["gap", "padding", "rowGap", "columnGap", "cellWidth", "cellHeight", "grow", "minWidth", "minHeight", "columns"]);

const INSPECTOR_VALUE_NORMALIZERS = Object.freeze({
  number: normalizeNumberValue,
  color: normalizeColorValue,
  boolean: normalizeBooleanValue,
  text: (rawValue) => rawValue
});

const LAYOUT_VALUE_NORMALIZERS = Object.freeze({
  columns: (value) => Math.max(1, Math.round(Math.max(0, value))),
  aspectRatio: (value) => value > 0 ? value : null
});

export function normalizeInspectorValue(rawValue, type) {
  const normalize = INSPECTOR_VALUE_NORMALIZERS[type] || INSPECTOR_VALUE_NORMALIZERS.text;
  return normalize(rawValue);
}

export function normalizeComponentInspectorValue(propKey, rawValue, type) {
  const value = normalizeInspectorValue(rawValue, type);
  if (propKey === "pixelsPerUnitMultiplier" && type === "number") {
    return value === null ? null : Math.max(0.01, value);
  }
  return value;
}

export function normalizeLayoutInspectorValue(key, rawValue, type) {
  let value = normalizeInspectorValue(rawValue, type);
  if (type !== "number" || value === null) {
    return value;
  }
  if (NON_NEGATIVE_LAYOUT_KEYS.has(key)) {
    value = Math.max(0, value);
  }
  const normalize = LAYOUT_VALUE_NORMALIZERS[key];
  return normalize ? normalize(value) : value;
}

function normalizeNumberValue(rawValue) {
  const textValue = String(rawValue ?? "").trim();
  if (!textValue) {
    return null;
  }
  const value = Number(textValue);
  return Number.isFinite(value) ? value : null;
}

function normalizeColorValue(rawValue) {
  const value = String(rawValue || "").trim();
  return cssColorIsSupported(value) ? value : null;
}

function normalizeBooleanValue(rawValue) {
  return rawValue === true || rawValue === "true";
}
