import { cloneJson, isObject } from "./helpers.js";

export const PIXIPROJECTUI_FILE_EXTENSION = "pixiprojectui";
export const PIXIPROJECTUI_PROJECT_BUNDLE_KIND = "pixi-ui-editor.project-bundle";
export const PIXIPROJECTUI_PROJECT_BUNDLE_VERSION = 1;

export function createPixiUiProjectBundle(project, options = {}) {
  if (!isObject(project)) {
    throw new TypeError("createPixiUiProjectBundle requires a project document object.");
  }

  return {
    kind: PIXIPROJECTUI_PROJECT_BUNDLE_KIND,
    version: options.version || PIXIPROJECTUI_PROJECT_BUNDLE_VERSION,
    savedAt: options.savedAt || new Date().toISOString(),
    editorVersion: options.editorVersion || project.project?.editorVersion || "0.1.0",
    project: cloneJson(project),
    layout: cloneJson(options.layout || null),
    assetFiles: normalizeAssetFiles(options.assetFiles)
  };
}

export function isPixiUiProjectBundle(value) {
  return value?.kind === PIXIPROJECTUI_PROJECT_BUNDLE_KIND && isObject(value.project);
}

export function readPixiUiProjectBundle(bundle) {
  if (!isPixiUiProjectBundle(bundle)) {
    throw new TypeError("Project file must be a .pixiprojectui bundle.");
  }

  return {
    project: cloneJson(bundle.project),
    layout: cloneJson(bundle.layout || null),
    assetFiles: normalizeAssetFiles(bundle.assetFiles),
    savedAt: bundle.savedAt,
    editorVersion: bundle.editorVersion,
    version: bundle.version
  };
}

function normalizeAssetFiles(assetFiles) {
  if (!Array.isArray(assetFiles)) {
    return [];
  }

  return assetFiles
    .filter((file) => isObject(file) && file.key && file.dataUrl)
    .map((file) => ({
      key: String(file.key),
      assetId: file.assetId === undefined || file.assetId === null ? undefined : String(file.assetId),
      name: file.name === undefined || file.name === null ? undefined : String(file.name),
      fileName: file.fileName === undefined || file.fileName === null ? undefined : String(file.fileName),
      mime: file.mime === undefined || file.mime === null ? undefined : String(file.mime),
      byteSize: Number.isFinite(Number(file.byteSize)) ? Number(file.byteSize) : undefined,
      dataUrl: String(file.dataUrl)
    }));
}
