import { NODE_COMPONENT_TYPES, PIXIPROJECTUI_FILE_EXTENSION } from "./editorDeps.js";

export const PROJECT_STORAGE_KEY = "pixi-ui-editor.project.v1";
export const LAYOUT_STORAGE_KEY = "pixi-ui-editor.layout.v1";
export const LAYOUT_PROFILE_VERSION = 2;
export const PROJECT_FILE_EXTENSION = PIXIPROJECTUI_FILE_EXTENSION;
export const PROJECT_FILE_EXTENSIONS = Object.freeze([`.${PROJECT_FILE_EXTENSION}`]);
export const ASSET_DATABASE_NAME = "pixi-ui-editor.assets.v1";
export const ASSET_DATABASE_VERSION = 1;
export const ASSET_BLOB_STORE = "files";
export const ASSET_DB_URL_PREFIX = "assetdb://";
export const ASSET_RENDER_BATCH_SIZE = 240;
export const IMPORT_YIELD_INTERVAL = 150;
export const EDITABLE_NODE_COMPONENTS = Object.freeze([
  NODE_COMPONENT_TYPES.fill,
  NODE_COMPONENT_TYPES.texture,
  NODE_COMPONENT_TYPES.text,
  NODE_COMPONENT_TYPES.shadow,
  NODE_COMPONENT_TYPES.outline,
  NODE_COMPONENT_TYPES.button,
  NODE_COMPONENT_TYPES.slider,
  NODE_COMPONENT_TYPES.toggle,
  NODE_COMPONENT_TYPES.checkbox,
  NODE_COMPONENT_TYPES.radio,
  NODE_COMPONENT_TYPES.input,
  NODE_COMPONENT_TYPES.textInput,
  NODE_COMPONENT_TYPES.dropdown,
  NODE_COMPONENT_TYPES.progressBar,
  NODE_COMPONENT_TYPES.mask,
  NODE_COMPONENT_TYPES.repeater,
  NODE_COMPONENT_TYPES.layout,
  NODE_COMPONENT_TYPES.scroll,
  NODE_COMPONENT_TYPES.scrollView
]);
export const NODE_COMPONENT_LABELS = Object.freeze({
  [NODE_COMPONENT_TYPES.fill]: "Fill",
  [NODE_COMPONENT_TYPES.texture]: "Texture",
  [NODE_COMPONENT_TYPES.text]: "Text",
  [NODE_COMPONENT_TYPES.shadow]: "Shadow",
  [NODE_COMPONENT_TYPES.outline]: "Outline",
  [NODE_COMPONENT_TYPES.button]: "Button",
  [NODE_COMPONENT_TYPES.slider]: "Slider",
  [NODE_COMPONENT_TYPES.toggle]: "Toggle",
  [NODE_COMPONENT_TYPES.checkbox]: "Checkbox",
  [NODE_COMPONENT_TYPES.radio]: "Radio",
  [NODE_COMPONENT_TYPES.input]: "Input",
  [NODE_COMPONENT_TYPES.textInput]: "Text Input",
  [NODE_COMPONENT_TYPES.dropdown]: "Dropdown",
  [NODE_COMPONENT_TYPES.progressBar]: "Progress Bar",
  [NODE_COMPONENT_TYPES.mask]: "Mask",
  [NODE_COMPONENT_TYPES.repeater]: "Repeater",
  [NODE_COMPONENT_TYPES.layout]: "Layout",
  [NODE_COMPONENT_TYPES.scroll]: "Scroll",
  [NODE_COMPONENT_TYPES.scrollView]: "Scroll View"
});
export const PHASE4_CONTROL_TEMPLATES = Object.freeze([
  { id: "button", label: "Button", description: "Interactive text button" },
  { id: "toggle", label: "Toggle", description: "Binary on/off control" },
  { id: "checkbox", label: "Checkbox", description: "Checked state control" },
  { id: "radio", label: "Radio", description: "Single-choice state control" },
  { id: "slider", label: "Slider", description: "Range input control" },
  { id: "input", label: "Input", description: "Text entry field" },
  { id: "dropdown", label: "Dropdown", description: "Option picker control" },
  { id: "progressBar", label: "Progress", description: "Readonly progress indicator" },
  { id: "scrollPanel", label: "Scroll", description: "Scrollable content frame" },
  { id: "list", label: "List", description: "Stacked item container" }
]);
export const PANEL_DEFINITIONS = Object.freeze({
  layers: { title: "Layers", defaultZone: "left", defaultOrder: 0 },
  inspector: { title: "Inspector", defaultZone: "right", defaultOrder: 0 },
  validation: { title: "Validation", defaultZone: "right", defaultOrder: 1, defaultVisible: false },
  pages: { title: "Pages", defaultZone: "bottom", defaultOrder: 0, defaultSize: 320 },
  components: { title: "Instances", defaultZone: "bottom", defaultOrder: 1, defaultSize: 320 },
  assets: { title: "Assets", defaultZone: "bottom", defaultOrder: 2 }
});
export const DOCK_ZONE_NAMES = Object.freeze(["left", "right", "bottom"]);

export function createDefaultPanelLayout() {
  return Object.fromEntries(Object.entries(PANEL_DEFINITIONS).map(([panelId, definition]) => [panelId, {
    zone: definition.defaultZone,
    order: definition.defaultOrder,
    visible: definition.defaultVisible !== false,
    ...(Number.isFinite(Number(definition.defaultSize)) && Number(definition.defaultSize) > 0
      ? { size: Number(definition.defaultSize) }
      : {})
  }]));
}

export function createDefaultLayout(overrides = {}) {
  return {
    profileVersion: LAYOUT_PROFILE_VERSION,
    leftPanelWidth: 320,
    rightPanelWidth: 380,
    bottomPanelHeight: 360,
    validationPanelHeight: 156,
    assetFolderWidth: 220,
    assetTileSize: 88,
    assetGridEnabled: true,
    leftCollapsed: false,
    rightCollapsed: false,
    bottomCollapsed: false,
    panels: createDefaultPanelLayout(),
    ...overrides,
    panels: {
      ...createDefaultPanelLayout(),
      ...(overrides.panels || {})
    }
  };
}

export const DEFAULT_LAYOUT = Object.freeze(createDefaultLayout());

export const LAYOUT_PRESETS = Object.freeze({
  default: createDefaultLayout(),
  "wide-canvas": createDefaultLayout({
    leftPanelWidth: 220,
    rightPanelWidth: 280,
    bottomPanelHeight: 180
  }),
  "inspector-focus": createDefaultLayout({
    leftPanelWidth: 240,
    rightPanelWidth: 460,
    bottomPanelHeight: 180,
    validationPanelHeight: 120
  })
});

export const DEVICE_PROFILES = Object.freeze({
  "iphone-15-pro": {
    group: "Phones",
    name: "iPhone 15 Pro",
    width: 1170,
    height: 2532,
    orientation: "portrait",
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 }
  },
  "iphone-15-pro-landscape": {
    group: "Phones",
    name: "iPhone 15 Pro landscape",
    width: 2532,
    height: 1170,
    orientation: "landscape",
    safeArea: { top: 0, right: 59, bottom: 21, left: 59 }
  },
  "iphone-se": {
    group: "Phones",
    name: "iPhone SE",
    width: 750,
    height: 1334,
    orientation: "portrait",
    safeArea: { top: 20, right: 0, bottom: 0, left: 0 }
  },
  "pixel-8": {
    group: "Phones",
    name: "Pixel 8",
    width: 1080,
    height: 2400,
    orientation: "portrait",
    safeArea: { top: 48, right: 0, bottom: 24, left: 0 }
  },
  "pixel-8-landscape": {
    group: "Phones",
    name: "Pixel 8 landscape",
    width: 2400,
    height: 1080,
    orientation: "landscape",
    safeArea: { top: 0, right: 48, bottom: 24, left: 48 }
  },
  "galaxy-s24": {
    group: "Phones",
    name: "Galaxy S24",
    width: 1080,
    height: 2340,
    orientation: "portrait",
    safeArea: { top: 42, right: 0, bottom: 24, left: 0 }
  },
  "ipad-pro-11": {
    group: "Tablets",
    name: "iPad Pro 11",
    width: 1668,
    height: 2388,
    orientation: "portrait",
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 }
  },
  "ipad-pro-11-landscape": {
    group: "Tablets",
    name: "iPad Pro 11 landscape",
    width: 2388,
    height: 1668,
    orientation: "landscape",
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 }
  },
  "switch-handheld": {
    group: "Game",
    name: "Switch handheld",
    width: 1280,
    height: 720,
    orientation: "landscape",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  "steam-deck": {
    group: "Game",
    name: "Steam Deck",
    width: 1280,
    height: 800,
    orientation: "landscape",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  "desktop-720p": {
    group: "Desktop",
    name: "Desktop 720p",
    width: 1280,
    height: 720,
    orientation: "landscape",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  "desktop-1080p": {
    group: "Desktop",
    name: "Desktop 1080p",
    width: 1920,
    height: 1080,
    orientation: "landscape",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  "desktop-1440p": {
    group: "Desktop",
    name: "Desktop 1440p",
    width: 2560,
    height: 1440,
    orientation: "landscape",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  }
});

export const ANCHOR_PRESETS = Object.freeze({
  none: {
    label: "Free",
    keys: []
  },
  "top-left": {
    label: "Top Left",
    keys: ["left", "top"]
  },
  "top-center": {
    label: "Top Center",
    keys: ["centerX", "top"]
  },
  "top-right": {
    label: "Top Right",
    keys: ["right", "top"]
  },
  "middle-left": {
    label: "Middle Left",
    keys: ["left", "centerY"]
  },
  center: {
    label: "Center",
    keys: ["centerX", "centerY"]
  },
  "middle-right": {
    label: "Middle Right",
    keys: ["right", "centerY"]
  },
  "bottom-left": {
    label: "Bottom Left",
    keys: ["left", "bottom"]
  },
  "bottom-center": {
    label: "Bottom Center",
    keys: ["centerX", "bottom"]
  },
  "bottom-right": {
    label: "Bottom Right",
    keys: ["right", "bottom"]
  },
  "stretch-top": {
    label: "Stretch Top",
    keys: ["left", "right", "top"]
  },
  "stretch-middle": {
    label: "Stretch Middle",
    keys: ["left", "right", "centerY"]
  },
  "stretch-bottom": {
    label: "Stretch Bottom",
    keys: ["left", "right", "bottom"]
  },
  "stretch-left": {
    label: "Stretch Left",
    keys: ["left", "top", "bottom"]
  },
  "stretch-center": {
    label: "Stretch Center",
    keys: ["centerX", "top", "bottom"]
  },
  "stretch-right": {
    label: "Stretch Right",
    keys: ["right", "top", "bottom"]
  },
  stretch: {
    label: "Stretch Full",
    keys: ["left", "right", "top", "bottom"]
  }
});

export const ANCHOR_PRESET_OPTIONS = Object.entries(ANCHOR_PRESETS).map(([value, preset]) => [value, preset.label]);
export const ANCHOR_PICKER_MATRIX = Object.freeze([
  ["top-left", "top-center", "top-right", "stretch-top"],
  ["middle-left", "center", "middle-right", "stretch-middle"],
  ["bottom-left", "bottom-center", "bottom-right", "stretch-bottom"],
  ["stretch-left", "stretch-center", "stretch-right", "stretch"]
]);
export const ANCHOR_OFFSET_LABELS = Object.freeze({
  left: "Left",
  centerX: "Center X",
  right: "Right",
  top: "Top",
  centerY: "Center Y",
  bottom: "Bottom"
});
export const HORIZONTAL_ANCHOR_KEYS = ["left", "centerX", "right"];
export const VERTICAL_ANCHOR_KEYS = ["top", "centerY", "bottom"];

export const SELECTION_HANDLE_SIZE = 10;
export const ANCHOR_HANDLE_SIZE = 11;
export const ANCHOR_HANDLE_OFFSET = 18;
export const SMART_GUIDE_PIXEL_THRESHOLD = 8;
export const DISTANCE_GUIDE_MAX = 420;
export const DEFAULT_CANVAS_VIEW = Object.freeze({
  zoom: 1,
  panX: 0,
  panY: 0
});
export const MIN_CANVAS_ZOOM = 0.2;
export const MAX_CANVAS_ZOOM = 6;
export const MIN_ASSET_TILE_SIZE = 32;
export const MAX_ASSET_TILE_SIZE = 160;
export const CANVAS_VIEW_PADDING = 44;
export const CANVAS_FILL_PADDING = 8;
