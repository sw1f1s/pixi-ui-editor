import {
  cloneJson,
  deepMerge,
  getStateDefinition,
  isObject,
  readPath
} from "../helpers.js";

export function materializeNode(node, context) {
  const stateName = context.stateByNodeId?.get(node.id) || context.stateByNodeId?.get(node.sourceId);
  const state = getStateDefinition(node, stateName);
  return resolveDesignReferences(deepMerge({}, node, state || {}), context);
}

function resolveDesignReferences(value, context) {
  return resolveTokenReferences(value, getEffectiveTokens(context));
}

function getEffectiveTokens(context = {}) {
  const manifestTokens = context.manifest?.tokens || {};
  const libraryTokens = getEffectiveStyleLibraryTokens(context);
  const theme = findTheme(context.manifest?.themes, context.theme);
  return deepMerge({}, manifestTokens, libraryTokens, theme?.tokens || theme?.values || theme?.overrides || {});
}

function findTheme(themes, themeRef) {
  const target = String(themeRef || "default");
  return (themes || []).find((theme) => {
    return String(theme?.id || "") === target || String(theme?.name || "") === target || String(theme?.theme || "") === target;
  });
}

function getEffectiveStyleLibraryTokens(context = {}) {
  const libraries = Array.isArray(context.manifest?.styleLibraries)
    ? context.manifest.styleLibraries
    : [];
  if (!libraries.length) {
    return {};
  }

  const libraryRefs = normalizeStyleLibraryRefs(context.styleLibrary ?? context.styleLibraries ?? context.manifest?.styleLibrary);
  const selectedLibraries = libraryRefs.length
    ? libraries.filter((library) => libraryRefs.includes(String(library?.id || library?.name || "")))
    : libraries;
  return selectedLibraries.reduce((tokens, library) => deepMerge(tokens, library?.tokens || {}), {});
}

function normalizeStyleLibraryRefs(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "")).filter(Boolean);
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [String(value)];
}

function resolveTokenReferences(value, tokens, depth = 0) {
  if (depth > 6) {
    return cloneJson(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveTokenReferences(entry, tokens, depth));
  }

  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveTokenReferences(entry, tokens, depth)]));
  }

  if (typeof value !== "string") {
    return value;
  }

  const tokenPath = getTokenPath(value);
  if (!tokenPath) {
    return value;
  }

  const resolved = readPath(tokens, tokenPath);
  return resolved === undefined ? value : resolveTokenReferences(resolved, tokens, depth + 1);
}

function getTokenPath(value) {
  const trimmed = value.trim();
  const braced = trimmed.match(/^\{([\w.-]+)\}$/);
  if (braced) {
    return braced[1];
  }
  if (trimmed.startsWith("$") && trimmed.length > 1) {
    return trimmed.slice(1);
  }
  if (trimmed.startsWith("token:")) {
    return trimmed.slice("token:".length);
  }
  return null;
}
