import { createAsset, createNode, createPage, NODE_TYPES } from "./schema.js";
import { createId, normalizeIdPrefix } from "./ids.js";
import { clone, deepMerge } from "./object.js";
import { createCommandPatch, createSnapshotPatch, invertSnapshotPatch } from "./patch.js";
import { findNodeInProject, removeNode, walkNodes } from "./tree.js";
import { validateProject } from "./validation.js";

export function applyCommand(project, command) {
  const before = clone(project);
  const next = clone(project);
  const label = command?.meta?.label || command?.type || "Command";

  if (!command?.type) {
    throw new Error("Command type is required.");
  }

  runCommand(next, command);
  touchProject(next);

  return {
    project: next,
    patch: createSnapshotPatch(before, next, label),
    inversePatch: invertSnapshotPatch(before, next, `Undo ${label}`),
    validation: validateProject(next)
  };
}

export function applyCommandPatch(project, commandPatch) {
  if (commandPatch?.kind !== "pixi-ui-command-patch") {
    throw new Error(`Unsupported command patch kind "${commandPatch?.kind}".`);
  }

  let current = clone(project);
  const patches = [];
  const inversePatches = [];
  let validation = [];

  for (const command of commandPatch.commands || []) {
    const result = applyCommand(current, command);
    current = result.project;
    patches.push(result.patch);
    inversePatches.unshift(result.inversePatch);
    validation = result.validation;
  }

  return {
    project: current,
    patch: createCommandPatch(commandPatch.commands || [], commandPatch.label || "Applied command patch"),
    patches,
    inversePatches,
    validation
  };
}

function runCommand(project, command) {
  switch (command.type) {
    case "project.create_page":
      return createPageCommand(project, command.args || {});
    case "project.delete_page":
      return deletePageCommand(project, command.args || {});
    case "project.rename_page":
      return renamePageCommand(project, command.args || {});
    case "project.set_token":
      return setProjectTokenCommand(project, command.args || {});
    case "project.delete_token":
      return deleteProjectTokenCommand(project, command.args || {});
    case "project.create_theme":
      return createProjectThemeCommand(project, command.args || {});
    case "project.update_theme":
      return updateProjectThemeCommand(project, command.args || {});
    case "project.delete_theme":
      return deleteProjectThemeCommand(project, command.args || {});
    case "project.create_style_library":
      return createProjectStyleLibraryCommand(project, command.args || {});
    case "project.update_style_library":
      return updateProjectStyleLibraryCommand(project, command.args || {});
    case "project.apply_style_library":
      return applyProjectStyleLibraryCommand(project, command.args || {});
    case "project.delete_style_library":
      return deleteProjectStyleLibraryCommand(project, command.args || {});
    case "page.update":
      return updatePageCommand(project, command.args || {});
    case "node.create":
      return createNodeCommand(project, command.args || {});
    case "node.update_props":
      return updateNodeCommand(project, command.args || {});
    case "node.move":
      return moveNodeCommand(project, command.args || {});
    case "node.reparent":
      return reparentNodeCommand(project, command.args || {});
    case "node.delete":
      return deleteNodeCommand(project, command.args || {});
    case "asset.import":
    case "asset.create":
      return createAssetCommand(project, command.args || {});
    case "asset.import_many":
      return createManyAssetsCommand(project, command.args || {});
    case "asset.update":
      return updateAssetCommand(project, command.args || {});
    case "asset.delete":
      return deleteAssetCommand(project, command.args || {});
    case "component.create":
      return createComponentCommand(project, command.args || {});
    case "component.instantiate":
      return instantiateComponentCommand(project, command.args || {});
    case "component.delete":
      return deleteComponentCommand(project, command.args || {});
    case "component.rename":
      return renameComponentCommand(project, command.args || {});
    case "component.create_variant":
      return createComponentVariantCommand(project, command.args || {});
    case "component.update_variant":
      return updateComponentVariantCommand(project, command.args || {});
    case "component.delete_variant":
      return deleteComponentVariantCommand(project, command.args || {});
    case "component.update_exposed_props":
      return updateComponentExposedPropsCommand(project, command.args || {});
    case "component.detach_instance":
      return detachComponentInstanceCommand(project, command.args || {});
    default:
      throw new Error(`Unknown command "${command.type}".`);
  }
}

function createPageCommand(project, args) {
  const page = args.page || createPage(args);
  if (project.pages.some((existing) => existing.id === page.id)) {
    throw new Error(`Page "${page.id}" already exists.`);
  }
  project.pages.push(page);
}

function deletePageCommand(project, args) {
  if (!args.pageId) {
    throw new Error("project.delete_page requires pageId.");
  }
  if (project.pages.length <= 1) {
    throw new Error("Cannot delete the last page.");
  }

  const pageIndex = project.pages.findIndex((candidate) => candidate.id === args.pageId);
  if (pageIndex < 0) {
    throw new Error(`Page "${args.pageId}" was not found.`);
  }

  project.pages.splice(pageIndex, 1);
}

function renamePageCommand(project, args) {
  const page = project.pages.find((candidate) => candidate.id === args.pageId);
  if (!page) {
    throw new Error(`Page "${args.pageId}" was not found.`);
  }
  page.name = args.name;
}

function setProjectTokenCommand(project, args) {
  const group = normalizeDesignSystemKey(args.group || args.tokenGroup || args.category, "project.set_token requires group.");
  const name = normalizeDesignSystemKey(args.name || args.key || args.tokenName, "project.set_token requires name.");
  if (!Object.hasOwn(args, "value")) {
    throw new Error("project.set_token requires value.");
  }

  project.tokens = project.tokens && typeof project.tokens === "object" && !Array.isArray(project.tokens)
    ? project.tokens
    : {};
  project.tokens[group] = project.tokens[group] && typeof project.tokens[group] === "object" && !Array.isArray(project.tokens[group])
    ? project.tokens[group]
    : {};
  project.tokens[group][name] = clone(args.value);
}

function deleteProjectTokenCommand(project, args) {
  const group = normalizeDesignSystemKey(args.group || args.tokenGroup || args.category, "project.delete_token requires group.");
  const name = normalizeDesignSystemKey(args.name || args.key || args.tokenName, "project.delete_token requires name.");
  if (!project.tokens?.[group] || !Object.hasOwn(project.tokens[group], name)) {
    throw new Error(`Token "${group}.${name}" was not found.`);
  }
  delete project.tokens[group][name];
}

function createProjectThemeCommand(project, args) {
  const theme = normalizeNamedDesignSystemRecord(args.theme || args, "theme");
  project.themes = Array.isArray(project.themes) ? project.themes : [];
  if (project.themes.some((candidate) => candidate.id === theme.id)) {
    throw new Error(`Theme "${theme.id}" already exists.`);
  }
  project.themes.push(theme);
}

function updateProjectThemeCommand(project, args) {
  const themeId = args.themeId || args.id;
  const theme = findDesignSystemRecord(project.themes, themeId, "Theme");
  const patch = clone(args.theme || args.patch || args);
  delete patch.themeId;
  delete patch.id;
  Object.assign(theme, deepMerge(theme, patch));
}

function deleteProjectThemeCommand(project, args) {
  const themeId = args.themeId || args.id;
  const index = findDesignSystemRecordIndex(project.themes, themeId, "Theme");
  project.themes.splice(index, 1);
}

function createProjectStyleLibraryCommand(project, args) {
  const library = normalizeNamedDesignSystemRecord(args.library || args, "style_library");
  project.styleLibraries = Array.isArray(project.styleLibraries) ? project.styleLibraries : [];
  if (project.styleLibraries.some((candidate) => candidate.id === library.id)) {
    throw new Error(`Style library "${library.id}" already exists.`);
  }
  project.styleLibraries.push({
    version: "1.0.0",
    tokens: {},
    themes: [],
    components: [],
    ...library
  });
}

function updateProjectStyleLibraryCommand(project, args) {
  const libraryId = args.libraryId || args.id;
  const library = findDesignSystemRecord(project.styleLibraries, libraryId, "Style library");
  const patch = clone(args.library || args.patch || args);
  delete patch.libraryId;
  delete patch.id;
  Object.assign(library, deepMerge(library, patch));
}

function deleteProjectStyleLibraryCommand(project, args) {
  const libraryId = args.libraryId || args.id;
  const index = findDesignSystemRecordIndex(project.styleLibraries, libraryId, "Style library");
  project.styleLibraries.splice(index, 1);
}

function applyProjectStyleLibraryCommand(project, args) {
  const libraryId = args.libraryId || args.id;
  const library = findDesignSystemRecord(project.styleLibraries, libraryId, "Style library");
  project.tokens = deepMerge(project.tokens || {}, library.tokens || {});
  project.themes = mergeDesignSystemRecords(project.themes, library.themes);
  project.components = mergeDesignSystemRecords(project.components, library.components);
}

function mergeDesignSystemRecords(currentRecords, nextRecords) {
  const merged = Array.isArray(currentRecords) ? currentRecords.map((record) => clone(record)) : [];
  for (const record of Array.isArray(nextRecords) ? nextRecords : []) {
    if (!record?.id) {
      continue;
    }
    const index = merged.findIndex((candidate) => candidate?.id === record.id);
    if (index >= 0) {
      merged[index] = deepMerge(merged[index], record);
    } else {
      merged.push(clone(record));
    }
  }
  return merged;
}

function updatePageCommand(project, args) {
  const page = project.pages.find((candidate) => candidate.id === args.pageId);
  if (!page) {
    throw new Error(`Page "${args.pageId}" was not found.`);
  }

  if (args.name !== undefined) {
    page.name = args.name;
  }

  for (const key of ["canvas", "variables", "editorMeta"]) {
    if (args[key] !== undefined) {
      page[key] = deepMerge(page[key] || {}, args[key]);
    }
  }

  if (args.rootTransform !== undefined) {
    page.root.transform = deepMerge(page.root.transform || {}, args.rootTransform);
  }
}

function createNodeCommand(project, args) {
  const parentId = args.parentId;
  if (!parentId) {
    throw new Error("node.create requires parentId.");
  }

  const parent = findNodeInProject(project, parentId);
  if (!parent) {
    throw new Error(`Parent node "${parentId}" was not found.`);
  }

  const node = createNode({
    ...args,
    type: args.type || args.nodeType,
    parentId
  });
  parent.node.children.push(node);
}

function updateNodeCommand(project, args) {
  const found = findNodeInProject(project, args.nodeId);
  if (!found) {
    throw new Error(`Node "${args.nodeId}" was not found.`);
  }

  const node = found.node;
  for (const key of ["name", "type", "active", "enabled"]) {
    if (args[key] !== undefined) {
      node[key] = args[key];
    }
  }

  for (const key of ["transform", "style", "props", "components", "states", "bindings", "editorMeta"]) {
    if (args[key] !== undefined) {
      node[key] = deepMerge(node[key] || {}, args[key]);
    }
  }

  if (args.layout !== undefined) {
    node.layout = deepMerge(node.layout || {}, args.layout);
    if (Object.hasOwn(args.layout, "anchors")) {
      node.layout.anchors = clone(args.layout.anchors);
    }
    if (Object.hasOwn(args.layout, "anchor")) {
      node.layout.anchor = clone(args.layout.anchor);
    }
  }

  if (Array.isArray(args.interactions)) {
    node.interactions = clone(args.interactions);
  }
}

function moveNodeCommand(project, args) {
  return updateNodeCommand(project, {
    nodeId: args.nodeId,
    transform: {
      x: args.x,
      y: args.y
    }
  });
}

function reparentNodeCommand(project, args) {
  const found = findNodeInProject(project, args.nodeId);
  const nextParent = findNodeInProject(project, args.parentId);
  if (!found) {
    throw new Error(`Node "${args.nodeId}" was not found.`);
  }
  if (!nextParent) {
    throw new Error(`Target parent "${args.parentId}" was not found.`);
  }
  if (!found.parent) {
    throw new Error("Root nodes cannot be reparented.");
  }
  if (args.nodeId === args.parentId) {
    throw new Error("A node cannot be parented to itself.");
  }
  if (containsNode(found.node, args.parentId)) {
    throw new Error("A node cannot be parented to its descendant.");
  }

  const sameParent = found.parent.id === args.parentId;
  const originalIndex = found.parent.children.findIndex((child) => child.id === args.nodeId);
  const worldBefore = getNodeWorldPosition(found.page.root, args.nodeId);
  const nextParentWorld = getNodeWorldPosition(found.page.root, args.parentId);
  const removed = removeNode(found.page.root, args.nodeId);
  removed.parentId = args.parentId;

  if (args.preserveWorldTransform && worldBefore && nextParentWorld) {
    removed.transform = {
      ...(removed.transform || {}),
      x: worldBefore.x - nextParentWorld.x,
      y: worldBefore.y - nextParentWorld.y
    };
  }

  let index = Number.isInteger(args.index) ? args.index : nextParent.node.children.length;
  if (sameParent && originalIndex < index) {
    index -= 1;
  }
  index = Math.min(Math.max(index, 0), nextParent.node.children.length);
  nextParent.node.children.splice(index, 0, removed);
}

function containsNode(root, nodeId) {
  if (!root) {
    return false;
  }

  if (root.id === nodeId) {
    return true;
  }

  return (root.children || []).some((child) => containsNode(child, nodeId));
}

function getNodeWorldPosition(root, nodeId, parentPosition = { x: 0, y: 0 }) {
  if (!root) {
    return null;
  }

  const x = parentPosition.x + Number(root.transform?.x || 0);
  const y = parentPosition.y + Number(root.transform?.y || 0);
  if (root.id === nodeId) {
    return { x, y };
  }

  for (const child of root.children || []) {
    const found = getNodeWorldPosition(child, nodeId, { x, y });
    if (found) {
      return found;
    }
  }

  return null;
}

function deleteNodeCommand(project, args) {
  const found = findNodeInProject(project, args.nodeId);
  if (!found) {
    throw new Error(`Node "${args.nodeId}" was not found.`);
  }
  if (!found.parent) {
    throw new Error("Root nodes cannot be deleted.");
  }
  removeNode(found.page.root, args.nodeId);
}

function createAssetCommand(project, args) {
  const asset = args.asset ? createAsset(args.asset) : createAsset(args);
  if (!asset.id) {
    asset.id = createId("asset");
  }
  if (project.assets.some((existing) => existing.id === asset.id)) {
    throw new Error(`Asset "${asset.id}" already exists.`);
  }
  project.assets.push(asset);
}

function createManyAssetsCommand(project, args) {
  const assets = Array.isArray(args.assets) ? args.assets : [];
  const knownIds = new Set(project.assets.map((asset) => asset.id));
  const nextAssets = [];

  for (const entry of assets) {
    const asset = createAsset(entry);
    if (!asset.id) {
      asset.id = createId("asset");
    }
    if (knownIds.has(asset.id)) {
      throw new Error(`Asset "${asset.id}" already exists.`);
    }
    knownIds.add(asset.id);
    nextAssets.push(asset);
  }

  project.assets.push(...nextAssets);
}

function updateAssetCommand(project, args) {
  const assetId = args.assetId || args.id;
  const asset = project.assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    throw new Error(`Asset "${assetId}" was not found.`);
  }

  const patch = clone(args.asset || args.patch || args);
  delete patch.assetId;
  delete patch.id;
  const next = deepMerge(asset, patch);
  if (Object.hasOwn(patch, "frames")) {
    next.frames = clone(patch.frames || {});
  }
  Object.assign(asset, next);
}

function deleteAssetCommand(project, args) {
  const assetId = args.assetId || args.id;
  const index = project.assets.findIndex((candidate) => candidate.id === assetId);
  if (index < 0) {
    throw new Error(`Asset "${assetId}" was not found.`);
  }
  project.assets.splice(index, 1);
}

function createComponentCommand(project, args) {
  const component = args.component ? clone(args.component) : createComponentFromArgs(project, args);
  if (!component?.id) {
    component.id = createId("component");
  }
  if (project.components.some((existing) => existing.id === component.id)) {
    throw new Error(`Component "${component.id}" already exists.`);
  }
  component.name = component.name || humanizeComponentId(component.id);
  component.version = component.version || "1.0.0";
  component.rootNode = normalizeComponentRoot(component.rootNode || component.root || component.node);
  if (!component.rootNode) {
    throw new Error("component.create requires rootNode or nodeId.");
  }
  project.components.push(component);
}

function createComponentFromArgs(project, args) {
  const found = args.nodeId ? findNodeInProject(project, args.nodeId) : null;
  const rootNode = found
    ? createComponentRootFromNode(found.node)
    : normalizeComponentRoot(args.rootNode || args.root || args.node);

  return {
    id: args.id || args.componentId || createId(normalizeIdPrefix(args.name || found?.node?.name || "component")),
    name: args.name || (found ? `${found.node.name} Component` : "New Component"),
    description: args.description || "",
    version: args.version || "1.0.0",
    variants: clone(args.variants || []),
    exposedProps: clone(args.exposedProps || args.propsSchema || {}),
    rootNode,
    editorMeta: {
      sourceNodeId: found?.node?.id,
      createdFromPageId: found?.page?.id,
      ...(args.editorMeta || {})
    }
  };
}

function instantiateComponentCommand(project, args) {
  const componentId = args.componentId || args.id;
  if (!componentId) {
    throw new Error("component.instantiate requires componentId.");
  }
  const component = (project.components || []).find((candidate) => candidate.id === componentId);
  if (!component) {
    throw new Error(`Component "${componentId}" was not found.`);
  }

  const parentId = args.parentId;
  if (!parentId) {
    throw new Error("component.instantiate requires parentId.");
  }
  const parent = findNodeInProject(project, parentId);
  if (!parent) {
    throw new Error(`Parent node "${parentId}" was not found.`);
  }

  const rootTransform = component.rootNode?.transform || {};
  const node = createNode({
    id: args.nodeId || args.instanceId || args.idOverride,
    type: NODE_TYPES.componentInstance,
    name: args.name || component.name || "Component Instance",
    parentId,
    transform: {
      x: 0,
      y: 0,
      width: rootTransform.width,
      height: rootTransform.height,
      ...(args.transform || {})
    },
    props: {
      componentId,
      ...(args.props || {})
    },
    layout: args.layout,
    style: args.style,
    editorMeta: {
      componentId,
      ...(args.editorMeta || {})
    }
  });
  if (args.overrides !== undefined) {
    node.overrides = clone(args.overrides);
  }
  parent.node.children.push(node);
}

function deleteComponentCommand(project, args) {
  const componentId = args.componentId || args.id;
  if (!componentId) {
    throw new Error("component.delete requires componentId.");
  }

  const index = (project.components || []).findIndex((candidate) => candidate.id === componentId);
  if (index < 0) {
    throw new Error(`Component "${componentId}" was not found.`);
  }

  project.components.splice(index, 1);
}

function renameComponentCommand(project, args) {
  const componentId = args.componentId || args.id;
  if (!componentId) {
    throw new Error("component.rename requires componentId.");
  }

  const name = String(args.name || "").trim();
  if (!name) {
    throw new Error("component.rename requires name.");
  }

  const component = (project.components || []).find((candidate) => candidate.id === componentId);
  if (!component) {
    throw new Error(`Component "${componentId}" was not found.`);
  }

  component.name = name;
  const primaryNode = getComponentPrimaryNode(component);
  if (primaryNode) {
    primaryNode.name = name;
  }

  for (const page of project.pages || []) {
    renameComponentInstanceNodes(page.root, componentId, name);
  }
  for (const candidate of project.components || []) {
    renameComponentInstanceNodes(candidate.rootNode, componentId, name);
  }
}

function getComponentPrimaryNode(component) {
  const root = component?.rootNode;
  if (!root) {
    return null;
  }

  if (root.editorMeta?.instanceDefinitionRoot && root.children?.length === 1) {
    return root.children[0];
  }

  return root;
}

function renameComponentInstanceNodes(root, componentId, name) {
  walkNodes(root, (node) => {
    if (node.type === NODE_TYPES.componentInstance && getComponentInstanceReferenceId(node) === componentId) {
      node.name = name;
    }
  });
}

function createComponentVariantCommand(project, args) {
  const component = findComponent(project, args.componentId || args.id);
  const variant = normalizeNamedDesignSystemRecord(args.variant || args, "variant");
  component.variants = Array.isArray(component.variants) ? component.variants : [];
  if (component.variants.some((candidate) => candidate.id === variant.id)) {
    throw new Error(`Variant "${variant.id}" already exists.`);
  }
  component.variants.push({
    overrides: {},
    ...variant
  });
}

function updateComponentVariantCommand(project, args) {
  const component = findComponent(project, args.componentId);
  const variantId = args.variantId || args.id;
  const variant = findDesignSystemRecord(component.variants, variantId, "Variant");
  const patch = clone(args.variant || args.patch || args);
  delete patch.componentId;
  delete patch.variantId;
  delete patch.id;
  Object.assign(variant, deepMerge(variant, patch));
}

function deleteComponentVariantCommand(project, args) {
  const component = findComponent(project, args.componentId);
  const variantId = args.variantId || args.id;
  const index = findDesignSystemRecordIndex(component.variants, variantId, "Variant");
  component.variants.splice(index, 1);
}

function updateComponentExposedPropsCommand(project, args) {
  const component = findComponent(project, args.componentId || args.id);
  component.exposedProps = clone(args.exposedProps || args.propsSchema || {});
}

function getComponentInstanceReferenceId(node) {
  return node?.props?.componentId || node?.componentId || node?.editorMeta?.componentId || null;
}

function detachComponentInstanceCommand(project, args) {
  const nodeId = args.nodeId || args.instanceId;
  if (!nodeId) {
    throw new Error("component.detach_instance requires nodeId.");
  }

  const found = findNodeInProject(project, nodeId);
  if (!found?.parent) {
    throw new Error(`Component instance "${nodeId}" was not found.`);
  }
  if (found.node.type !== NODE_TYPES.componentInstance) {
    throw new Error(`Node "${nodeId}" is not a component instance.`);
  }

  const componentId = found.node.props?.componentId || found.node.componentId || found.node.editorMeta?.componentId;
  const component = (project.components || []).find((candidate) => candidate.id === componentId);
  if (!component?.rootNode) {
    throw new Error(`Component "${componentId}" was not found.`);
  }

  const parentChildren = found.parent.children || [];
  const index = parentChildren.findIndex((child) => child.id === nodeId);
  if (index < 0) {
    throw new Error(`Component instance "${nodeId}" was not found.`);
  }

  const detached = materializeComponentInstance(component.rootNode, found.node);
  parentChildren.splice(index, 1, detached);
}

function materializeComponentInstance(rootNode, instanceNode) {
  const root = clone(getMaterializedComponentRoot(rootNode));
  const overrides = rootOverrides(instanceNode.overrides);
  const materialized = deepMerge(root, overrides[root.id] || overrides[root.name] || {});
  const transform = {
    ...(materialized.transform || {}),
    ...(instanceNode.transform || {})
  };

  materialized.id = instanceNode.id;
  materialized.name = instanceNode.name || materialized.name;
  materialized.parentId = instanceNode.parentId;
  materialized.transform = transform;
  materialized.editorMeta = {
    ...(materialized.editorMeta || {}),
    detachedFromComponentId: instanceNode.props?.componentId || instanceNode.componentId || instanceNode.editorMeta?.componentId
  };
  materialized.children = (materialized.children || []).map((child) => prefixDetachedNodeIds(child, instanceNode.id));
  repairComponentParentIds(materialized, instanceNode.parentId);
  return materialized;
}

function getMaterializedComponentRoot(rootNode) {
  if (rootNode?.editorMeta?.instanceDefinitionRoot && rootNode.children?.length === 1) {
    return rootNode.children[0];
  }
  return rootNode;
}

function rootOverrides(overrides) {
  return overrides && typeof overrides === "object" && !Array.isArray(overrides) ? overrides : {};
}

function prefixDetachedNodeIds(node, prefix) {
  const next = clone(node);
  next.id = `${prefix}_${next.id || createId("node")}`;
  next.children = (next.children || []).map((child) => prefixDetachedNodeIds(child, prefix));
  return next;
}

function createComponentRootFromNode(node) {
  const root = clone(node);
  root.parentId = null;
  root.transform = {
    ...(root.transform || {}),
    x: 0,
    y: 0
  };
  repairComponentParentIds(root, null);
  return root;
}

function normalizeComponentRoot(rootNode) {
  if (!rootNode) {
    return null;
  }
  const root = clone(rootNode);
  root.parentId = null;
  repairComponentParentIds(root, null);
  return root;
}

function repairComponentParentIds(node, parentId) {
  node.parentId = parentId;
  node.children = Array.isArray(node.children) ? node.children : [];
  for (const child of node.children) {
    repairComponentParentIds(child, node.id);
  }
  return node;
}

function humanizeComponentId(id) {
  return String(id || "Component")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findComponent(project, componentId) {
  if (!componentId) {
    throw new Error("componentId is required.");
  }
  const component = (project.components || []).find((candidate) => candidate.id === componentId);
  if (!component) {
    throw new Error(`Component "${componentId}" was not found.`);
  }
  return component;
}

function normalizeDesignSystemKey(value, errorMessage) {
  const key = String(value || "").trim();
  if (!key) {
    throw new Error(errorMessage);
  }
  return key;
}

function normalizeNamedDesignSystemRecord(source = {}, fallbackPrefix = "item") {
  const record = clone(source);
  const name = String(record.name || record.id || "").trim();
  const id = String(record.id || createId(normalizeIdPrefix(name || fallbackPrefix))).trim();
  if (!id) {
    throw new Error(`${fallbackPrefix} requires id or name.`);
  }
  return {
    ...record,
    id,
    name: name || humanizeComponentId(id)
  };
}

function findDesignSystemRecord(records, recordId, label) {
  const index = findDesignSystemRecordIndex(records, recordId, label);
  return records[index];
}

function findDesignSystemRecordIndex(records, recordId, label) {
  if (!recordId) {
    throw new Error(`${label} id is required.`);
  }
  const index = (records || []).findIndex((candidate) => candidate.id === recordId || candidate.name === recordId);
  if (index < 0) {
    throw new Error(`${label} "${recordId}" was not found.`);
  }
  return index;
}

function touchProject(project) {
  if (project.project) {
    project.project.updatedAt = new Date().toISOString();
  }
}
