import { asArray, cloneJson, isObject, toStableId } from "./helpers.js";

export async function loadRuntimeManifest(options = {}) {
  if (options.manifest) {
    return normalizeRuntimeManifest(options.manifest);
  }

  if (options.bundle?.manifest) {
    return normalizeRuntimeManifest(options.bundle.manifest);
  }

  if (options.document) {
    return normalizeRuntimeManifest(projectDocumentToManifest(options.document));
  }

  if (options.manifestUrl) {
    const fetcher = options.fetch || globalThis.fetch;
    if (!fetcher) {
      throw new Error("manifestUrl requires a fetch implementation.");
    }

    const response = await fetcher(options.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load UI manifest: ${response.status} ${response.statusText}`);
    }

    return normalizeRuntimeManifest(await response.json());
  }

  throw new Error("createPixiUiRuntime requires manifest, bundle, document, or manifestUrl.");
}

export function normalizeRuntimeManifest(manifest) {
  const source = cloneJson(manifest) || {};
  const screens = asArray(source.screens).map((screen, index) => normalizeScreenEntry(screen, index));
  const components = asArray(source.components).map((component, index) => normalizeComponentEntry(component, index));
  const assets = asArray(source.assets).map((asset, index) => ({
    ...asset,
    id: toStableId(asset?.id, `asset_${index}`),
    type: toStableId(asset?.type, "texture")
  }));

  return {
    ...source,
    format: source.format || "pixi-ui-editor.manifest",
    formatVersion: source.formatVersion || "1.0.0",
    schemaVersion: source.schemaVersion || "1.0.0",
    project: isObject(source.project) ? source.project : {},
    screens,
    components,
    assets,
    tokens: source.tokens || {},
    themes: asArray(source.themes),
    styleLibraries: asArray(source.styleLibraries),
    locales: asArray(source.locales),
    exportProfiles: asArray(source.exportProfiles)
  };
}

export function projectDocumentToManifest(document) {
  const projectDocument = cloneJson(document) || {};

  return {
    format: "pixi-ui-editor.manifest",
    formatVersion: "1.0.0",
    schemaVersion: projectDocument.schemaVersion || "1.0.0",
    project: projectDocument.project || {},
    screens: asArray(projectDocument.pages).map((page, index) => normalizeScreenEntry(page, index)),
    components: asArray(projectDocument.components).map((component, index) => normalizeComponentEntry(component, index)),
    assets: asArray(projectDocument.assets),
    tokens: projectDocument.tokens || {},
    themes: asArray(projectDocument.themes),
    styleLibraries: asArray(projectDocument.styleLibraries),
    locales: asArray(projectDocument.locales),
    exportProfiles: asArray(projectDocument.exportProfiles)
  };
}

export function createManifestIndexes(manifest) {
  return {
    screensById: createIndex(manifest.screens),
    componentsById: createIndex(manifest.components),
    assetsById: createIndex(manifest.assets)
  };
}

export function findManifestEntry(entries, ref, kind) {
  const id = typeof ref === "string" ? ref : ref?.id;
  const name = typeof ref === "string" ? ref : ref?.name;
  const entry = entries.find((item) => item.id === id || item.name === name);

  if (!entry) {
    throw new Error(`Unknown ${kind}: ${id || name || "<empty>"}`);
  }

  return entry;
}

export function getLocaleDictionary(manifest, localeId) {
  const locale = asArray(manifest.locales).find((item) => {
    return item?.id === localeId || item?.locale === localeId || item?.name === localeId;
  });

  if (!locale) {
    return {};
  }

  return locale.entries || locale.translations || locale.messages || {};
}

function createIndex(entries) {
  return new Map(asArray(entries).map((entry) => [entry.id, entry]));
}

function normalizeScreenEntry(screen, index) {
  const id = toStableId(screen?.id || screen?.screenId || screen?.slug, `screen_${index}`);

  return {
    ...screen,
    id,
    name: toStableId(screen?.name, id),
    rootNode: screen?.rootNode || screen?.root || screen?.node || {
      id: `${id}.root`,
      name: `${id}Root`,
      type: "container",
      children: asArray(screen?.nodes)
    }
  };
}

function normalizeComponentEntry(component, index) {
  const id = toStableId(component?.id || component?.componentId || component?.slug, `component_${index}`);

  return {
    ...component,
    id,
    name: toStableId(component?.name, id),
    rootNode: component?.rootNode || component?.root || component?.node || {
      id: `${id}.root`,
      name: `${id}Root`,
      type: "container",
      children: asArray(component?.nodes)
    }
  };
}
