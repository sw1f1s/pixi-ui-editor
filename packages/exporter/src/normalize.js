import { asArray, cloneJson, compactUndefined, isObject, toStableId } from "./helpers.js";
import { normalizeNodeComponent as normalizeNodeComponentDescriptor } from "../../core/src/document-helpers.js";

export function normalizeProjectDocument(document = {}) {
  const source = cloneJson(document) || {};

  return {
    schemaVersion: source.schemaVersion || "1.0.0",
    project: isObject(source.project) ? source.project : {},
    tokens: source.tokens || {},
    themes: asArray(source.themes),
    styleLibraries: asArray(source.styleLibraries),
    assets: asArray(source.assets).map(normalizeAsset),
    components: asArray(source.components).map(normalizeComponent),
    pages: asArray(source.pages || source.screens).map(normalizePage),
    locales: asArray(source.locales),
    exportProfiles: asArray(source.exportProfiles)
  };
}

export function normalizeAsset(asset, index = 0) {
  const id = toStableId(asset?.id || asset?.assetId || asset?.name, `asset_${index}`);

  return compactUndefined({
    ...asset,
    id,
    name: toStableId(asset?.name, id),
    type: toStableId(asset?.type, "texture"),
    src: asset?.src || asset?.url || asset?.href,
    meta: asset?.meta || asset?.metadata
  });
}

export function normalizePage(page, index = 0) {
  const id = toStableId(page?.id || page?.screenId || page?.slug, `screen_${index}`);

  return compactUndefined({
    ...page,
    id,
    name: toStableId(page?.name, id),
    canvas: page?.canvas || page?.viewport || page?.frame,
    rootNode: normalizeRootNode(page?.rootNode || page?.root || page?.node, page?.nodes, `${id}.root`)
  });
}

export function normalizeComponent(component, index = 0) {
  const id = toStableId(component?.id || component?.componentId || component?.slug, `component_${index}`);

  return compactUndefined({
    ...component,
    id,
    name: toStableId(component?.name, id),
    rootNode: normalizeRootNode(component?.rootNode || component?.root || component?.node, component?.nodes, `${id}.root`)
  });
}

export function normalizeRootNode(rootNode, nodes, fallbackId) {
  if (isObject(rootNode)) {
    return normalizeNode(rootNode, fallbackId);
  }

  return normalizeNode(
    {
      id: fallbackId,
      name: fallbackId.replace(/\W+/g, "_"),
      type: "container",
      children: asArray(nodes)
    },
    fallbackId
  );
}

export function normalizeNode(node, fallbackId = "node") {
  const source = isObject(node) ? node : {};
  const id = toStableId(source.id, fallbackId);

  return compactUndefined({
    ...source,
    id,
    name: toStableId(source.name, id),
    type: toStableId(source.type, "container"),
    props: isObject(source.props) ? source.props : {},
    style: isObject(source.style) ? source.style : {},
    transform: isObject(source.transform) ? source.transform : {},
    layout: isObject(source.layout) ? source.layout : {},
    components: asArray(source.components).map((component, index) => compactUndefined(normalizeNodeComponentDescriptor(component, index))),
    children: asArray(source.children).map((child, index) => normalizeNode(child, `${id}.${index}`))
  });
}
