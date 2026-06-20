import { createId, normalizeIdPrefix } from "./ids.js";
import { clone } from "./object.js";

export const PROJECT_SCHEMA_VERSION = "1.0.0-alpha.1";

export const NODE_TYPES = Object.freeze({
  container: "container",
  graphics: "graphics",
  componentInstance: "componentInstance",
  scrollView: "scrollView",
  list: "list",
  grid: "grid",
  mask: "mask"
});

export const NODE_TYPE_LIST = Object.freeze(Object.values(NODE_TYPES));

export const NODE_COMPONENT_TYPES = Object.freeze({
  fill: "fill",
  texture: "texture",
  text: "text",
  shadow: "shadow",
  outline: "outline",
  button: "button",
  slider: "slider",
  toggle: "toggle",
  checkbox: "checkbox",
  radio: "radio",
  input: "input",
  textInput: "textInput",
  dropdown: "dropdown",
  progressBar: "progressBar",
  mask: "mask",
  repeater: "repeater",
  layout: "layout",
  scroll: "scroll",
  scrollView: "scrollView"
});

export const NODE_COMPONENT_TYPE_LIST = Object.freeze(Object.values(NODE_COMPONENT_TYPES));

export const ASSET_TYPES = Object.freeze({
  texture: "texture",
  spriteAtlas: "spriteAtlas",
  font: "font",
  data: "data"
});

export const ASSET_TYPE_LIST = Object.freeze(Object.values(ASSET_TYPES));

export function createProject(options = {}) {
  const id = options.id || createId("project");
  const now = options.createdAt || new Date().toISOString();

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: {
      id,
      name: options.name || "Untitled Pixi UI",
      createdAt: now,
      updatedAt: now,
      targetRuntime: "pixi.js",
      editorVersion: "0.1.0"
    },
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      radii: {},
      animation: {}
    },
    themes: [],
    styleLibraries: [],
    assets: [],
    components: [],
    pages: [],
    locales: [],
    exportProfiles: [
      {
        id: "development",
        name: "Development",
        optimizeAssets: false,
        includeEditorMetadata: true
      },
      {
        id: "production",
        name: "Production",
        optimizeAssets: true,
        includeEditorMetadata: false
      }
    ]
  };
}

export function createPage(options = {}) {
  const id = options.id || createId("page");
  const name = options.name || "New Page";
  const root = options.root || createNode({
    id: `${id}_root`,
    type: NODE_TYPES.container,
    name: `${name} Root`,
    transform: {
      x: 0,
      y: 0,
      width: options.width || 1080,
      height: options.height || 1920
    },
    layout: {
      mode: "absolute",
      safeArea: true
    }
  });

  root.parentId = null;

  return {
    id,
    name,
    canvas: {
      width: options.width || 1080,
      height: options.height || 1920,
      orientation: options.orientation || "portrait",
      background: options.background ?? "transparent",
      safeArea: options.safeArea || {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    variables: options.variables || {},
    root,
    interactions: options.interactions || [],
    animations: options.animations || [],
    editorMeta: options.editorMeta || {}
  };
}

export function createNode(options = {}) {
  const type = options.type || options.nodeType || NODE_TYPES.container;
  const prefix = normalizeIdPrefix(type);
  const hasComponents = Array.isArray(options.components) && options.components.length > 0;
  const props = options.props !== undefined ? options.props : hasComponents ? {} : defaultPropsForType(type);
  const transform = {
    x: 0,
    y: 0,
    width: 240,
    height: 96,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    pivotX: 0,
    pivotY: 0,
    ...(options.transform || {})
  };

  return {
    id: options.id || createId(prefix),
    name: options.name || humanizeNodeType(type),
    type,
    active: options.active ?? options.enabled ?? true,
    parentId: options.parentId ?? null,
    children: clone(options.children || []),
    transform,
    layout: {
      mode: "absolute",
      anchors: null,
      constraints: null,
      ...(options.layout || {})
    },
    style: {
      visible: true,
      alpha: 1,
      tint: "#ffffff",
      blendMode: "normal",
      ...(options.style || {})
    },
    props: clone(props),
    components: clone(options.components || []),
    states: clone(options.states || {}),
    interactions: clone(options.interactions || []),
    bindings: clone(options.bindings || {}),
    editorMeta: clone(options.editorMeta || {})
  };
}

export function createAsset(options = {}) {
  const type = options.type || ASSET_TYPES.texture;
  const id = options.id || createId(normalizeIdPrefix(options.name || type || "asset"));

  return {
    id,
    name: options.name || humanizeNodeType(id),
    type,
    src: options.src || options.url || options.href || null,
    width: options.width,
    height: options.height,
    mime: options.mime || options.mimeType,
    tags: clone(options.tags || []),
    density: options.density,
    license: options.license,
    family: options.family,
    format: options.format,
    nineSlice: clone(options.nineSlice),
    imageAssetId: options.imageAssetId,
    frames: clone(options.frames || {}),
    meta: clone(options.meta || options.metadata || {})
  };
}

export function defaultPropsForType(type) {
  if (type === NODE_TYPES.componentInstance) {
    return {
      componentId: null,
      variant: null,
      overrides: {}
    };
  }

  return {};
}

export function humanizeNodeType(type) {
  return String(type || "node")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
