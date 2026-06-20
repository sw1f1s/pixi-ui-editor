// node, component and command operations.
import { state, session, bindEditorApi } from "../app/editorRuntime.js";
import { applyCommand, applySnapshotPatch, ASSET_TYPES, clone, createSnapshotPatch, createId, findNodeInProject, NODE_COMPONENT_TYPES, NODE_TYPES, roundCanvasNumber } from "../app/editorDeps.js";
const { canLayerContainChildren, centerCanvasView, createNodeComponent, createProjectBundleFilename, getActiveEditingComponent, getActivePage, getAssetById, getAssetSpriteSize, getComponentById, getComponentUsageEntries, getNodeLocalFrame, getNodeSubtreeIds, getSelectedNode, getTextureRenderType, isTextureDropAsset, normalizeProjectName, render, roundedRect, sanitizeAssetId, setInstanceContextMenuOpen, worldPointToLocalPoint } = bindEditorApi(["canLayerContainChildren","centerCanvasView","createNodeComponent","createProjectBundleFilename","getActiveEditingComponent","getActivePage","getAssetById","getAssetSpriteSize","getComponentById","getComponentUsageEntries","getNodeLocalFrame","getNodeSubtreeIds","getSelectedNode","getTextureRenderType","isTextureDropAsset","normalizeProjectName","render","roundedRect","sanitizeAssetId","setInstanceContextMenuOpen","worldPointToLocalPoint"]);

export function createUiNode(kind, worldPoint = null, parentIdOverride = null) {
  if (kind === "sprite" && state.selectedAssetId) {
    return createSpriteNodeFromAsset(state.selectedAssetId, worldPoint, parentIdOverride);
  }

  const page = getActivePage();
  const parentId = parentIdOverride || getCreationParentId(page);
  const localPoint = worldPoint ? worldPointToLocalPoint(parentId, worldPoint) : null;
  const template = getNodeTemplate(kind, localPoint);
  if (!template) {
    return;
  }

  state.collapsedLayerIds.delete(parentId);
  selectEditorNode(template.id);
  runCommand({
    type: "node.create",
    args: {
      parentId,
      ...template
    },
    meta: { source: "user", label: `Create ${template.name}` }
  });
}

export function createSpriteNodeFromAsset(assetId, worldPoint = null, parentIdOverride = null) {
  const asset = getAssetById(assetId);
  if (!isTextureDropAsset(asset)) {
    return false;
  }

  const page = getActivePage();
  const parentId = parentIdOverride || getCreationParentId(page);
  const localPoint = worldPoint ? worldPointToLocalPoint(parentId, worldPoint) : null;
  const size = getAssetSpriteSize(asset);
  const frameName = asset.type === ASSET_TYPES.spriteAtlas ? Object.keys(asset.frames || {})[0] : undefined;
  const textureType = getTextureRenderType({ frame: frameName }, asset);
  const nodeId = createId("sprite");

  state.collapsedLayerIds.delete(parentId);
  runCommand({
    type: "node.create",
    args: {
      parentId,
      id: nodeId,
      nodeType: NODE_TYPES.graphics,
      name: asset.type === ASSET_TYPES.spriteAtlas && frameName ? frameName : asset.name || "Sprite",
      transform: {
        x: localPoint ? roundCanvasNumber(localPoint.x) : 120,
        y: localPoint ? roundCanvasNumber(localPoint.y) : 120,
        width: size.width,
        height: size.height
      },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.texture, {
          assetId: asset.id,
          frame: frameName,
          textureType,
          objectFit: "contain",
          tint: "#ffffff",
          flipX: false,
          flipY: false,
          pixelsPerUnitMultiplier: 1
        })
      ]
    },
    meta: { source: "user", label: `Create sprite from ${asset.name || asset.id}` }
  });
  selectEditorNode(nodeId);
  return true;
}

export function createComponentFromSelection() {
  return createInstanceFromSelectedLayer();
}

export function instantiateComponent(componentId, worldPoint = null, parentIdOverride = null) {
  const component = state.project.components.find((candidate) => candidate.id === componentId);
  if (!component || !canInstantiateComponent(componentId)) {
    return false;
  }

  const page = getActivePage();
  const parentId = parentIdOverride || getCreationParentId(page);
  const localPoint = worldPoint ? worldPointToLocalPoint(parentId, worldPoint) : null;
  const rootTransform = component.rootNode?.transform || {};
  const nodeId = createId("component_instance");
  state.collapsedLayerIds.delete(parentId);
  runCommand({
    type: "component.instantiate",
    args: {
      componentId,
      parentId,
      nodeId,
      name: getComponentDisplayName(component),
      transform: {
        x: localPoint ? roundCanvasNumber(localPoint.x) : 0,
        y: localPoint ? roundCanvasNumber(localPoint.y) : 0,
        width: rootTransform.width || 240,
        height: rootTransform.height || 96
      }
    },
    meta: { source: "user", label: `Instantiate ${component.name || componentId}` }
  });
  selectEditorNode(nodeId);
  render();
  return true;
}

export function canInstantiateComponent(componentId) {
  return Boolean(componentId && getComponentById(componentId) && state.editingComponentId !== componentId);
}

export function canCreateInstanceFromSelectedLayer(node = getSelectedNode()) {
  return Boolean(node && node.parentId !== null && !isComponentInstanceNode(node));
}

export function canEditSelectedInstanceNode(node = getSelectedNode()) {
  return Boolean(isComponentInstanceNode(node) && !isMissingComponentInstanceNode(node) && getComponentById(getComponentReferenceId(node)));
}

export function createInstanceFromSelectedLayer() {
  const node = getSelectedNode();
  if (!canCreateInstanceFromSelectedLayer(node)) {
    return false;
  }

  const found = findNodeInProject(state.project, node.id);
  if (!found?.parent) {
    return false;
  }

  const componentId = createId(sanitizeAssetId(`${node.name || "instance"}_instance`));
  const componentName = createUniqueInstanceName(normalizeInstanceDefinitionName(node.name || "Layer"));
  const parentId = found.parent.id;
  const transform = { ...(node.transform || {}) };
  const rootNode = createComponentDefinitionRoot(node, componentId);

  runCommandGroup([
    {
      type: "component.create",
      args: {
        id: componentId,
        rootNode,
        name: componentName
      },
      meta: { source: "user", label: `Create ${componentName}` }
    },
    {
      type: "node.delete",
      args: { nodeId: node.id },
      meta: { source: "user", label: `Replace ${node.name} with instance` }
    },
    {
      type: "component.instantiate",
      args: {
        componentId,
        parentId,
        nodeId: node.id,
        name: componentName,
        transform
      },
      meta: { source: "user", label: `Instantiate ${componentName}` }
    }
  ], `Create ${componentName}`);
  selectEditorNode(node.id);
  render();
  return true;
}

export function createComponentDefinitionRoot(sourceNode, componentId) {
  const frame = getNodeLocalFrame(sourceNode);
  const content = clone(sourceNode);
  let index = 0;
  const rewriteIds = (node, parentId) => {
    const nextId = `${componentId}_node_${index + 1}`;
    index += 1;
    node.id = nextId;
    node.parentId = parentId;
    node.children = (node.children || []).map((child) => rewriteIds(child, nextId));
    return node;
  };

  const rootId = `${componentId}_root`;
  rewriteIds(content, rootId);
  content.transform = {
    ...(content.transform || {}),
    x: 0,
    y: 0
  };
  content.name = normalizeInstanceDefinitionName(sourceNode.name || "Layer");

  return {
    id: rootId,
    type: NODE_TYPES.container,
    name: `${normalizeInstanceDefinitionName(sourceNode.name || "Layer")} Root`,
    parentId: null,
    transform: {
      x: 0,
      y: 0,
      width: Math.max(1, Number(frame.width || sourceNode.transform?.width || 240)),
      height: Math.max(1, Number(frame.height || sourceNode.transform?.height || 96))
    },
    style: { visible: true, alpha: 1 },
    props: {},
    children: [content],
    editorMeta: {
      instanceDefinitionRoot: true,
      sourceNodeId: sourceNode.id
    }
  };
}

export function enterComponentEditMode(componentId) {
  const component = getComponentById(componentId);
  if (!component?.rootNode) {
    return false;
  }

  state.editingComponentId = component.id;
  selectEditorNode(component.rootNode.children?.[0]?.id || component.rootNode.id);
  state.collapsedLayerIds.clear();
  setInstanceContextMenuOpen(false);
  render();
  centerCanvasView();
  return true;
}

export function exitComponentEditMode() {
  state.editingComponentId = null;
  state.selectedPageId = state.pageId;
  state.selectedNodeId = null;
  render();
  return true;
}

export function deleteComponentDefinition(componentId) {
  const component = getComponentById(componentId);
  if (!component) {
    return false;
  }

  runCommand({
    type: "component.delete",
    args: { componentId },
    meta: { source: "user", label: `Delete ${component.name || componentId}` }
  });
  if (state.editingComponentId === componentId) {
    exitComponentEditMode();
  }
  return true;
}

export function selectComponentUsage(componentId, offset = 0) {
  const usages = getComponentUsageEntries(componentId);
  if (!usages.length) {
    return false;
  }

  const currentIndex = usages.findIndex((usage) => usage.nodeId === state.selectedNodeId);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % usages.length
    : Math.max(0, Math.min(usages.length - 1, Number(offset || 0)));
  const usage = usages[nextIndex];
  if (usage.scope === "component") {
    state.editingComponentId = usage.ownerComponentId;
  } else {
    state.editingComponentId = null;
    state.pageId = usage.pageId;
    state.selectedPageId = usage.pageId;
  }

  selectEditorNode(usage.nodeId);
  setInstanceContextMenuOpen(false);
  render();
  centerCanvasView();
  return true;
}

export function renameComponentDefinition(componentId, rawName, renderOptions = {}) {
  const component = getComponentById(componentId);
  if (!component) {
    return false;
  }

  const name = createUniqueInstanceName(normalizeInstanceDefinitionName(rawName), componentId);
  if (component.name === name && getComponentPrimaryNode(component)?.name === name) {
    return false;
  }

  runCommand({
    type: "component.rename",
    args: {
      componentId,
      name
    },
    meta: { source: "user", label: `Rename ${component.name || component.id} to ${name}` }
  }, renderOptions);
  return true;
}

export function normalizeInstanceDefinitionName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+Instance$/i, "")
    .trim() || "Untitled";
}

export function getComponentDisplayName(component) {
  return normalizeInstanceDefinitionName(component?.name || component?.id || "Untitled");
}

export function createUniqueInstanceName(baseName, exceptComponentId = null) {
  const normalizedBase = normalizeInstanceDefinitionName(baseName);
  const existingNames = new Set((state.project.components || [])
    .filter((component) => component.id !== exceptComponentId)
    .map((component) => getComponentDisplayName(component)));
  if (!existingNames.has(normalizedBase)) {
    return normalizedBase;
  }

  let index = 2;
  while (existingNames.has(`${normalizedBase} ${index}`)) {
    index += 1;
  }
  return `${normalizedBase} ${index}`;
}

export function getComponentPrimaryNode(component) {
  const root = component?.rootNode;
  if (!root) {
    return null;
  }

  if (root.editorMeta?.instanceDefinitionRoot && root.children?.length === 1) {
    return root.children[0];
  }

  return root;
}

export function isEditingComponentPrimaryNode(node) {
  const component = getActiveEditingComponent();
  return Boolean(component && node && getComponentPrimaryNode(component)?.id === node.id);
}

export function detachSelectedInstanceNode() {
  const node = getSelectedNode();
  if (!isComponentInstanceNode(node) || isMissingComponentInstanceNode(node)) {
    return false;
  }

  runCommand({
    type: "component.detach_instance",
    args: { nodeId: node.id },
    meta: { source: "user", label: `Detach ${node.name}` }
  });
  selectEditorNode(node.id);
  render();
  return true;
}

export function isComponentInstanceNode(node) {
  return Boolean(node && node.type === NODE_TYPES.componentInstance && (node.props?.componentId || node.editorMeta?.componentId || node.componentId));
}

export function getComponentReferenceId(node) {
  return node?.props?.componentId || node?.componentId || node?.editorMeta?.componentId || null;
}

export function isMissingComponentInstanceNode(node) {
  const componentId = getComponentReferenceId(node);
  return Boolean(isComponentInstanceNode(node) && componentId && !getComponentById(componentId));
}

export function getNodeTemplate(kind, worldPoint = null) {
  const defaults = {
    text: {
      nodeType: NODE_TYPES.graphics,
      name: "New Text",
      transform: { x: 120, y: 360, width: 360, height: 72 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "New Text", fontFamily: "Inter", fontSize: 44, fill: "#ffffff", align: "left", verticalAlign: "top", lineHeight: 1.2, wrap: true })
      ]
    },
    sprite: {
      nodeType: NODE_TYPES.graphics,
      name: "New Sprite",
      transform: { x: 120, y: 120, width: 180, height: 180 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.texture, { assetId: null, objectFit: "contain", tint: "#ffffff", flipX: false, flipY: false, pixelsPerUnitMultiplier: 1 })
      ]
    },
    button: {
      nodeType: NODE_TYPES.graphics,
      name: "New Button",
      transform: { x: 220, y: 1180, width: 520, height: 118 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#2d7ff9", radius: 24 }),
        createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "Button", fontFamily: "Inter", fontSize: 44, fill: "#ffffff", align: "center", verticalAlign: "middle", lineHeight: 1.1, wrap: false }),
        createNodeComponent(NODE_COMPONENT_TYPES.button, { cursor: "pointer" })
      ]
    },
    panel: {
      nodeType: NODE_TYPES.graphics,
      name: "New Panel",
      transform: { x: 96, y: 480, width: 888, height: 420 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#252b3d", radius: 24 })
      ]
    },
    toggle: {
      nodeType: NODE_TYPES.graphics,
      name: "New Toggle",
      transform: { x: 220, y: 1320, width: 260, height: 108 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.toggle, { checked: true, onFill: "#33b8a5", offFill: "#2b3040", knobFill: "#ffffff", cursor: "pointer" }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#33b8a5", radius: 54 }),
        createNodeComponent(NODE_COMPONENT_TYPES.button, { cursor: "pointer" })
      ],
      children: [
        {
          id: createId("toggle_thumb"),
          type: NODE_TYPES.graphics,
          name: "Thumb",
          parentId: null,
          transform: { x: 154, y: 14, width: 80, height: 80 },
          layout: { anchors: { right: 26, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "toggleThumb" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#ffffff", radius: 40 }),
            createNodeComponent(NODE_COMPONENT_TYPES.shadow, { color: "#000000", alpha: 0.24, blur: 14, offsetX: 0, offsetY: 5 })
          ]
        }
      ]
    },
    checkbox: {
      nodeType: NODE_TYPES.graphics,
      name: "New Checkbox",
      transform: { x: 160, y: 1320, width: 360, height: 96 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.checkbox, { checked: true, checkFill: "#33b8a5", boxFill: "#151922", stroke: "#59657a", cursor: "pointer" })
      ],
      children: [
        {
          id: createId("checkbox_box"),
          type: NODE_TYPES.graphics,
          name: "Box",
          parentId: null,
          transform: { x: 0, y: 12, width: 72, height: 72 },
          layout: { anchors: { left: 0, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "checkboxBox" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#151922", stroke: "#59657a", strokeWidth: 3, radius: 12 })
          ],
          children: [
            {
              id: createId("checkbox_check"),
              type: NODE_TYPES.graphics,
              name: "Check",
              parentId: null,
              transform: { x: 0, y: 0, width: 72, height: 72 },
              layout: { anchors: { left: 0, right: 0, top: 0, bottom: 0 } },
              props: {},
              editorMeta: { controlPart: "checkboxCheck" },
              components: [
                createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "X", fontFamily: "Inter", fontSize: 42, fill: "#33b8a5", align: "center", verticalAlign: "middle", lineHeight: 1, wrap: false })
              ]
            }
          ]
        },
        {
          id: createId("checkbox_label"),
          type: NODE_TYPES.graphics,
          name: "Label",
          parentId: null,
          transform: { x: 96, y: 12, width: 260, height: 72 },
          layout: { anchors: { left: 96, right: 0, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "checkboxLabel" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "Checkbox", fontFamily: "Inter", fontSize: 36, fill: "#ffffff", align: "left", verticalAlign: "middle", lineHeight: 1.1, wrap: false })
          ]
        }
      ]
    },
    radio: {
      nodeType: NODE_TYPES.graphics,
      name: "New Radio",
      transform: { x: 160, y: 1320, width: 320, height: 96 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.radio, { checked: true, group: "default", checkFill: "#33b8a5", ringFill: "#151922", stroke: "#59657a", cursor: "pointer" })
      ],
      children: [
        {
          id: createId("radio_ring"),
          type: NODE_TYPES.graphics,
          name: "Ring",
          parentId: null,
          transform: { x: 0, y: 12, width: 72, height: 72 },
          layout: { anchors: { left: 0, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "radioRing" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#151922", stroke: "#59657a", strokeWidth: 3, radius: 36 })
          ]
        },
        {
          id: createId("radio_dot"),
          type: NODE_TYPES.graphics,
          name: "Dot",
          parentId: null,
          transform: { x: 20, y: 32, width: 32, height: 32 },
          layout: { anchors: { left: 20, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "radioDot" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#33b8a5", radius: 16 })
          ]
        },
        {
          id: createId("radio_label"),
          type: NODE_TYPES.graphics,
          name: "Label",
          parentId: null,
          transform: { x: 96, y: 12, width: 220, height: 72 },
          layout: { anchors: { left: 96, right: 0, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "radioLabel" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "Radio", fontFamily: "Inter", fontSize: 36, fill: "#ffffff", align: "left", verticalAlign: "middle", lineHeight: 1.1, wrap: false })
          ]
        }
      ]
    },
    slider: {
      nodeType: NODE_TYPES.graphics,
      name: "New Slider",
      transform: { x: 160, y: 1480, width: 620, height: 92 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.slider, { min: 0, max: 100, value: 64, step: 1 }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#2b3040", radius: 20 })
      ],
      children: [
        {
          id: createId("slider_fill"),
          type: NODE_TYPES.graphics,
          name: "Value Fill",
          parentId: null,
          transform: { x: 0, y: 28, width: 396, height: 36 },
          layout: { anchors: { left: 0, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "sliderFill" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#33b8a5", radius: 18 })
          ]
        },
        {
          id: createId("slider_thumb"),
          type: NODE_TYPES.graphics,
          name: "Thumb",
          parentId: null,
          transform: { x: 348, y: 8, width: 76, height: 76 },
          layout: { anchors: { left: 348, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "sliderThumb" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#ffffff", radius: 38 })
          ]
        }
      ]
    },
    input: {
      nodeType: NODE_TYPES.graphics,
      name: "New Input",
      transform: { x: 160, y: 1620, width: 620, height: 112 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.input, { value: "", placeholder: "Player name", inputType: "text" }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#181c26", stroke: "#536078", strokeWidth: 2, radius: 18 }),
        createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "Player name", fontFamily: "Inter", fontSize: 36, fill: "#8f98aa", align: "left", verticalAlign: "middle", lineHeight: 1.1, wrap: false })
      ]
    },
    dropdown: {
      nodeType: NODE_TYPES.graphics,
      name: "New Dropdown",
      transform: { x: 160, y: 1760, width: 620, height: 112 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.dropdown, { value: "Option A", options: "Option A, Option B, Option C", cursor: "pointer" }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#181c26", stroke: "#536078", strokeWidth: 2, radius: 18 }),
        createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "Option A", fontFamily: "Inter", fontSize: 36, fill: "#ffffff", align: "left", verticalAlign: "middle", lineHeight: 1.1, wrap: false })
      ],
      children: [
        {
          id: createId("dropdown_arrow"),
          type: NODE_TYPES.graphics,
          name: "Arrow",
          parentId: null,
          transform: { x: 544, y: 30, width: 52, height: 52 },
          layout: { anchors: { right: 24, centerY: 0 } },
          props: {},
          editorMeta: { controlPart: "dropdownArrow" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "v", fontFamily: "Inter", fontSize: 34, fill: "#aab3c2", align: "center", verticalAlign: "middle", lineHeight: 1, wrap: false })
          ]
        }
      ]
    },
    progressBar: {
      nodeType: NODE_TYPES.graphics,
      name: "New Progress",
      transform: { x: 160, y: 1900, width: 620, height: 72 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.progressBar, { min: 0, max: 100, value: 64, trackFill: "#2b3040", fill: "#33b8a5", radius: 20 }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#2b3040", radius: 20 })
      ],
      children: [
        {
          id: createId("progress_fill"),
          type: NODE_TYPES.graphics,
          name: "Value Fill",
          parentId: null,
          transform: { x: 0, y: 0, width: 396, height: 72 },
          layout: { anchors: { left: 0, top: 0, bottom: 0 } },
          props: {},
          editorMeta: { controlPart: "progressFill" },
          components: [
            createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#33b8a5", radius: 20 })
          ]
        }
      ]
    },
    scrollPanel: {
      nodeType: NODE_TYPES.scrollView,
      name: "New Scroll Panel",
      transform: { x: 96, y: 620, width: 888, height: 640 },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.scroll, { direction: "vertical", scrollX: false, scrollY: true }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#202633", radius: 24 })
      ]
    },
    list: {
      nodeType: NODE_TYPES.list,
      name: "New List",
      transform: { x: 96, y: 620, width: 888, height: 520 },
      layout: { mode: "list", direction: "vertical", gap: 16, padding: { top: 20, right: 20, bottom: 20, left: 20 } },
      props: {},
      components: [
        createNodeComponent(NODE_COMPONENT_TYPES.layout, { mode: "list", direction: "vertical", gap: 16, padding: { top: 20, right: 20, bottom: 20, left: 20 } }),
        createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#202633", radius: 24 })
      ]
    }
  };

  const template = defaults[kind];
  if (!template) {
    return null;
  }

  const preparedTemplate = clone(template);
  normalizeTemplateIds(preparedTemplate, kind);
  const transform = worldPoint
    ? {
      ...preparedTemplate.transform,
      x: roundCanvasNumber(worldPoint.x),
      y: roundCanvasNumber(worldPoint.y)
    }
    : preparedTemplate.transform;

  return {
    ...preparedTemplate,
    transform
  };
}

function normalizeTemplateIds(node, fallbackIdPrefix) {
  node.id = node.id || createId(fallbackIdPrefix || node.nodeType || node.type || "node");
  for (const child of node.children || []) {
    child.parentId = node.id;
    normalizeTemplateIds(child, child.type || child.nodeType || "node");
  }
}

export function getCreationParentId(page) {
  const selected = getSelectedNode();
  const canContainChildren = selected && selected.parentId !== null && canLayerContainChildren(selected);

  return canContainChildren ? selected.id : page.root.id;
}

export function getLayerContextMenuParentId(node, page) {
  if (!node) {
    return page.root.id;
  }

  if (canLayerContainChildren(node)) {
    return node.id;
  }

  return node.parentId || page.root.id;
}

export function runCommand(command, renderOptions = {}) {
  const result = applyCommand(state.project, command);
  state.project = result.project;
  state.history.push({
    command,
    patch: result.patch,
    inversePatch: result.inversePatch
  });
  state.redoStack = [];
  normalizeEditorStateAfterProjectChange();
  render(renderOptions);
}

export function runCommandGroup(commands, label, renderOptions = {}) {
  const before = clone(state.project);
  let current = state.project;
  for (const command of commands) {
    current = applyCommand(current, command).project;
  }

  state.project = current;
  state.history.push({
    command: {
      type: "command.group",
      commands,
      meta: { source: "user", label }
    },
    patch: createSnapshotPatch(before, current, label),
    inversePatch: createSnapshotPatch(current, before, `Undo ${label}`)
  });
  state.redoStack = [];
  normalizeEditorStateAfterProjectChange();
  render(renderOptions);
}

export function undoLastCommand() {
  const entry = state.history.pop();
  if (!entry) {
    return false;
  }

  state.project = applySnapshotPatch(entry.inversePatch);
  state.redoStack.push(entry);
  normalizeEditorStateAfterProjectChange();
  render();
  return true;
}

export function redoLastCommand() {
  const entry = state.redoStack.pop();
  if (!entry) {
    return false;
  }

  state.project = applySnapshotPatch(entry.patch);
  state.history.push(entry);
  normalizeEditorStateAfterProjectChange();
  render();
  return true;
}

export function normalizeEditorStateAfterProjectChange() {
  if (state.editingComponentId && !getComponentById(state.editingComponentId)) {
    state.editingComponentId = null;
  }

  if (!state.project.pages.some((page) => page.id === state.pageId)) {
    state.pageId = getInitialPageId(state.project);
  }

  if (state.selectedPageId && !state.project.pages.some((page) => page.id === state.selectedPageId)) {
    state.selectedPageId = state.pageId;
  }

  if (state.selectedNodeId && !findNodeInProject(state.project, state.selectedNodeId)) {
    state.selectedNodeId = null;
  }

  if (state.selectedAssetId && !getAssetById(state.selectedAssetId)) {
    state.selectedAssetId = null;
  }

  if (state.renamingPageId && !state.project.pages.some((page) => page.id === state.renamingPageId)) {
    state.renamingPageId = null;
  }
  if (state.renamingComponentId && !getComponentById(state.renamingComponentId)) {
    state.renamingComponentId = null;
  }
  state.project.project.name = normalizeProjectName(state.project.project.name);
  state.collapsedLayerIds = new Set([...state.collapsedLayerIds]
    .filter((nodeId) => findNodeInProject(state.project, nodeId)));
  state.smartGuides = null;
}

export function getInitialPageId(project) {
  return project.pages?.[0]?.id || "page_main";
}

export function getProjectDisplayName() {
  return normalizeProjectName(state.project?.project?.name);
}

export function getProjectFileLabel() {
  return session.activeProjectFileName || createProjectBundleFilename();
}

export function getProjectHeaderText() {
  const projectName = getProjectDisplayName();
  const schemaVersion = state.project?.schemaVersion || "unknown";
  return `${projectName} · ${schemaVersion}`;
}

export function copySelectedNodeToClipboard() {
  const node = getSelectedNode();
  if (!canCopySelectedNode(node)) {
    return false;
  }

  state.nodeClipboard = {
    sourceNodeId: node.id,
    sourceParentId: node.parentId,
    node: clone(node)
  };
  return true;
}

export function pasteNodeFromClipboard(parentIdOverride = null, worldPoint = null) {
  if (!canPasteNodeFromClipboard()) {
    return false;
  }

  const page = getActivePage();
  const parentId = getPasteParentId(page, parentIdOverride);
  if (!parentId || !findNodeInProject(state.project, parentId)) {
    return false;
  }

  const node = prepareClipboardNodeForPaste(state.nodeClipboard.node, parentId, worldPoint);
  state.collapsedLayerIds.delete(parentId);
  selectEditorNode(node.id);
  runCommand({
    type: "node.create",
    args: {
      parentId,
      ...node
    },
    meta: { source: "user", label: `Paste ${node.name}` }
  });
  return true;
}

export function getPasteParentId(page, parentIdOverride = null) {
  if (parentIdOverride) {
    return parentIdOverride;
  }

  const selected = getSelectedNode();
  if (
    selected
    && selected.id !== state.nodeClipboard?.sourceNodeId
    && selected.parentId !== null
    && canLayerContainChildren(selected)
  ) {
    return selected.id;
  }

  if (state.nodeClipboard?.sourceParentId && findNodeInProject(state.project, state.nodeClipboard.sourceParentId)) {
    return state.nodeClipboard.sourceParentId;
  }

  return page.root.id;
}

export function prepareClipboardNodeForPaste(sourceNode, parentId, worldPoint = null) {
  const node = clone(sourceNode);
  remapPastedNodeIds(node, parentId);
  node.name = `${sourceNode.name || "Node"} Copy`;
  const transform = { ...(node.transform || {}) };
  if (worldPoint) {
    const localPoint = worldPointToLocalPoint(parentId, worldPoint);
    transform.x = roundCanvasNumber(localPoint.x);
    transform.y = roundCanvasNumber(localPoint.y);
  } else {
    transform.x = roundCanvasNumber(Number(transform.x || 0) + 24);
    transform.y = roundCanvasNumber(Number(transform.y || 0) + 24);
  }
  node.transform = transform;
  return node;
}

export function remapPastedNodeIds(node, parentId) {
  node.id = createId(node.type || NODE_TYPES.graphics);
  node.parentId = parentId;
  for (const child of node.children || []) {
    remapPastedNodeIds(child, node.id);
  }
}

export function canCopySelectedNode(node = getSelectedNode()) {
  return Boolean(node && node.parentId !== null);
}

export function canPasteNodeFromClipboard() {
  return Boolean(state.nodeClipboard?.node);
}

export function deleteSelectedNode() {
  const node = getSelectedNode();
  if (!canDeleteSelectedNode(node)) {
    return false;
  }

  const deletedLayerIds = getNodeSubtreeIds(node);
  deletedLayerIds.add(node.id);
  for (const nodeId of deletedLayerIds) {
    state.collapsedLayerIds.delete(nodeId);
  }

  selectEditorNode(null);
  state.smartGuides = null;
  runCommand({
    type: "node.delete",
    args: {
      nodeId: node.id
    },
    meta: { source: "user", label: `Delete ${node.name}` }
  });
  return true;
}

export function canDeleteSelectedNode(node = getSelectedNode()) {
  return Boolean(node && node.parentId !== null);
}

export function selectEditorNode(nodeId) {
  state.selectedPageId = null;
  state.selectedNodeId = nodeId || null;
}
