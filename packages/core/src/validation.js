import { ASSET_TYPE_LIST, NODE_COMPONENT_TYPE_LIST, NODE_TYPE_LIST } from "./schema.js";
import { walkNodes } from "./tree.js";
import { componentsOf, getNodeComponent } from "./document-helpers.js";

const LAYOUT_MODES = new Set(["absolute", "flex", "list", "grid", "component"]);
const FLEX_DIRECTIONS = new Set(["row", "column", "horizontal", "vertical"]);
const ALIGN_VALUES = new Set(["start", "center", "middle", "end", "stretch", "fill", "left", "right", "top", "bottom", "flex-start", "flex-end"]);
const JUSTIFY_VALUES = new Set([...ALIGN_VALUES, "space-between", "between"]);

export function validateProject(project) {
  const messages = [];

  if (!project || typeof project !== "object") {
    return [error("project.invalid", "Project must be an object.")];
  }

  if (!project.schemaVersion) {
    messages.push(error("project.schemaVersion.missing", "Project schemaVersion is required."));
  }

  if (!project.project?.id) {
    messages.push(error("project.id.missing", "Project metadata id is required."));
  }

  if (!Array.isArray(project.pages)) {
    messages.push(error("project.pages.invalid", "Project pages must be an array."));
    return messages;
  }

  const globalIds = new Set();
  const knownAssetIds = new Set((project.assets || []).map((asset) => asset?.id).filter(Boolean));
  const knownComponents = new Map((project.components || []).filter((component) => component?.id).map((component) => [component.id, component]));
  const knownComponentIds = new Set(knownComponents.keys());
  for (const page of project.pages) {
    validatePage(page, messages, globalIds, knownAssetIds, knownComponentIds, knownComponents);
  }

  validateDesignSystem(project, messages);
  validateAssets(project, messages);
  validateComponents(project, messages);

  return messages;
}

export function hasErrors(messages) {
  return messages.some((message) => message.severity === "error");
}

function validatePage(page, messages, globalIds, knownAssetIds, knownComponentIds, knownComponents = new Map()) {
  if (!page?.id) {
    messages.push(error("page.id.missing", "Page id is required."));
    return;
  }

  if (globalIds.has(page.id)) {
    messages.push(error("id.duplicate", `Duplicate id "${page.id}".`, { id: page.id }));
  }
  globalIds.add(page.id);

  if (!page.root) {
    messages.push(error("page.root.missing", `Page "${page.id}" is missing root node.`, { pageId: page.id }));
    return;
  }

  validateCanvas(page, messages);

  const pageNodeIds = new Set();
  walkNodes(page.root, (node, path) => {
    if (!node.id) {
      messages.push(error("node.id.missing", `Node in page "${page.id}" is missing id.`, { pageId: page.id }));
      return;
    }

    if (globalIds.has(node.id)) {
      messages.push(error("id.duplicate", `Duplicate id "${node.id}".`, { id: node.id, pageId: page.id }));
    }
    globalIds.add(node.id);

    if (pageNodeIds.has(node.id)) {
      messages.push(error("node.id.duplicateInPage", `Duplicate node id "${node.id}" in page "${page.id}".`, { pageId: page.id, nodeId: node.id }));
    }
    pageNodeIds.add(node.id);

    if (!NODE_TYPE_LIST.includes(node.type)) {
      messages.push(error("node.type.unsupported", `Unsupported node type "${node.type}" on "${node.id}".`, { pageId: page.id, nodeId: node.id, type: node.type }));
    }

    if (node.active !== undefined && typeof node.active !== "boolean") {
      messages.push(warn("node.active.invalid", `Node "${node.id}" active must be boolean.`, { pageId: page.id, nodeId: node.id }));
    }

    if (node.type === "componentInstance") {
      const componentId = node.props?.componentId || node.componentId || node.editorMeta?.componentId;
      if (!componentId || !knownComponentIds.has(componentId)) {
        messages.push(warn("component.instance.missing", `Component instance "${node.id}" references missing instance "${componentId || "unknown"}".`, {
          pageId: page.id,
          nodeId: node.id,
          componentId
        }));
      } else if (node.props?.variant) {
        const component = knownComponents.get(componentId);
        const variantRef = node.props.variant;
        const hasVariant = (component?.variants || []).some((variant) => variant?.id === variantRef || variant?.name === variantRef);
        if (!hasVariant) {
          messages.push(warn("component.instance.variant.missing", `Component instance "${node.id}" references missing variant "${variantRef}".`, {
            pageId: page.id,
            nodeId: node.id,
            componentId,
            variant: variantRef
          }));
        }
      }
    }

    if (path.length === 0 && node.parentId !== null) {
      messages.push(error("node.root.parent", `Root node "${node.id}" must not have a parentId.`, { pageId: page.id, nodeId: node.id }));
    }

    validateNodeLayout(page, node, messages);

    for (const child of node.children || []) {
      if (child.parentId !== node.id) {
        messages.push(error("node.parent.mismatch", `Node "${child.id}" parentId must be "${node.id}".`, { pageId: page.id, nodeId: child.id, expectedParentId: node.id }));
      }
    }

    validateNodeComponentDescriptors(page, node, messages);

    const nodeComponents = componentsOf(node);
    for (const component of nodeComponents) {
      if (!NODE_COMPONENT_TYPE_LIST.includes(component.type)) {
        messages.push(warn("node.component.unsupported", `Unsupported component type "${component.type}" on "${node.id}".`, {
          pageId: page.id,
          nodeId: node.id,
          componentId: component.id,
          type: component.type
        }));
      }
      if (String(component.type || "").toLowerCase() === "layout") {
        validateNodeLayout(page, { ...node, layout: component.props || {} }, messages);
      }
    }

    const textComponent = getNodeComponent(node, "text");
    const textureComponent = getNodeComponent(node, "texture");
    const textProps = textComponent?.props;
    const textureProps = textureComponent?.props;
    const hasTextComponent = Boolean(textComponent);
    const hasTextureComponent = Boolean(textureComponent);

    if (hasTextComponent && typeof textProps?.text !== "string" && !node.bindings?.text) {
      messages.push(warn("text.empty", `Text component on "${node.id}" has no text string or text binding.`, { pageId: page.id, nodeId: node.id }));
    }

    if (hasTextureComponent && !textureProps?.assetId) {
      messages.push(warn("texture.asset.missing", `Texture component on "${node.id}" has no assetId yet.`, { pageId: page.id, nodeId: node.id }));
    }

    if (hasTextureComponent && textureProps?.assetId && !knownAssetIds.has(textureProps.assetId)) {
      messages.push(warn("texture.asset.unknown", `Texture component on "${node.id}" references unknown asset "${textureProps.assetId}".`, { pageId: page.id, nodeId: node.id, assetId: textureProps.assetId }));
    }

    if (hasTextComponent && textProps?.fontAssetId && !knownAssetIds.has(textProps.fontAssetId)) {
      messages.push(warn("text.fontAsset.unknown", `Text component on "${node.id}" references unknown font asset "${textProps.fontAssetId}".`, { pageId: page.id, nodeId: node.id, assetId: textProps.fontAssetId }));
    }
  });
}

function validateNodeComponentDescriptors(page, node, messages) {
  const componentIds = new Set();
  for (const component of node.components || []) {
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      messages.push(warn("node.component.invalid", `Node "${node.id}" component descriptors must be objects.`, { pageId: page.id, nodeId: node.id }));
      continue;
    }

    const componentId = component.id || component.type || component.kind;
    if (componentId && componentIds.has(componentId)) {
      messages.push(warn("node.component.duplicate", `Node "${node.id}" has duplicate component id "${componentId}".`, {
        pageId: page.id,
        nodeId: node.id,
        componentId,
        type: component.type || component.kind
      }));
    }
    if (componentId) {
      componentIds.add(componentId);
    }

    if (component.enabled !== undefined && typeof component.enabled !== "boolean") {
      messages.push(warn("node.component.enabled.invalid", `Component "${componentId || "unknown"}" on "${node.id}" enabled must be boolean.`, {
        pageId: page.id,
        nodeId: node.id,
        componentId
      }));
    }
    if (component.props !== undefined && (!component.props || typeof component.props !== "object" || Array.isArray(component.props))) {
      messages.push(warn("node.component.props.invalid", `Component "${componentId || "unknown"}" on "${node.id}" props must be an object.`, {
        pageId: page.id,
        nodeId: node.id,
        componentId
      }));
    }
  }
}

function validateCanvas(page, messages) {
  const canvas = page.canvas || {};
  const width = Number(canvas.width);
  const height = Number(canvas.height);
  if (!Number.isFinite(width) || width <= 0) {
    messages.push(error("canvas.width.invalid", `Page "${page.id}" canvas width must be a positive number.`, { pageId: page.id }));
  }
  if (!Number.isFinite(height) || height <= 0) {
    messages.push(error("canvas.height.invalid", `Page "${page.id}" canvas height must be a positive number.`, { pageId: page.id }));
  }

  const safeArea = canvas.safeArea || {};
  const values = ["top", "right", "bottom", "left"].map((key) => [key, Number(safeArea[key] || 0)]);
  for (const [key, value] of values) {
    if (!Number.isFinite(value) || value < 0) {
      messages.push(error("canvas.safeArea.invalid", `Page "${page.id}" safeArea.${key} must be a non-negative number.`, { pageId: page.id, edge: key }));
    }
  }

  const top = Number(safeArea.top || 0);
  const right = Number(safeArea.right || 0);
  const bottom = Number(safeArea.bottom || 0);
  const left = Number(safeArea.left || 0);
  if (Number.isFinite(width) && left + right >= width) {
    messages.push(error("canvas.safeArea.width", `Page "${page.id}" horizontal safe area exceeds canvas width.`, { pageId: page.id }));
  }
  if (Number.isFinite(height) && top + bottom >= height) {
    messages.push(error("canvas.safeArea.height", `Page "${page.id}" vertical safe area exceeds canvas height.`, { pageId: page.id }));
  }
}

function validateNodeLayout(page, node, messages) {
  const layout = node.layout || {};
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    messages.push(warn("layout.invalid", `Node "${node.id}" layout must be an object.`, { pageId: page.id, nodeId: node.id }));
    return;
  }

  const mode = layout.mode;
  if (mode !== undefined && !LAYOUT_MODES.has(String(mode).toLowerCase())) {
    messages.push(warn("layout.mode.unsupported", `Node "${node.id}" uses unsupported layout mode "${mode}".`, { pageId: page.id, nodeId: node.id, mode }));
  }

  if (layout.safeArea !== undefined && typeof layout.safeArea !== "boolean") {
    messages.push(warn("layout.safeArea.invalid", `Node "${node.id}" layout.safeArea must be boolean.`, { pageId: page.id, nodeId: node.id }));
  }

  validateAnchors(page, node, layout, messages);
  validateNonNegativeLayoutNumber(page, node, layout, messages, "gap");
  validateNonNegativeLayoutNumber(page, node, layout, messages, "rowGap");
  validateNonNegativeLayoutNumber(page, node, layout, messages, "columnGap");
  validateNonNegativeLayoutNumber(page, node, layout, messages, "cellWidth");
  validateNonNegativeLayoutNumber(page, node, layout, messages, "cellHeight");
  validateNonNegativeLayoutNumber(page, node, layout, messages, "grow");
  validatePositiveLayoutNumber(page, node, layout, messages, "aspectRatio");
  validatePositiveLayoutNumber(page, node, layout, messages, "columns", { integer: true });
  validatePadding(page, node, layout, messages);

  const direction = layout.direction ?? layout.flexDirection ?? layout.orientation;
  if (direction !== undefined && !FLEX_DIRECTIONS.has(String(direction).toLowerCase())) {
    messages.push(warn("layout.direction.unsupported", `Node "${node.id}" uses unsupported layout direction "${direction}".`, { pageId: page.id, nodeId: node.id, direction }));
  }

  const align = layout.alignItems ?? layout.align ?? layout.justifyItems;
  if (align !== undefined && !ALIGN_VALUES.has(String(align).toLowerCase())) {
    messages.push(warn("layout.align.unsupported", `Node "${node.id}" uses unsupported layout alignment "${align}".`, { pageId: page.id, nodeId: node.id, align }));
  }

  const justify = layout.justifyContent ?? layout.justify;
  if (justify !== undefined && !JUSTIFY_VALUES.has(String(justify).toLowerCase())) {
    messages.push(warn("layout.justify.unsupported", `Node "${node.id}" uses unsupported layout justify value "${justify}".`, { pageId: page.id, nodeId: node.id, justify }));
  }
}

function validateAnchors(page, node, layout, messages) {
  const anchors = layout.anchors || layout.anchor;
  if (layout.anchors && layout.anchor) {
    messages.push(warn("layout.anchor.duplicate", `Node "${node.id}" defines both layout.anchor and layout.anchors.`, { pageId: page.id, nodeId: node.id }));
  }
  if (!anchors || typeof anchors !== "object" || Array.isArray(anchors)) {
    return;
  }

  for (const key of ["left", "right", "centerX", "top", "bottom", "centerY"]) {
    if (anchors[key] !== undefined && !isFiniteNumber(anchors[key])) {
      messages.push(warn("layout.anchor.invalid", `Node "${node.id}" anchor.${key} must be a number.`, { pageId: page.id, nodeId: node.id, edge: key }));
    }
  }

  const horizontal = ["left", "right", "centerX"].filter((key) => anchors[key] !== undefined);
  const vertical = ["top", "bottom", "centerY"].filter((key) => anchors[key] !== undefined);
  if ((horizontal.includes("centerX") && horizontal.length > 1) || horizontal.length > 2) {
    messages.push(warn("layout.anchor.conflict", `Node "${node.id}" has conflicting horizontal anchors.`, { pageId: page.id, nodeId: node.id, keys: horizontal }));
  }
  if ((vertical.includes("centerY") && vertical.length > 1) || vertical.length > 2) {
    messages.push(warn("layout.anchor.conflict", `Node "${node.id}" has conflicting vertical anchors.`, { pageId: page.id, nodeId: node.id, keys: vertical }));
  }
}

function validatePadding(page, node, layout, messages) {
  const padding = layout.padding;
  if (padding === undefined || padding === null) {
    return;
  }

  if (typeof padding === "number" || typeof padding === "string") {
    if (!isFiniteNumber(padding) || Number(padding) < 0) {
      messages.push(warn("layout.padding.invalid", `Node "${node.id}" layout.padding must be non-negative.`, { pageId: page.id, nodeId: node.id }));
    }
    return;
  }

  if (typeof padding !== "object" || Array.isArray(padding)) {
    messages.push(warn("layout.padding.invalid", `Node "${node.id}" layout.padding must be a number or edge object.`, { pageId: page.id, nodeId: node.id }));
    return;
  }

  for (const key of ["top", "right", "bottom", "left", "x", "y", "horizontal", "vertical"]) {
    if (padding[key] !== undefined && (!isFiniteNumber(padding[key]) || Number(padding[key]) < 0)) {
      messages.push(warn("layout.padding.invalid", `Node "${node.id}" layout.padding.${key} must be non-negative.`, { pageId: page.id, nodeId: node.id, edge: key }));
    }
  }
}

function validateNonNegativeLayoutNumber(page, node, layout, messages, key) {
  if (layout[key] === undefined || layout[key] === null || layout[key] === "") {
    return;
  }
  if (!isFiniteNumber(layout[key]) || Number(layout[key]) < 0) {
    messages.push(warn("layout.number.invalid", `Node "${node.id}" layout.${key} must be a non-negative number.`, { pageId: page.id, nodeId: node.id, key }));
  }
}

function validatePositiveLayoutNumber(page, node, layout, messages, key, options = {}) {
  if (layout[key] === undefined || layout[key] === null || layout[key] === "") {
    return;
  }
  const value = Number(layout[key]);
  if (!Number.isFinite(value) || value <= 0 || options.integer && !Number.isInteger(value)) {
    messages.push(warn("layout.number.invalid", `Node "${node.id}" layout.${key} must be a positive${options.integer ? " integer" : ""} number.`, { pageId: page.id, nodeId: node.id, key }));
  }
}

function isFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number);
}

function validateAssets(project, messages) {
  const ids = new Set();
  for (const asset of project.assets || []) {
    if (!asset.id) {
      messages.push(error("asset.id.missing", "Asset id is required."));
      continue;
    }
    if (ids.has(asset.id)) {
      messages.push(error("asset.id.duplicate", `Duplicate asset id "${asset.id}".`, { assetId: asset.id }));
    }
    ids.add(asset.id);

    if (!ASSET_TYPE_LIST.includes(asset.type)) {
      messages.push(warn("asset.type.unsupported", `Unsupported asset type "${asset.type}" on "${asset.id}".`, { assetId: asset.id, type: asset.type }));
    }

    if ((asset.type === "texture" || asset.type === "font") && !asset.src) {
      messages.push(warn("asset.src.missing", `Asset "${asset.id}" has no src.`, { assetId: asset.id }));
    }

    if (asset.type === "spriteAtlas") {
      if (!asset.src && !asset.imageAssetId) {
        messages.push(warn("asset.atlas.image.missing", `Sprite atlas "${asset.id}" has no texture source.`, { assetId: asset.id }));
      }
      if (!asset.frames || Object.keys(asset.frames).length === 0) {
        messages.push(warn("asset.atlas.frames.missing", `Sprite atlas "${asset.id}" has no frames.`, { assetId: asset.id }));
      }
    }
  }
}

function validateDesignSystem(project, messages) {
  if (!project.tokens || typeof project.tokens !== "object" || Array.isArray(project.tokens)) {
    messages.push(warn("tokens.invalid", "Project tokens should be an object."));
  } else {
    for (const [group, values] of Object.entries(project.tokens)) {
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        messages.push(warn("tokens.group.invalid", `Token group "${group}" should be an object.`, { group }));
      }
    }
  }

  validateNamedRecordList(project.themes, messages, "theme", "Theme");
  validateNamedRecordList(project.styleLibraries, messages, "styleLibrary", "Style library");
}

function validateComponents(project, messages) {
  const ids = new Set();
  for (const component of project.components || []) {
    if (!component.id) {
      messages.push(error("component.id.missing", "Component id is required."));
      continue;
    }
    if (ids.has(component.id)) {
      messages.push(error("component.id.duplicate", `Duplicate component id "${component.id}".`, { componentId: component.id }));
    }
    ids.add(component.id);

    let componentNodeIndex = null;
    if (!component.rootNode || typeof component.rootNode !== "object" || Array.isArray(component.rootNode)) {
      messages.push(error("component.root.missing", `Component "${component.id}" is missing rootNode.`, { componentId: component.id }));
    } else {
      componentNodeIndex = validateComponentRoot(component, messages);
    }

    validateNamedRecordList(component.variants || [], messages, "component.variant", `Component "${component.id}" variant`, { componentId: component.id });
    validateComponentVariants(component, componentNodeIndex, messages);

    if (component.exposedProps !== undefined && (!component.exposedProps || typeof component.exposedProps !== "object" || Array.isArray(component.exposedProps))) {
      messages.push(warn("component.exposedProps.invalid", `Component "${component.id}" exposedProps should be an object.`, { componentId: component.id }));
    } else {
      validateComponentExposedProps(component, componentNodeIndex, messages);
    }
    if (component.propsSchema !== undefined && (!component.propsSchema || typeof component.propsSchema !== "object" || Array.isArray(component.propsSchema))) {
      messages.push(warn("component.propsSchema.invalid", `Component "${component.id}" propsSchema should be an object.`, { componentId: component.id }));
    }
  }
}

function validateComponentRoot(component, messages) {
  const nodeIds = new Set();
  const nodeIndex = new Map();
  walkNodes(component.rootNode, (node) => {
    if (!node.id) {
      messages.push(error("component.node.id.missing", `Component "${component.id}" contains a node without id.`, { componentId: component.id }));
      return;
    }
    if (nodeIds.has(node.id)) {
      messages.push(error("component.node.id.duplicate", `Component "${component.id}" contains duplicate node id "${node.id}".`, { componentId: component.id, nodeId: node.id }));
    }
    nodeIds.add(node.id);
    indexComponentNode(nodeIndex, node);

    if (!NODE_TYPE_LIST.includes(node.type)) {
      messages.push(error("component.node.type.unsupported", `Unsupported node type "${node.type}" in component "${component.id}".`, { componentId: component.id, nodeId: node.id, type: node.type }));
    }

    for (const nodeComponent of componentsOf(node)) {
      if (!NODE_COMPONENT_TYPE_LIST.includes(nodeComponent.type)) {
        messages.push(warn("component.node.component.unsupported", `Unsupported component type "${nodeComponent.type}" in component "${component.id}".`, {
          componentId: component.id,
          nodeId: node.id,
          componentType: nodeComponent.type
        }));
      }
    }
  });
  return nodeIndex;
}

function indexComponentNode(nodeIndex, node) {
  for (const key of [node.id, node.sourceId, node.name]) {
    if (key) {
      nodeIndex.set(String(key).toLowerCase(), node);
    }
  }
}

function validateComponentVariants(component, componentNodeIndex, messages) {
  if (!componentNodeIndex) {
    return;
  }

  for (const variant of component.variants || []) {
    const overrides = variant?.overrides || variant?.nodes || variant?.patch;
    if (overrides === undefined) {
      continue;
    }
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      messages.push(warn("component.variant.overrides.invalid", `Variant "${variant.id || variant.name || "unknown"}" on component "${component.id}" should use an object override map.`, {
        componentId: component.id,
        variantId: variant.id
      }));
      continue;
    }

    for (const targetRef of Object.keys(overrides)) {
      if (!componentNodeIndex.has(String(targetRef).toLowerCase())) {
        messages.push(warn("component.variant.target.missing", `Variant "${variant.id || variant.name || "unknown"}" targets missing node "${targetRef}".`, {
          componentId: component.id,
          variantId: variant.id,
          targetRef
        }));
      }
    }
  }
}

function validateComponentExposedProps(component, componentNodeIndex, messages) {
  const exposedProps = component.exposedProps || component.propsSchema;
  if (!exposedProps || typeof exposedProps !== "object" || Array.isArray(exposedProps) || !componentNodeIndex) {
    return;
  }

  for (const [propName, definition] of Object.entries(exposedProps)) {
    const targetPath = getExposedPropTargetPath(propName, definition);
    if (!targetPath) {
      messages.push(warn("component.exposedProps.target.missing", `Exposed prop "${propName}" on component "${component.id}" has no target path.`, {
        componentId: component.id,
        propName
      }));
      continue;
    }

    if (!isValidExposedPropTargetPath(componentNodeIndex, targetPath)) {
      messages.push(warn("component.exposedProps.target.invalid", `Exposed prop "${propName}" on component "${component.id}" targets missing path "${targetPath}".`, {
        componentId: component.id,
        propName,
        targetPath
      }));
    }
  }
}

function getExposedPropTargetPath(propName, definition) {
  if (typeof definition === "string") {
    return definition;
  }
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    return null;
  }

  const explicitPath = definition.path || definition.targetPath || definition.binding;
  if (typeof explicitPath === "string" && explicitPath.trim()) {
    return explicitPath;
  }

  const targetNode = definition.nodeId || definition.targetNodeId || definition.node || definition.target;
  const componentRef = definition.componentId || definition.componentType || definition.component;
  const targetProp = definition.prop || definition.property || propName;
  if (targetNode && componentRef && targetProp) {
    return `${targetNode}.components.${componentRef}.props.${targetProp}`;
  }
  if (targetNode && targetProp) {
    return `${targetNode}.props.${targetProp}`;
  }
  if (componentRef && targetProp) {
    return `components.${componentRef}.props.${targetProp}`;
  }
  return null;
}

function isValidExposedPropTargetPath(componentNodeIndex, path) {
  const segments = String(path || "").split(".").filter(Boolean);
  if (!segments.length) {
    return false;
  }

  const firstNode = componentNodeIndex.get(String(segments[0]).toLowerCase());
  const node = firstNode || componentNodeIndex.values().next().value;
  const remaining = firstNode ? segments.slice(1) : segments;
  if (!node || !remaining.length) {
    return false;
  }

  if (remaining[0] === "components") {
    const componentRef = remaining[1];
    if (!componentRef) {
      return false;
    }
    return componentsOf(node).some((nodeComponent) => {
      return [nodeComponent?.id, nodeComponent?.type, nodeComponent?.kind, nodeComponent?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === String(componentRef).toLowerCase());
    });
  }

  return ["props", "style", "transform", "layout", "editorMeta", "name", "active"].includes(remaining[0]);
}

function validateNamedRecordList(records, messages, codePrefix, label, extraDetails = {}) {
  if (records === undefined) {
    return;
  }
  if (!Array.isArray(records)) {
    messages.push(warn(`${codePrefix}.invalid`, `${label} list should be an array.`, extraDetails));
    return;
  }
  const ids = new Set();
  for (const record of records) {
    if (!record?.id) {
      messages.push(warn(`${codePrefix}.id.missing`, `${label} id is required.`, extraDetails));
      continue;
    }
    if (ids.has(record.id)) {
      messages.push(warn(`${codePrefix}.id.duplicate`, `Duplicate ${label.toLowerCase()} id "${record.id}".`, { ...extraDetails, id: record.id }));
    }
    ids.add(record.id);
  }
}

export function error(code, message, details = {}) {
  return {
    severity: "error",
    code,
    message,
    details
  };
}

export function warn(code, message, details = {}) {
  return {
    severity: "warning",
    code,
    message,
    details
  };
}
