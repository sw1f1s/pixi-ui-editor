import {
  asArray,
  collectAssetReferences,
  collectDuplicateIds,
  compactUndefined,
  summarizeNodeTree
} from "./helpers.js";
import { normalizeProjectDocument } from "./normalize.js";

export function createExportManifest(document, options = {}) {
  const normalized = normalizeProjectDocument(document);
  const screens = normalized.pages.map((page) => createScreenManifestEntry(page));
  const components = normalized.components.map((component) => createComponentManifestEntry(component));
  const assets = normalized.assets.map((asset) => createAssetManifestEntry(asset));
  const warnings = createExportWarnings({ screens, components, assets });
  const summary = createExportSummary({ screens, components, assets, warnings });

  return compactUndefined({
    format: "pixi-ui-editor.manifest",
    formatVersion: options.formatVersion || "1.0.0",
    schemaVersion: normalized.schemaVersion,
    generatedAt: options.generatedAt || new Date().toISOString(),
    project: normalized.project,
    tokens: normalized.tokens,
    themes: normalized.themes,
    styleLibraries: normalized.styleLibraries,
    locales: normalized.locales,
    exportProfiles: normalized.exportProfiles,
    screens,
    components,
    assets,
    summary,
    warnings
  });
}

export function createScreenManifestEntry(page) {
  const summary = summarizeNodeTree(page.rootNode);

  return compactUndefined({
    id: page.id,
    name: page.name,
    canvas: page.canvas,
    rootNode: page.rootNode,
    linkedAssetIds: summary.assetIds,
    summary
  });
}

export function createComponentManifestEntry(component) {
  const summary = summarizeNodeTree(component.rootNode);

  return compactUndefined({
    id: component.id,
    name: component.name,
    description: component.description,
    version: component.version,
    variants: component.variants || [],
    exposedProps: component.exposedProps || component.propsSchema,
    rootNode: component.rootNode,
    linkedAssetIds: summary.assetIds,
    summary
  });
}

export function createAssetManifestEntry(asset) {
  return compactUndefined({
    id: asset.id,
    name: asset.name,
    type: asset.type,
    src: asset.src,
    width: asset.width,
    height: asset.height,
    mime: asset.mime,
    family: asset.family,
    format: asset.format,
    nineSlice: asset.nineSlice,
    imageAssetId: asset.imageAssetId,
    frames: asset.frames,
    tags: asset.tags,
    density: asset.density,
    license: asset.license,
    meta: asset.meta
  });
}

export function createExportSummary({ screens, components, assets, warnings }) {
  const screenNodeCount = screens.reduce((sum, screen) => sum + screen.summary.nodeCount, 0);
  const componentNodeCount = components.reduce((sum, component) => sum + component.summary.nodeCount, 0);
  const usedAssetIds = new Set();

  for (const entry of [...screens, ...components]) {
    for (const assetId of asArray(entry.linkedAssetIds)) {
      usedAssetIds.add(assetId);
    }
  }

  return {
    screenCount: screens.length,
    componentCount: components.length,
    assetCount: assets.length,
    usedAssetCount: usedAssetIds.size,
    unusedAssetCount: Math.max(0, assets.length - usedAssetIds.size),
    nodeCount: screenNodeCount + componentNodeCount,
    screenNodeCount,
    componentNodeCount,
    warningCount: warnings.length
  };
}

export function createExportWarnings({ screens, components, assets }) {
  const warnings = [];
  const knownAssetIds = new Set(assets.map((asset) => asset.id));
  const rootNodes = [...screens.map((screen) => screen.rootNode), ...components.map((component) => component.rootNode)];
  const duplicateNodeIds = collectDuplicateIds(rootNodes);

  for (const id of duplicateNodeIds) {
    warnings.push({
      code: "duplicate_node_id",
      severity: "warning",
      message: `Duplicate node id "${id}" found across exported roots.`
    });
  }

  for (const entry of [...screens, ...components]) {
    const linkedAssetIds = collectAssetReferences(entry.rootNode);
    for (const assetId of linkedAssetIds) {
      if (!knownAssetIds.has(assetId)) {
        warnings.push({
          code: "missing_asset",
          severity: "warning",
          targetId: entry.id,
          assetId,
          message: `Node tree "${entry.id}" references missing asset "${assetId}".`
        });
      }
    }
  }

  return warnings;
}
