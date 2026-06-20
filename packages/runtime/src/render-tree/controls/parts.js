import { childrenOf } from "../../helpers.js";

export function updateChildPart(node, matchers, updater) {
  const children = childrenOf(node);
  if (!children.length) {
    return node;
  }

  let changed = false;
  const nextChildren = children.map((child) => {
    if (matchesControlPart(child, matchers)) {
      changed = true;
      return updater(child);
    }
    const nextChild = updateChildPart(child, matchers, updater);
    if (nextChild !== child) {
      changed = true;
    }
    return nextChild;
  });
  return changed ? { ...node, children: nextChildren } : node;
}

function matchesControlPart(node, matchers = []) {
  const haystacks = [
    node?.editorMeta?.controlPart,
    node?.props?.controlPart,
    node?.role,
    node?.props?.role,
    node?.name,
    node?.id
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => normalizePartName(value));
  const needles = matchers.map((value) => normalizePartName(value));
  return needles.some((needle) => haystacks.some((haystack) => haystack === needle || haystack.endsWith(needle)));
}

function normalizePartName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
