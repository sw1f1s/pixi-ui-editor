import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

export async function importContractModule({ label, candidates, requiredExports }) {
  const resolvedCandidates = candidates.map((candidate) => resolve(repoRoot, candidate));
  const existingCandidate = resolvedCandidates.find((candidate) => existsSync(candidate));

  if (!existingCandidate) {
    throw new Error(
      [
        `Missing contract module for ${label}.`,
        "Expected one of:",
        ...candidates.map((candidate) => `  - ${candidate}`),
        `Required exports: ${requiredExports.join(", ")}`,
      ].join("\n"),
    );
  }

  let module;
  try {
    module = await import(pathToFileURL(existingCandidate).href);
  } catch (error) {
    throw new Error(
      [
        `Could not import ${label} from ${relativeToRepo(existingCandidate)}.`,
        error?.stack || error?.message || String(error),
      ].join("\n"),
    );
  }

  for (const exportName of requiredExports) {
    assert.ok(
      exportName in module,
      `${label} must export ${exportName} from ${relativeToRepo(existingCandidate)}`,
    );
  }

  return module;
}

export function assertFunction(value, name) {
  assert.equal(typeof value, "function", `${name} must be a function`);
}

export function assertJsonSerializable(value, label) {
  assert.doesNotThrow(() => JSON.stringify(value), `${label} must be JSON serializable`);
}

export function assertValidationOk(result, label) {
  assert.equal(typeof result, "object", `${label} must return an object`);
  assert.notEqual(result, null, `${label} must return an object`);
  assert.equal(result.valid, true, `${label}.valid must be true`);
  assert.ok(Array.isArray(result.errors), `${label}.errors must be an array`);
  assert.equal(result.errors.length, 0, `${label}.errors must be empty for a valid document`);
}

export function assertNoValidationErrors(messages, label) {
  assert.ok(Array.isArray(messages), `${label} must return an array of validation messages`);
  assert.deepEqual(
    messages.filter((message) => message.severity === "error"),
    [],
    `${label} must not return validation errors`,
  );
}

export function assertOwnArray(value, property, label) {
  assert.ok(Array.isArray(value[property]), `${label}.${property} must be an array`);
}

function relativeToRepo(path) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}

export function repoPath(...segments) {
  return join(repoRoot, ...segments);
}
