import { clone, stableStringify } from "./object.js";

export function createSnapshotPatch(before, after, label = "Project change") {
  return {
    kind: "project-snapshot-patch",
    version: "1.0",
    label,
    beforeHash: hashProject(before),
    afterHash: hashProject(after),
    project: clone(after)
  };
}

export function invertSnapshotPatch(before, after, label = "Undo project change") {
  return {
    kind: "project-snapshot-patch",
    version: "1.0",
    label,
    beforeHash: hashProject(after),
    afterHash: hashProject(before),
    project: clone(before)
  };
}

export function applySnapshotPatch(patch) {
  if (patch?.kind !== "project-snapshot-patch") {
    throw new Error(`Unsupported patch kind "${patch?.kind}".`);
  }
  return clone(patch.project);
}

export function createCommandPatch(commands, label = "Command patch") {
  return {
    kind: "pixi-ui-command-patch",
    version: "1.0",
    label,
    commands: clone(commands)
  };
}

export function hashProject(project) {
  const input = stableStringify(project);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
