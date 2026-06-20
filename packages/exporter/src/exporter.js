import { createExportManifest } from "./manifest.js";

export function exportProject(document, options = {}) {
  const manifest = createExportManifest(document, options);
  const bundle = {
    schemaVersion: manifest.schemaVersion,
    manifest,
    pages: manifest.screens,
    screens: manifest.screens,
    components: manifest.components,
    assets: manifest.assets,
    summary: manifest.summary,
    warnings: manifest.warnings
  };

  return options.includeEditorData === false ? stripEditorData(bundle) : bundle;
}

export function exportPixiUiBundle(document, options = {}) {
  return exportProject(document, {
    includeEditorData: false,
    ...options
  });
}

export function exportProjectToJson(document, options = {}) {
  const bundle = exportProject(document, options);
  const space = options.pretty === false ? 0 : options.space ?? 2;

  return {
    manifestJson: JSON.stringify(bundle.manifest, null, space),
    screensJson: JSON.stringify(bundle.screens, null, space),
    componentsJson: JSON.stringify(bundle.components, null, space),
    assetsJson: JSON.stringify(bundle.assets, null, space),
    summaryJson: JSON.stringify(bundle.summary, null, space)
  };
}

function stripEditorData(value) {
  if (Array.isArray(value)) {
    return value.map(stripEditorData);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "editorMeta")
      .map(([key, entry]) => [key, stripEditorData(entry)])
  );
}
