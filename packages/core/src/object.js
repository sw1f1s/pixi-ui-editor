export function clone(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

export function deepMerge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return clone(patch);
  }

  const next = clone(base);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = deepMerge(next[key], value);
    } else {
      next[key] = clone(value);
    }
  }
  return next;
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(value[key]);
      return result;
    }, {});
}
