import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createPixiUiProjectBundle } from "../packages/exporter/src/index.js";

const CREATED_AT = "2026-05-21T00:00:00.000Z";
const PROJECT_ID = "project_all_elements_gallery";

export function createAllElementsProjectDocument() {
  return {
    schemaVersion: "1.0.0-alpha.1",
    project: {
      id: PROJECT_ID,
      name: "All Elements Gallery",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      targetRuntime: "pixi.js",
      editorVersion: "0.1.0"
    },
    tokens: createTokens(),
    themes: createThemes(),
    styleLibraries: createStyleLibraries(),
    assets: createAssets(),
    components: createComponents(),
    pages: [
      createControlsPage(),
      createWindowsPage(),
      createLayoutsPage(),
      createAssetsAndInstancesPage()
    ],
    locales: [
      {
        id: "en",
        entries: {
          "gallery.title": "All Elements Gallery",
          "hud.coins": "Coins: {{coins}}",
          "hud.gems": "Gems: {{gems}}",
          "dialog.body": "Every control, window, asset type and layout primitive in one sample project."
        }
      },
      {
        id: "ru",
        entries: {
          "gallery.title": "Galeria elementov",
          "hud.coins": "Monety: {{coins}}",
          "hud.gems": "KamnI: {{gems}}",
          "dialog.body": "Testovyi proekt so vsemi kontrolami, oknami, assetami i layout-primetivami."
        }
      }
    ],
    exportProfiles: [
      {
        id: "development",
        name: "Development Preview",
        target: "pixi",
        optimizeAssets: false,
        includeEditorMetadata: true
      },
      {
        id: "production",
        name: "Production Runtime",
        target: "pixi",
        optimizeAssets: true,
        includeEditorMetadata: false
      }
    ]
  };
}

export function createAllElementsProjectBundle() {
  return createPixiUiProjectBundle(createAllElementsProjectDocument(), {
    savedAt: CREATED_AT,
    editorVersion: "0.1.0",
    layout: createExampleLayout(),
    assetFiles: []
  });
}

function createTokens() {
  return {
    colors: {
      canvas: "#111624",
      panel: "#1b2233",
      panelRaised: "#252d40",
      panelSoft: "#30384d",
      primary: "#37b7a7",
      primaryDark: "#16897e",
      accent: "#f2c14e",
      danger: "#ef5d6c",
      info: "#62b5ff",
      text: "#f4f7fb",
      textMuted: "#9aa7bd",
      stroke: "#56627a"
    },
    spacing: {
      xs: 6,
      sm: 12,
      md: 20,
      lg: 32,
      xl: 48
    },
    typography: {
      family: "Inter",
      title: 44,
      subtitle: 28,
      body: 22,
      caption: 16
    },
    radii: {
      sm: 8,
      md: 16,
      lg: 26,
      pill: 999
    },
    animation: {
      fast: 0.12,
      normal: 0.24
    }
  };
}

function createThemes() {
  return [
    {
      id: "default",
      name: "Default",
      tokens: {
        colors: {
          canvas: "#111624",
          panel: "#1b2233",
          primary: "#37b7a7",
          accent: "#f2c14e"
        }
      }
    },
    {
      id: "bright",
      name: "Bright QA",
      tokens: {
        colors: {
          canvas: "#f3f6fb",
          panel: "#ffffff",
          panelRaised: "#dce4ef",
          primary: "#1b8cff",
          accent: "#f27c4e",
          text: "#172033",
          textMuted: "#5d6b82"
        }
      }
    }
  ];
}

function createStyleLibraries() {
  return [
    {
      id: "library_game_ui_basics",
      name: "Game UI Basics",
      version: "1.0.0",
      tokens: {
        colors: {
          rarityCommon: "#8fa0b8",
          rarityRare: "#52a8ff",
          rarityEpic: "#a970ff",
          rarityLegendary: "#f4b145"
        },
        radii: {
          card: 18,
          chip: 999
        }
      },
      themes: [],
      components: []
    }
  ];
}

function createAssets() {
  const panelSvg = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="192" height="96" viewBox="0 0 192 96">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#39c4b6"/>
          <stop offset="1" stop-color="#315fb7"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="188" height="92" rx="20" fill="url(#g)" stroke="#f2c14e" stroke-width="4"/>
      <rect x="20" y="18" width="152" height="12" rx="6" fill="#ffffff" opacity=".22"/>
      <circle cx="38" cy="58" r="16" fill="#f2c14e"/>
      <circle cx="78" cy="58" r="16" fill="#ffffff" opacity=".42"/>
      <circle cx="118" cy="58" r="16" fill="#ffffff" opacity=".24"/>
    </svg>
  `);
  const avatarSvg = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="30" fill="#20283a"/>
      <circle cx="64" cy="48" r="24" fill="#f2c14e"/>
      <path d="M24 112c4-25 21-40 40-40s36 15 40 40" fill="#37b7a7"/>
      <path d="M26 26h76v76H26z" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="6"/>
    </svg>
  `);
  const patternSvg = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" fill="#172033"/>
      <path d="M0 32h64M32 0v64" stroke="#37b7a7" stroke-width="4" opacity=".45"/>
      <path d="M0 0l64 64M64 0L0 64" stroke="#f2c14e" stroke-width="3" opacity=".28"/>
      <circle cx="32" cy="32" r="10" fill="#ffffff" opacity=".16"/>
    </svg>
  `);
  const atlasSvg = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="128" viewBox="0 0 256 128">
      <rect width="256" height="128" fill="#111624"/>
      <g transform="translate(0 0)">
        <circle cx="32" cy="32" r="24" fill="#f2c14e"/><text x="32" y="43" text-anchor="middle" font-size="28" font-family="Arial" fill="#5b3a00">$</text>
      </g>
      <g transform="translate(64 0)">
        <path d="M32 8l24 24-24 24L8 32z" fill="#62b5ff"/><path d="M32 8l10 24-10 24L22 32z" fill="#d6edff" opacity=".7"/>
      </g>
      <g transform="translate(128 0)">
        <path d="M32 6l8 18 20 2-15 13 5 19-18-10-18 10 5-19L4 26l20-2z" fill="#f4b145"/>
      </g>
      <g transform="translate(192 0)">
        <rect x="8" y="8" width="48" height="48" rx="14" fill="#ef5d6c"/><path d="M20 20l24 24M44 20L20 44" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
      </g>
      <g transform="translate(0 64)">
        <rect x="5" y="10" width="54" height="44" rx="10" fill="#252d40" stroke="#37b7a7" stroke-width="4"/><path d="M18 34l10 10 20-24" fill="none" stroke="#37b7a7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="translate(64 64)">
        <rect x="4" y="8" width="56" height="48" rx="12" fill="#252d40" stroke="#f2c14e" stroke-width="4"/><circle cx="22" cy="32" r="5" fill="#f2c14e"/><circle cx="42" cy="32" r="5" fill="#f2c14e"/>
      </g>
      <g transform="translate(128 64)">
        <rect x="6" y="8" width="52" height="48" rx="18" fill="#37b7a7"/><rect x="18" y="22" width="28" height="20" rx="6" fill="#111624"/>
      </g>
      <g transform="translate(192 64)">
        <rect x="6" y="6" width="52" height="52" rx="12" fill="#315fb7"/><path d="M20 20h24v24H20z" fill="#ffffff" opacity=".35"/>
      </g>
    </svg>
  `);

  return [
    {
      id: "asset_panel_texture",
      name: "Gradient Panel Texture",
      type: "texture",
      src: panelSvg,
      width: 192,
      height: 96,
      mime: "image/svg+xml",
      nineSlice: { left: 24, right: 24, top: 24, bottom: 24 },
      tags: ["ui", "panel"],
      meta: { folder: "textures/panels", fileName: "gradient-panel.svg" }
    },
    {
      id: "asset_avatar_texture",
      name: "Avatar Texture",
      type: "texture",
      src: avatarSvg,
      width: 128,
      height: 128,
      mime: "image/svg+xml",
      tags: ["ui", "portrait"],
      meta: { folder: "textures/icons", fileName: "avatar.svg" }
    },
    {
      id: "asset_pattern_texture",
      name: "Tiled Pattern Texture",
      type: "texture",
      src: patternSvg,
      width: 64,
      height: 64,
      mime: "image/svg+xml",
      tags: ["ui", "pattern"],
      meta: { folder: "textures/patterns", fileName: "tile-pattern.svg" }
    },
    {
      id: "asset_icon_atlas",
      name: "Control Icon Atlas",
      type: "spriteAtlas",
      src: atlasSvg,
      width: 256,
      height: 128,
      mime: "image/svg+xml",
      tags: ["ui", "atlas"],
      frames: {
        "coin": { x: 0, y: 0, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 },
        "gem": { x: 64, y: 0, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 },
        "star": { x: 128, y: 0, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 },
        "close": { x: 192, y: 0, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 },
        "check": { x: 0, y: 64, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64, nineSlice: { left: 12, right: 12, top: 12, bottom: 12 } },
        "chat": { x: 64, y: 64, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 },
        "lock": { x: 128, y: 64, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 },
        "slot": { x: 192, y: 64, width: 64, height: 64, sourceWidth: 64, sourceHeight: 64 }
      },
      meta: { folder: "atlases", fileName: "control-icons.svg" }
    },
    {
      id: "asset_inter_font",
      name: "Inter Placeholder Font",
      type: "font",
      src: "data:font/woff2;base64,d09GMg==",
      family: "Inter",
      format: "woff2",
      mime: "font/woff2",
      tags: ["fonts"],
      meta: { folder: "fonts", fileName: "Inter-placeholder.woff2" }
    },
    {
      id: "asset_window_data",
      name: "Window Catalog Data",
      type: "data",
      src: `data:application/json,${encodeURIComponent(JSON.stringify({
        windows: ["shop", "settings", "inventory", "confirm"],
        controls: ["button", "toggle", "checkbox", "radio", "slider", "input", "dropdown"]
      }))}`,
      mime: "application/json",
      tags: ["data"],
      meta: { folder: "data", fileName: "window-catalog.json" }
    }
  ];
}

function createComponents() {
  return [
    createButtonComponent(),
    createResourceBadgeComponent(),
    createWindowChromeComponent(),
    createInventoryItemComponent()
  ];
}

function createButtonComponent() {
  const root = node({
    id: "component_button_root",
    name: "Button Root",
    type: "container",
    transform: frame(0, 0, 260, 72),
    children: [
      node({
        id: "component_button_surface",
        name: "Surface",
        type: "graphics",
        transform: frame(0, 0, 260, 72),
        components: [
          comp("fill", { shape: "roundedRect", fill: "{colors.primary}", stroke: "#65ddd2", strokeWidth: 2, radius: 18 }),
          comp("shadow", { color: "#000000", alpha: 0.26, blur: 14, offsetX: 0, offsetY: 6 }),
          comp("button", { interactive: true, eventMode: "static", cursor: "pointer" })
        ]
      }),
      textNode("component_button_label", "Label", "BUTTON", 0, 0, 260, 72, {
        fontSize: 24,
        fill: "{colors.text}",
        align: "center",
        verticalAlign: "middle",
        wrap: false
      })
    ]
  });

  return {
    id: "component_button",
    name: "Gallery Button",
    description: "Reusable button with primary, danger and disabled variants.",
    version: "1.0.0",
    rootNode: root,
    variants: [
      {
        id: "primary",
        name: "Primary",
        overrides: {
          component_button_surface: {
            components: [
              comp("fill", { shape: "roundedRect", fill: "{colors.primary}", stroke: "#65ddd2", strokeWidth: 2, radius: 18 }),
              comp("shadow", { color: "#000000", alpha: 0.26, blur: 14, offsetX: 0, offsetY: 6 }),
              comp("button", { interactive: true, eventMode: "static", cursor: "pointer" })
            ]
          }
        }
      },
      {
        id: "danger",
        name: "Danger",
        overrides: {
          component_button_surface: {
            components: [
              comp("fill", { shape: "roundedRect", fill: "{colors.danger}", stroke: "#ff9aa5", strokeWidth: 2, radius: 18 }),
              comp("shadow", { color: "#000000", alpha: 0.28, blur: 14, offsetX: 0, offsetY: 6 }),
              comp("button", { interactive: true, eventMode: "static", cursor: "pointer" })
            ]
          }
        }
      },
      {
        id: "disabled",
        name: "Disabled",
        overrides: {
          component_button_surface: {
            style: { alpha: 0.55 },
            components: [
              comp("fill", { shape: "roundedRect", fill: "#445065", stroke: "#6a7488", strokeWidth: 2, radius: 18 }),
              comp("button", { interactive: false, eventMode: "none", cursor: "default" })
            ]
          }
        }
      }
    ],
    exposedProps: {
      label: "component_button_label.components.text.props.text",
      fill: "component_button_surface.components.fill.props.fill"
    },
    editorMeta: { category: "Controls" }
  };
}

function createResourceBadgeComponent() {
  const root = node({
    id: "component_resource_badge_root",
    name: "Resource Badge Root",
    type: "container",
    transform: frame(0, 0, 250, 72),
    children: [
      node({
        id: "component_resource_badge_surface",
        name: "Surface",
        type: "graphics",
        transform: frame(0, 0, 250, 72),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#182033", stroke: "#56627a", strokeWidth: 2, radius: 20 })
        ]
      }),
      node({
        id: "component_resource_badge_icon",
        name: "Icon",
        type: "graphics",
        transform: frame(14, 10, 52, 52),
        components: [
          comp("texture", { assetId: "asset_icon_atlas", frame: "coin", objectFit: "contain", tint: "#ffffff" })
        ]
      }),
      textNode("component_resource_badge_label", "Value", "12 450", 76, 10, 150, 52, {
        fontSize: 28,
        fill: "{colors.accent}",
        align: "left",
        verticalAlign: "middle",
        wrap: false
      })
    ]
  });

  return {
    id: "component_resource_badge",
    name: "Resource Badge",
    description: "Reusable resource pill with atlas icon and text.",
    version: "1.0.0",
    rootNode: root,
    variants: [
      {
        id: "coins",
        name: "Coins",
        overrides: {
          component_resource_badge_icon: { components: [comp("texture", { assetId: "asset_icon_atlas", frame: "coin", objectFit: "contain" })] }
        }
      },
      {
        id: "gems",
        name: "Gems",
        overrides: {
          component_resource_badge_icon: { components: [comp("texture", { assetId: "asset_icon_atlas", frame: "gem", objectFit: "contain" })] },
          component_resource_badge_label: { components: [comp("text", { text: "860", fontFamily: "Inter", fontSize: 28, fill: "#62b5ff", align: "left", verticalAlign: "middle", wrap: false })] }
        }
      }
    ],
    exposedProps: {
      value: "component_resource_badge_label.components.text.props.text",
      frame: "component_resource_badge_icon.components.texture.props.frame"
    },
    editorMeta: { category: "HUD" }
  };
}

function createWindowChromeComponent() {
  const root = node({
    id: "component_window_root",
    name: "Window Root",
    type: "container",
    transform: frame(0, 0, 580, 420),
    children: [
      node({
        id: "component_window_backdrop",
        name: "Backdrop",
        type: "graphics",
        transform: frame(0, 0, 580, 420),
        components: [
          comp("texture", {
            assetId: "asset_panel_texture",
            textureType: "sliced",
            nineSlice: { left: 24, right: 24, top: 24, bottom: 24 },
            tint: "#ffffff"
          }),
          comp("shadow", { color: "#000000", alpha: 0.34, blur: 24, offsetX: 0, offsetY: 12 })
        ]
      }),
      textNode("component_window_title", "Title", "Window", 32, 22, 410, 56, {
        fontSize: 32,
        fill: "#ffffff",
        align: "left",
        verticalAlign: "middle",
        wrap: false
      }),
      node({
        id: "component_window_close",
        name: "Close",
        type: "graphics",
        transform: frame(498, 22, 48, 48),
        components: [
          comp("texture", { assetId: "asset_icon_atlas", frame: "close", objectFit: "contain" }),
          comp("button", { interactive: true, eventMode: "static", cursor: "pointer" })
        ]
      })
    ]
  });

  return {
    id: "component_window",
    name: "Window Chrome",
    description: "Reusable modal/window surface with a title and close button.",
    version: "1.0.0",
    rootNode: root,
    variants: [
      {
        id: "compact",
        name: "Compact",
        overrides: {
          component_window_root: { transform: frame(0, 0, 460, 320) },
          component_window_backdrop: { transform: frame(0, 0, 460, 320) },
          component_window_close: { transform: frame(390, 20, 46, 46) }
        }
      }
    ],
    exposedProps: {
      title: "component_window_title.components.text.props.text"
    },
    editorMeta: { category: "Windows" }
  };
}

function createInventoryItemComponent() {
  const root = node({
    id: "component_inventory_item_root",
    name: "Inventory Item Root",
    type: "container",
    transform: frame(0, 0, 150, 180),
    children: [
      node({
        id: "component_inventory_item_slot",
        name: "Slot",
        type: "graphics",
        transform: frame(0, 0, 150, 150),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "{colors.stroke}", strokeWidth: 2, radius: 18 }),
          comp("outline", { color: "{colors.rarityRare}", alpha: 0.8, width: 3 })
        ]
      }),
      node({
        id: "component_inventory_item_icon",
        name: "Icon",
        type: "graphics",
        transform: frame(34, 30, 82, 82),
        components: [
          comp("texture", { assetId: "asset_icon_atlas", frame: "star", objectFit: "contain" })
        ]
      }),
      textNode("component_inventory_item_label", "Label", "Item", 0, 150, 150, 30, {
        fontSize: 18,
        fill: "#cfd7e6",
        align: "center",
        verticalAlign: "middle",
        wrap: false
      })
    ]
  });

  return {
    id: "component_inventory_item",
    name: "Inventory Item",
    description: "Reusable inventory cell with icon and rarity outline.",
    version: "1.0.0",
    rootNode: root,
    variants: [
      {
        id: "rare",
        name: "Rare",
        overrides: {
          component_inventory_item_slot: { components: [comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#52a8ff", strokeWidth: 2, radius: 18 }), comp("outline", { color: "#52a8ff", alpha: 0.9, width: 3 })] }
        }
      },
      {
        id: "legendary",
        name: "Legendary",
        overrides: {
          component_inventory_item_slot: { components: [comp("fill", { shape: "roundedRect", fill: "#30251a", stroke: "#f4b145", strokeWidth: 2, radius: 18 }), comp("outline", { color: "#f4b145", alpha: 1, width: 4 })] },
          component_inventory_item_icon: { components: [comp("texture", { assetId: "asset_icon_atlas", frame: "gem", objectFit: "contain" })] }
        }
      }
    ],
    exposedProps: {
      label: "component_inventory_item_label.components.text.props.text",
      frame: "component_inventory_item_icon.components.texture.props.frame"
    },
    editorMeta: { category: "Inventory" }
  };
}

function createControlsPage() {
  const width = 1600;
  const height = 1200;
  const children = [
    pageHeader("controls_header", "All Elements Gallery", "Every supported node/component type is represented on this page.", width),
    section("controls_node_types", "Node Types", 40, 150, 720, 340, [
      nodeTypeTile("controls_type_container", "container", 24, 72, "container"),
      nodeTypeTile("controls_type_graphics", "graphics", 244, 72, "graphics"),
      nodeTypeTile("controls_type_mask", "mask", 464, 72, "mask"),
      nodeTypeTile("controls_type_scrollview", "scrollView", 24, 204, "scrollView"),
      nodeTypeTile("controls_type_list", "list", 244, 204, "list"),
      nodeTypeTile("controls_type_grid", "grid", 464, 204, "grid")
    ]),
    section("controls_visual_components", "Visual Components", 800, 150, 760, 340, [
      visualTile("controls_fill_demo", "Fill", 24, 74, "#37b7a7"),
      visualTile("controls_shadow_demo", "Shadow", 200, 74, "#252d40", [comp("shadow", { color: "#000000", alpha: 0.42, blur: 20, offsetX: 0, offsetY: 10 })]),
      visualTile("controls_outline_demo", "Outline", 376, 74, "#252d40", [comp("outline", { color: "#f2c14e", alpha: 1, width: 4 })]),
      textureDemo("controls_texture_simple", "Texture", 552, 74, "asset_avatar_texture"),
      textureDemo("controls_texture_sliced", "9 Slice", 24, 204, "asset_panel_texture", { textureType: "sliced", nineSlice: { left: 24, right: 24, top: 24, bottom: 24 } }),
      textureDemo("controls_texture_tiled", "Tiled", 200, 204, "asset_pattern_texture", { textureType: "tiled" }),
      progressBar("controls_progress_visual", "Progress Bar", 376, 214, 300, 54, 72)
    ]),
    section("controls_interactive", "Interactive Controls", 40, 530, 720, 610, [
      buttonNode("controls_button", "Button", 24, 76, 260, 70, "PLAY", "#37b7a7"),
      toggleNode("controls_toggle", "Toggle", 340, 76, true),
      checkboxNode("controls_checkbox", "Checkbox", 24, 176, true),
      radioNode("controls_radio", "Radio", 340, 176, true),
      sliderNode("controls_slider", "Slider", 24, 286, 620, 76, 64),
      inputNode("controls_input", "Input", 24, 394, 290, 78, "Player name", "Nova"),
      inputNode("controls_text_input", "Text Input", 344, 394, 290, 78, "Email", "qa@example.dev", "textInput"),
      dropdownNode("controls_dropdown", "Dropdown", 24, 502, 620, 78, "Option B")
    ]),
    section("controls_data_layout", "Data, Layout and Instances", 800, 530, 760, 610, [
      layoutStrip("controls_layout_strip", 24, 78),
      repeaterDemo("controls_repeater", 24, 210),
      scrollPanel("controls_scroll_panel", 396, 78, 300, 240),
      maskDemo("controls_mask_demo", 396, 350),
      instanceNode("controls_instance_primary", "component_button", 24, 420, 260, 72, { label: "INSTANCE", variant: "primary" }),
      instanceNode("controls_instance_badge", "component_resource_badge", 320, 420, 250, 72, { value: "12 450", frame: "coin", variant: "coins" }),
      instanceNode("controls_instance_item", "component_inventory_item", 596, 378, 150, 180, { label: "Card", variant: "legendary" })
    ])
  ];

  return page("page_all_controls", "All Elements", width, height, "#111624", { coins: 12450, gems: 860 }, children);
}

function createWindowsPage() {
  const width = 1920;
  const height = 1080;
  const children = [
    node({
      id: "windows_background",
      name: "Game Backdrop",
      type: "graphics",
      transform: frame(0, 0, width, height),
      components: [
        comp("fill", { shape: "rect", fill: "#101522" })
      ]
    }),
    node({
      id: "windows_hud_bar",
      name: "Top HUD Bar",
      type: "graphics",
      transform: frame(36, 28, 1848, 96),
      components: [
        comp("fill", { shape: "roundedRect", fill: "rgba(27, 34, 51, 0.96)", stroke: "#3e4a62", strokeWidth: 2, radius: 26 }),
        comp("shadow", { color: "#000000", alpha: 0.24, blur: 16, offsetX: 0, offsetY: 8 })
      ],
      children: [
        textNode("windows_hud_title", "HUD Title", "Window Sampler", 34, 18, 390, 60, { fontSize: 32, fill: "#ffffff", verticalAlign: "middle", wrap: false }),
        instanceNode("windows_hud_coins", "component_resource_badge", 1170, 12, 250, 72, { value: "12 450", frame: "coin", variant: "coins" }),
        instanceNode("windows_hud_gems", "component_resource_badge", 1446, 12, 250, 72, { value: "860", frame: "gem", variant: "gems" })
      ]
    }),
    node({
      id: "windows_shop_window",
      name: "Shop Window",
      type: "container",
      transform: frame(70, 170, 580, 760),
      children: [
        instanceNode("windows_shop_chrome", "component_window", 0, 0, 580, 760, { title: "Shop" }),
        textNode("windows_shop_caption", "Caption", "Featured offers", 36, 96, 320, 40, { fontSize: 24, fill: "#dce6f5", wrap: false }),
        ...[0, 1, 2].map((index) => shopCard(`windows_shop_card_${index}`, 36, 154 + index * 174, index)),
        instanceNode("windows_shop_buy", "component_button", 160, 672, 260, 72, { label: "BUY", variant: "primary" })
      ]
    }),
    node({
      id: "windows_settings_window",
      name: "Settings Window",
      type: "container",
      transform: frame(710, 170, 500, 500),
      children: [
        instanceNode("windows_settings_chrome", "component_window", 0, 0, 500, 500, { title: "Settings", variant: "compact" }),
        sliderNode("windows_volume_slider", "Music", 48, 112, 390, 70, 78),
        sliderNode("windows_sfx_slider", "SFX", 48, 210, 390, 70, 42),
        toggleNode("windows_notifications_toggle", "Notifications", 48, 318, true),
        checkboxNode("windows_reduce_motion", "Reduce motion", 48, 400, false)
      ]
    }),
    node({
      id: "windows_inventory_window",
      name: "Inventory Window",
      type: "container",
      transform: frame(1260, 170, 560, 760),
      children: [
        instanceNode("windows_inventory_chrome", "component_window", 0, 0, 560, 760, { title: "Inventory" }),
        node({
          id: "windows_inventory_grid",
          name: "Inventory Grid",
          type: "grid",
          transform: frame(42, 112, 476, 480),
          layout: { mode: "grid", columns: 3, cellWidth: 150, cellHeight: 180, columnGap: 12, rowGap: 22, padding: 0, alignItems: "center", justifyContent: "center" },
          components: [
            comp("layout", { mode: "grid", columns: 3, cellWidth: 150, cellHeight: 180, columnGap: 12, rowGap: 22 })
          ],
          children: [
            instanceNode("windows_item_1", "component_inventory_item", 0, 0, 150, 180, { label: "Blade", frame: "star", variant: "rare" }),
            instanceNode("windows_item_2", "component_inventory_item", 0, 0, 150, 180, { label: "Gem", frame: "gem", variant: "legendary" }),
            instanceNode("windows_item_3", "component_inventory_item", 0, 0, 150, 180, { label: "Coin", frame: "coin", variant: "rare" }),
            instanceNode("windows_item_4", "component_inventory_item", 0, 0, 150, 180, { label: "Chat", frame: "chat" }),
            instanceNode("windows_item_5", "component_inventory_item", 0, 0, 150, 180, { label: "Lock", frame: "lock" }),
            instanceNode("windows_item_6", "component_inventory_item", 0, 0, 150, 180, { label: "Slot", frame: "slot" })
          ]
        }),
        instanceNode("windows_inventory_equip", "component_button", 150, 640, 260, 72, { label: "EQUIP", variant: "primary" })
      ]
    }),
    node({
      id: "windows_confirm_dialog",
      name: "Confirm Dialog",
      type: "graphics",
      transform: frame(640, 716, 640, 260),
      components: [
        comp("fill", { shape: "roundedRect", fill: "#252d40", stroke: "#f2c14e", strokeWidth: 3, radius: 24 }),
        comp("shadow", { color: "#000000", alpha: 0.38, blur: 26, offsetX: 0, offsetY: 14 })
      ],
      children: [
        textNode("windows_confirm_title", "Confirm Title", "Confirm Purchase", 36, 28, 440, 44, { fontSize: 30, fill: "#ffffff", wrap: false }),
        textNode("windows_confirm_body", "Confirm Body", "Spend 1 200 coins on this legendary card?", 36, 86, 560, 64, { fontSize: 22, fill: "#c9d3e5", wrap: true }),
        instanceNode("windows_confirm_cancel", "component_button", 78, 170, 210, 60, { label: "CANCEL", variant: "disabled" }),
        instanceNode("windows_confirm_ok", "component_button", 350, 170, 210, 60, { label: "CONFIRM", variant: "primary" })
      ]
    }),
    node({
      id: "windows_toast",
      name: "Toast",
      type: "graphics",
      transform: frame(710, 48, 500, 64),
      components: [
        comp("fill", { shape: "roundedRect", fill: "#1d2d3b", stroke: "#37b7a7", strokeWidth: 2, radius: 18 })
      ],
      children: [
        textNode("windows_toast_text", "Toast Text", "Saved layout profile", 24, 0, 452, 64, { fontSize: 22, fill: "#d9fff9", align: "center", verticalAlign: "middle", wrap: false })
      ]
    }),
    tooltipNode("windows_tooltip", 730, 618, "Tooltip / context menu")
  ];

  return page("page_windows", "Windows", width, height, "#0e1320", { coins: 12450, gems: 860 }, children, {
    safeArea: { top: 24, right: 24, bottom: 24, left: 24 }
  });
}

function createLayoutsPage() {
  const width = 1280;
  const height = 1400;
  const children = [
    pageHeader("layouts_header", "Layouts, Masks and Scrollers", "Flex/list/grid containers, anchors, constraints, masks and scroll views.", width),
    section("layouts_flex_section", "Flex Layout", 40, 150, 560, 310, [
      node({
        id: "layouts_flex_container",
        name: "Flex Container",
        type: "container",
        transform: frame(24, 78, 512, 178),
        layout: { mode: "flex", direction: "horizontal", gap: 16, padding: 18, alignItems: "center", justifyContent: "space-between" },
        components: [
          comp("layout", { mode: "flex", direction: "horizontal", gap: 16, padding: 18, alignItems: "center", justifyContent: "space-between" }),
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
        ],
        children: [
          layoutChild("layouts_flex_1", "A", "#37b7a7"),
          layoutChild("layouts_flex_2", "B", "#62b5ff"),
          layoutChild("layouts_flex_3", "C", "#f2c14e")
        ]
      })
    ]),
    section("layouts_list_section", "List Layout", 680, 150, 560, 310, [
      node({
        id: "layouts_list_container",
        name: "List Container",
        type: "list",
        transform: frame(24, 78, 512, 190),
        layout: { mode: "list", direction: "vertical", gap: 12, padding: { top: 14, right: 14, bottom: 14, left: 14 } },
        components: [
          comp("layout", { mode: "list", direction: "vertical", gap: 12, padding: { top: 14, right: 14, bottom: 14, left: 14 } }),
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
        ],
        children: [
          listRow("layouts_list_row_1", "Inbox", "12"),
          listRow("layouts_list_row_2", "Quests", "7"),
          listRow("layouts_list_row_3", "Rewards", "3")
        ]
      })
    ]),
    section("layouts_grid_section", "Grid Layout", 40, 500, 560, 360, [
      node({
        id: "layouts_grid_container",
        name: "Grid Container",
        type: "grid",
        transform: frame(24, 78, 512, 236),
        layout: { mode: "grid", columns: 4, cellWidth: 110, cellHeight: 90, columnGap: 12, rowGap: 12, padding: 16, alignItems: "center", justifyContent: "center" },
        components: [
          comp("layout", { mode: "grid", columns: 4, cellWidth: 110, cellHeight: 90, columnGap: 12, rowGap: 12, padding: 16 }),
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
        ],
        children: Array.from({ length: 8 }, (_, index) => gridCell(`layouts_grid_cell_${index + 1}`, index))
      })
    ]),
    section("layouts_anchor_section", "Anchors and Constraints", 680, 500, 560, 360, [
      node({
        id: "layouts_anchor_frame",
        name: "Anchor Frame",
        type: "graphics",
        transform: frame(24, 78, 512, 236),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
        ],
        children: [
          anchoredChip("layouts_anchor_top_left", "top-left", { left: 18, top: 18 }, 150, 48),
          anchoredChip("layouts_anchor_center", "center", { centerX: 0, centerY: 0 }, 150, 48),
          anchoredChip("layouts_anchor_stretch", "stretch", { left: 18, right: 18, bottom: 18 }, 476, 48)
        ]
      })
    ]),
    section("layouts_scroll_section", "Scroll View", 40, 900, 560, 410, [
      scrollPanel("layouts_scroll_view", 24, 76, 512, 280, {
        childPrefix: "layouts_scroll_item",
        itemCount: 7
      })
    ]),
    section("layouts_mask_section", "Mask Node and Mask Component", 680, 900, 560, 410, [
      node({
        id: "layouts_mask_node",
        name: "Masked Avatar",
        type: "mask",
        transform: frame(46, 92, 210, 210),
        components: [
          comp("mask", { shape: "ellipse", radius: 105, invert: false }),
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#62b5ff", strokeWidth: 3, radius: 105 })
        ],
        children: [
          node({
            id: "layouts_masked_texture",
            name: "Masked Texture",
            type: "graphics",
            transform: frame(0, 0, 210, 210),
            components: [
              comp("texture", { assetId: "asset_avatar_texture", objectFit: "cover" })
            ]
          })
        ]
      }),
      node({
        id: "layouts_repeater_node",
        name: "Repeater Descriptor",
        type: "container",
        transform: frame(300, 92, 214, 210),
        components: [
          comp("repeater", { dataPath: "items", direction: "grid", itemGap: 10, limit: 6 }),
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#f2c14e", strokeWidth: 2, radius: 18 })
        ],
        children: [
          textNode("layouts_repeater_label", "Repeater Label", "Repeater\ncomponent", 22, 38, 170, 110, { fontSize: 24, fill: "#f2c14e", align: "center", verticalAlign: "middle", wrap: true })
        ]
      })
    ])
  ];

  return page("page_layouts", "Layouts", width, height, "#111624", {
    items: ["alpha", "beta", "gamma"],
    coins: 12450,
    gems: 860
  }, children, {
    orientation: "portrait",
    safeArea: { top: 28, right: 20, bottom: 28, left: 20 }
  });
}

function createAssetsAndInstancesPage() {
  const width = 1600;
  const height = 1100;
  const children = [
    pageHeader("assets_header", "Assets, Instances and States", "Texture assets, atlas frames, data/font assets, reusable components and state overrides.", width),
    section("assets_library_section", "Asset Library", 40, 150, 720, 850, [
      assetCard("assets_card_panel", "Texture", "Gradient Panel", "asset_panel_texture", null, 24, 78, { textureType: "sliced", nineSlice: { left: 24, right: 24, top: 24, bottom: 24 } }),
      assetCard("assets_card_avatar", "Texture", "Avatar", "asset_avatar_texture", null, 374, 78),
      assetCard("assets_card_pattern", "Texture", "Tiled Pattern", "asset_pattern_texture", null, 24, 330, { textureType: "tiled" }),
      assetCard("assets_card_atlas_coin", "Atlas Frame", "coin", "asset_icon_atlas", "coin", 374, 330),
      assetCard("assets_card_atlas_gem", "Atlas Frame", "gem", "asset_icon_atlas", "gem", 24, 582),
      dataAssetCard("assets_card_data", 374, 582)
    ]),
    section("assets_instances_section", "Component Instances", 800, 150, 760, 850, [
      instanceNode("assets_button_primary", "component_button", 34, 86, 260, 72, { label: "PRIMARY", variant: "primary" }),
      instanceNode("assets_button_danger", "component_button", 326, 86, 260, 72, { label: "DANGER", variant: "danger" }),
      instanceNode("assets_button_disabled", "component_button", 34, 186, 260, 72, { label: "DISABLED", variant: "disabled" }),
      instanceNode("assets_badge_coin", "component_resource_badge", 326, 186, 250, 72, { value: "12 450", frame: "coin", variant: "coins" }),
      instanceNode("assets_badge_gem", "component_resource_badge", 34, 286, 250, 72, { value: "860", frame: "gem", variant: "gems" }),
      instanceNode("assets_item_rare", "component_inventory_item", 326, 286, 150, 180, { label: "Rare", frame: "star", variant: "rare" }),
      instanceNode("assets_item_legendary", "component_inventory_item", 506, 286, 150, 180, { label: "Legend", frame: "gem", variant: "legendary" }),
      node({
        id: "assets_state_showcase",
        name: "State Overrides",
        type: "graphics",
        transform: frame(34, 520, 660, 230),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
        ],
        children: [
          textNode("assets_state_title", "States Title", "States: normal / highlighted / disabled", 24, 18, 500, 32, { fontSize: 22, fill: "#ffffff", wrap: false }),
          stateChip("assets_state_normal", "normal", 28, 74, "#37b7a7"),
          stateChip("assets_state_highlighted", "highlighted", 238, 74, "#f2c14e", {
            highlighted: {
              components: [comp("fill", { shape: "roundedRect", fill: "#f2c14e", stroke: "#ffe19a", strokeWidth: 2, radius: 18 })]
            }
          }),
          stateChip("assets_state_disabled", "disabled", 448, 74, "#56627a", {
            disabled: {
              style: { alpha: 0.45 },
              active: false
            }
          })
        ]
      }),
      node({
        id: "assets_binding_showcase",
        name: "Localization and Bindings",
        type: "graphics",
        transform: frame(34, 780, 660, 46),
        components: [
          comp("text", { localizationKey: "hud.coins", text: "Coins: {{coins}}", fontFamily: "Inter", fontSize: 28, fill: "#f2c14e", align: "left", verticalAlign: "middle", wrap: false })
        ],
        bindings: {
          text: { source: "data", path: "coins" }
        }
      })
    ])
  ];

  return page("page_assets_instances", "Assets and Instances", width, height, "#111624", {
    coins: 12450,
    gems: 860
  }, children);
}

function page(id, name, width, height, background, variables, children, options = {}) {
  return {
    id,
    name,
    canvas: {
      width,
      height,
      orientation: options.orientation || (width >= height ? "landscape" : "portrait"),
      background,
      safeArea: options.safeArea || { top: 0, right: 0, bottom: 0, left: 0 }
    },
    variables,
    root: linkParents(node({
      id: `${id}_root`,
      name: `${name} Root`,
      type: "container",
      transform: frame(0, 0, width, height),
      layout: { mode: "absolute", safeArea: true },
      children
    }), null),
    interactions: [],
    animations: [],
    editorMeta: {
      theme: "default",
      notes: "Generated all-elements example."
    }
  };
}

function pageHeader(id, title, subtitle, width) {
  return node({
    id,
    name: "Page Header",
    type: "graphics",
    transform: frame(40, 32, width - 80, 88),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#1b2233", stroke: "#3d4962", strokeWidth: 2, radius: 24 }),
      comp("shadow", { color: "#000000", alpha: 0.22, blur: 18, offsetX: 0, offsetY: 8 })
    ],
    children: [
      textNode(`${id}_title`, "Title", title, 28, 12, 560, 38, { fontSize: 34, fill: "#ffffff", wrap: false }),
      textNode(`${id}_subtitle`, "Subtitle", subtitle, 30, 52, width - 160, 28, { fontSize: 18, fill: "#9aa7bd", wrap: false }),
      node({
        id: `${id}_atlas_icon`,
        name: "Atlas Icon",
        type: "graphics",
        transform: frame(width - 160, 18, 52, 52),
        components: [
          comp("texture", { assetId: "asset_icon_atlas", frame: "star", objectFit: "contain" })
        ]
      })
    ]
  });
}

function section(id, title, x, y, width, height, children) {
  return node({
    id,
    name: title,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#1b2233", stroke: "#3b465d", strokeWidth: 2, radius: 22 }),
      comp("shadow", { color: "#000000", alpha: 0.18, blur: 12, offsetX: 0, offsetY: 6 })
    ],
    children: [
      textNode(`${id}_title`, "Section Title", title, 24, 20, width - 48, 34, { fontSize: 26, fill: "#f4f7fb", wrap: false }),
      ...children
    ]
  });
}

function nodeTypeTile(id, label, x, y, nodeType) {
  const tile = node({
    id,
    name: `${label} Node Type`,
    type: nodeType,
    transform: frame(x, y, 180, 92),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#56627a", strokeWidth: 2, radius: 16 })
    ],
    children: [
      textNode(`${id}_label`, "Label", label, 12, 20, 156, 28, { fontSize: 22, fill: "#ffffff", align: "center", wrap: false }),
      textNode(`${id}_meta`, "Meta", `type: ${nodeType}`, 12, 52, 156, 22, { fontSize: 14, fill: "#9aa7bd", align: "center", wrap: false })
    ]
  });

  if (nodeType === "scrollView") {
    tile.components.push(comp("scroll", { direction: "vertical", scrollX: false, scrollY: true, momentum: true, mask: true }));
  }
  if (nodeType === "list") {
    tile.layout = { mode: "list", direction: "vertical", gap: 4, padding: 8 };
    tile.components.push(comp("layout", { mode: "list", direction: "vertical", gap: 4, padding: 8 }));
  }
  if (nodeType === "grid") {
    tile.layout = { mode: "grid", columns: 2, cellWidth: 70, cellHeight: 32, gap: 6, padding: 8 };
    tile.components.push(comp("layout", { mode: "grid", columns: 2, cellWidth: 70, cellHeight: 32, gap: 6, padding: 8 }));
  }
  if (nodeType === "mask") {
    tile.components.unshift(comp("mask", { shape: "roundedRect", radius: 16, invert: false }));
  }
  return tile;
}

function visualTile(id, label, x, y, fill, extraComponents = []) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, 140, 92),
    components: [
      comp("fill", { shape: "roundedRect", fill, stroke: "#56627a", strokeWidth: 2, radius: 18 }),
      ...extraComponents
    ],
    children: [
      textNode(`${id}_label`, "Label", label, 10, 30, 120, 30, { fontSize: 18, fill: "#ffffff", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function textureDemo(id, label, x, y, assetId, textureProps = {}) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, 140, 92),
    components: [
      comp("texture", { assetId, objectFit: "cover", tint: "#ffffff", ...textureProps }),
      comp("outline", { color: "#ffffff", alpha: 0.35, width: 2 })
    ],
    children: [
      textNode(`${id}_label`, "Label", label, 8, 60, 124, 24, { fontSize: 15, fill: "#ffffff", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function buttonNode(id, name, x, y, width, height, label, fill) {
  return node({
    id,
    name,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("fill", { shape: "roundedRect", fill, stroke: "#78e7dd", strokeWidth: 2, radius: 18 }),
      comp("text", { text: label, fontFamily: "Inter", fontSize: 24, fill: "#071412", align: "center", verticalAlign: "middle", lineHeight: 1.1, wrap: false }),
      comp("button", { interactive: true, eventMode: "static", cursor: "pointer" })
    ],
    states: {
      pressed: {
        transform: { scaleX: 0.98, scaleY: 0.98 },
        components: [comp("fill", { shape: "roundedRect", fill: "#16897e", stroke: "#78e7dd", strokeWidth: 2, radius: 18 })]
      }
    }
  });
}

function toggleNode(id, name, x, y, checked) {
  return node({
    id,
    name,
    type: "graphics",
    transform: frame(x, y, 260, 76),
    components: [
      comp("toggle", { checked, onFill: "#37b7a7", offFill: "#2b3040", knobFill: "#ffffff", interactive: true, eventMode: "static", cursor: "pointer" }),
      comp("fill", { shape: "roundedRect", fill: checked ? "#37b7a7" : "#2b3040", radius: 38 }),
      comp("button", { interactive: true, eventMode: "static", cursor: "pointer" })
    ],
    children: [
      node({
        id: `${id}_thumb`,
        name: "Thumb",
        type: "graphics",
        transform: frame(184, 10, 56, 56),
        layout: { anchors: { right: 20, centerY: 0 } },
        components: [
          comp("fill", { shape: "roundedRect", fill: "#ffffff", radius: 28 }),
          comp("shadow", { color: "#000000", alpha: 0.22, blur: 10, offsetX: 0, offsetY: 4 })
        ],
        editorMeta: { controlPart: "toggleThumb" }
      }),
      textNode(`${id}_label`, "Label", name, 280, 14, 260, 48, { fontSize: 24, fill: "#ffffff", verticalAlign: "middle", wrap: false })
    ]
  });
}

function checkboxNode(id, label, x, y, checked) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, 280, 70),
    components: [
      comp("checkbox", { checked, checkFill: "#37b7a7", boxFill: "#151922", stroke: "#59657a", interactive: true, eventMode: "static", cursor: "pointer" })
    ],
    children: [
      node({
        id: `${id}_box`,
        name: "Box",
        type: "graphics",
        transform: frame(0, 6, 56, 56),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#151922", stroke: "#59657a", strokeWidth: 3, radius: 12 })
        ],
        editorMeta: { controlPart: "checkboxBox" },
        children: [
          textNode(`${id}_check`, "Check", checked ? "X" : "", 0, 0, 56, 56, { fontSize: 30, fill: "#37b7a7", align: "center", verticalAlign: "middle", wrap: false })
        ]
      }),
      textNode(`${id}_label`, "Label", label, 74, 6, 190, 56, { fontSize: 24, fill: "#ffffff", verticalAlign: "middle", wrap: false })
    ]
  });
}

function radioNode(id, label, x, y, checked) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, 260, 70),
    components: [
      comp("radio", { checked, group: "sample", checkFill: "#37b7a7", ringFill: "#151922", stroke: "#59657a", interactive: true, eventMode: "static", cursor: "pointer" })
    ],
    children: [
      node({
        id: `${id}_ring`,
        name: "Ring",
        type: "graphics",
        transform: frame(0, 6, 56, 56),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#151922", stroke: "#59657a", strokeWidth: 3, radius: 28 })
        ],
        editorMeta: { controlPart: "radioRing" }
      }),
      node({
        id: `${id}_dot`,
        name: "Dot",
        type: "graphics",
        transform: frame(17, 23, 22, 22),
        components: [
          comp("fill", { shape: "roundedRect", fill: checked ? "#37b7a7" : "transparent", radius: 11 })
        ],
        editorMeta: { controlPart: "radioDot" }
      }),
      textNode(`${id}_label`, "Label", label, 74, 6, 170, 56, { fontSize: 24, fill: "#ffffff", verticalAlign: "middle", wrap: false })
    ]
  });
}

function sliderNode(id, label, x, y, width, height, value) {
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("slider", { value, min: 0, max: 100, step: 1, direction: "horizontal", trackFill: "#2b3040", fill: "#37b7a7", thumbFill: "#ffffff" })
    ],
    children: [
      textNode(`${id}_label`, "Label", label, 0, 0, 120, 24, { fontSize: 18, fill: "#9aa7bd", wrap: false }),
      node({
        id: `${id}_track`,
        name: "Track",
        type: "graphics",
        transform: frame(0, 36, width, 18),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#2b3040", radius: 9 })
        ]
      }),
      node({
        id: `${id}_fill`,
        name: "Value Fill",
        type: "graphics",
        transform: frame(0, 36, width * pct, 18),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#37b7a7", radius: 9 })
        ],
        editorMeta: { controlPart: "sliderFill" }
      }),
      node({
        id: `${id}_thumb`,
        name: "Thumb",
        type: "graphics",
        transform: frame(Math.max(0, width * pct - 24), 20, 48, 48),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#ffffff", radius: 24 })
        ],
        editorMeta: { controlPart: "sliderThumb" }
      })
    ]
  });
}

function inputNode(id, name, x, y, width, height, placeholder, value, componentType = "input") {
  return node({
    id,
    name,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp(componentType, { value, placeholder, inputType: componentType === "textInput" ? "email" : "text", interactive: true, eventMode: "static", cursor: "text" }),
      comp("fill", { shape: "roundedRect", fill: "#181c26", stroke: "#536078", strokeWidth: 2, radius: 16 }),
      comp("text", { text: value || placeholder, fontFamily: "Inter", fontSize: 22, fill: value ? "#ffffff" : "#8f98aa", align: "left", verticalAlign: "middle", lineHeight: 1.1, wrap: false })
    ]
  });
}

function dropdownNode(id, name, x, y, width, height, value) {
  return node({
    id,
    name,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("dropdown", { value, options: "Option A, Option B, Option C", interactive: true, eventMode: "static", cursor: "pointer" }),
      comp("fill", { shape: "roundedRect", fill: "#181c26", stroke: "#536078", strokeWidth: 2, radius: 16 }),
      comp("text", { text: value, fontFamily: "Inter", fontSize: 24, fill: "#ffffff", align: "left", verticalAlign: "middle", lineHeight: 1.1, wrap: false })
    ],
    children: [
      textNode(`${id}_arrow`, "Arrow", "v", width - 56, 16, 34, 44, { fontSize: 26, fill: "#aab3c2", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function progressBar(id, label, x, y, width, height, value) {
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("progressBar", { value, min: 0, max: 100, trackFill: "#2b3040", fill: "#37b7a7", radius: 14 }),
      comp("fill", { shape: "roundedRect", fill: "#2b3040", radius: 14 })
    ],
    children: [
      node({
        id: `${id}_fill`,
        name: "Progress Fill",
        type: "graphics",
        transform: frame(0, 0, width * pct, height),
        components: [
          comp("fill", { shape: "roundedRect", fill: "#37b7a7", radius: 14 })
        ],
        editorMeta: { controlPart: "progressFill" }
      }),
      textNode(`${id}_label`, "Label", label, 0, 0, width, height, { fontSize: 17, fill: "#ffffff", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function layoutStrip(id, x, y) {
  return node({
    id,
    name: "Layout Strip",
    type: "container",
    transform: frame(x, y, 320, 92),
    layout: { mode: "flex", direction: "horizontal", gap: 12, padding: 12, alignItems: "center" },
    components: [
      comp("layout", { mode: "flex", direction: "horizontal", gap: 12, padding: 12, alignItems: "center" }),
      comp("fill", { shape: "roundedRect", fill: "#20283a", radius: 16 })
    ],
    children: [
      layoutChild(`${id}_a`, "A", "#37b7a7"),
      layoutChild(`${id}_b`, "B", "#62b5ff"),
      layoutChild(`${id}_c`, "C", "#f2c14e")
    ]
  });
}

function layoutChild(id, label, fill) {
  return node({
    id,
    name: `Layout Child ${label}`,
    type: "graphics",
    transform: frame(0, 0, 82, 60),
    components: [
      comp("fill", { shape: "roundedRect", fill, radius: 14 }),
      comp("text", { text: label, fontFamily: "Inter", fontSize: 24, fill: "#101522", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function repeaterDemo(id, x, y) {
  return node({
    id,
    name: "Repeater",
    type: "container",
    transform: frame(x, y, 320, 150),
    components: [
      comp("repeater", { dataPath: "items", direction: "horizontal", itemGap: 10, limit: 4 }),
      comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#56627a", strokeWidth: 2, radius: 16 })
    ],
    children: [
      textNode(`${id}_title`, "Title", "Repeater descriptor", 18, 16, 280, 26, { fontSize: 19, fill: "#f2c14e", align: "center", wrap: false }),
      ...[0, 1, 2].map((index) => node({
        id: `${id}_preview_${index}`,
        name: `Preview Item ${index + 1}`,
        type: "graphics",
        transform: frame(34 + index * 84, 64, 62, 52),
        components: [
          comp("fill", { shape: "roundedRect", fill: ["#37b7a7", "#62b5ff", "#f2c14e"][index], radius: 13 })
        ]
      }))
    ]
  });
}

function scrollPanel(id, x, y, width = 300, height = 240, options = {}) {
  const itemCount = options.itemCount || 5;
  const childPrefix = options.childPrefix || `${id}_row`;
  return node({
    id,
    name: "Scroll View",
    type: "scrollView",
    transform: frame(x, y, width, height),
    components: [
      comp("scroll", { direction: "vertical", scrollX: false, scrollY: true, momentum: true, mask: true }),
      comp("scrollView", { direction: "vertical", scrollX: false, scrollY: true, momentum: true, mask: true }),
      comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#56627a", strokeWidth: 2, radius: 18 })
    ],
    children: Array.from({ length: itemCount }, (_, index) => listRow(`${childPrefix}_${index + 1}`, `Scroll row ${index + 1}`, String(100 + index), 16, 20 + index * 58, width - 32, 46))
  });
}

function maskDemo(id, x, y) {
  return node({
    id,
    name: "Mask Demo",
    type: "mask",
    transform: frame(x, y, 300, 130),
    components: [
      comp("mask", { shape: "roundedRect", radius: 22, invert: false }),
      comp("texture", { assetId: "asset_pattern_texture", textureType: "tiled", tint: "#ffffff" }),
      comp("outline", { color: "#62b5ff", alpha: 1, width: 3 })
    ],
    children: [
      textNode(`${id}_label`, "Label", "Mask component", 20, 42, 260, 42, { fontSize: 24, fill: "#ffffff", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function instanceNode(id, componentId, x, y, width, height, props = {}) {
  const { variant, ...exposed } = props;
  return node({
    id,
    name: `${componentId} Instance`,
    type: "componentInstance",
    transform: frame(x, y, width, height),
    props: {
      componentId,
      ...(variant ? { variant } : {}),
      ...exposed
    },
    editorMeta: { componentId }
  });
}

function shopCard(id, x, y, index) {
  const labels = ["Starter Pack", "Gem Bundle", "Legend Card"];
  const frames = ["coin", "gem", "star"];
  return node({
    id,
    name: labels[index],
    type: "graphics",
    transform: frame(x, y, 508, 142),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3d4962", strokeWidth: 2, radius: 18 })
    ],
    children: [
      node({
        id: `${id}_icon`,
        name: "Icon",
        type: "graphics",
        transform: frame(20, 26, 86, 86),
        components: [comp("texture", { assetId: "asset_icon_atlas", frame: frames[index], objectFit: "contain" })]
      }),
      textNode(`${id}_title`, "Title", labels[index], 126, 24, 250, 38, { fontSize: 26, fill: "#ffffff", wrap: false }),
      textNode(`${id}_price`, "Price", `${(index + 1) * 400} coins`, 126, 70, 220, 30, { fontSize: 20, fill: "#f2c14e", wrap: false }),
      instanceNode(`${id}_button`, "component_button", 366, 42, 118, 58, { label: "GET", variant: "primary" })
    ]
  });
}

function tooltipNode(id, x, y, label) {
  return node({
    id,
    name: "Tooltip",
    type: "graphics",
    transform: frame(x, y, 460, 72),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#0f1420", stroke: "#56627a", strokeWidth: 2, radius: 16 }),
      comp("shadow", { color: "#000000", alpha: 0.42, blur: 18, offsetX: 0, offsetY: 8 })
    ],
    children: [
      textNode(`${id}_text`, "Tooltip Text", label, 24, 0, 412, 72, { fontSize: 22, fill: "#ffffff", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function listRow(id, label, value, x = 0, y = 0, width = 484, height = 44) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#283147", radius: 12 })
    ],
    children: [
      textNode(`${id}_label`, "Label", label, 16, 0, width - 100, height, { fontSize: 20, fill: "#ffffff", verticalAlign: "middle", wrap: false }),
      textNode(`${id}_value`, "Value", value, width - 80, 0, 64, height, { fontSize: 20, fill: "#f2c14e", align: "right", verticalAlign: "middle", wrap: false })
    ]
  });
}

function gridCell(id, index) {
  const colors = ["#37b7a7", "#62b5ff", "#f2c14e", "#ef5d6c"];
  return node({
    id,
    name: `Grid Cell ${index + 1}`,
    type: "graphics",
    transform: frame(0, 0, 110, 90),
    components: [
      comp("fill", { shape: "roundedRect", fill: colors[index % colors.length], radius: 16 }),
      comp("text", { text: String(index + 1), fontFamily: "Inter", fontSize: 28, fill: "#101522", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function anchoredChip(id, label, anchors, width, height) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(0, 0, width, height),
    layout: { mode: "absolute", anchors },
    components: [
      comp("fill", { shape: "roundedRect", fill: "#30384d", stroke: "#62b5ff", strokeWidth: 2, radius: 14 }),
      comp("text", { text: label, fontFamily: "Inter", fontSize: 18, fill: "#ffffff", align: "center", verticalAlign: "middle", wrap: false })
    ]
  });
}

function assetCard(id, typeLabel, label, assetId, frameName, x, y, textureProps = {}) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, 300, 210),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
    ],
    children: [
      node({
        id: `${id}_preview`,
        name: "Preview",
        type: "graphics",
        transform: frame(24, 22, 252, 112),
        components: [
          comp("texture", { assetId, frame: frameName, objectFit: "contain", tint: "#ffffff", ...textureProps }),
          comp("outline", { color: "#ffffff", alpha: 0.22, width: 2 })
        ]
      }),
      textNode(`${id}_type`, "Type", typeLabel, 24, 146, 252, 24, { fontSize: 16, fill: "#9aa7bd", wrap: false }),
      textNode(`${id}_label`, "Label", label, 24, 170, 252, 26, { fontSize: 20, fill: "#ffffff", wrap: false })
    ]
  });
}

function dataAssetCard(id, x, y) {
  return node({
    id,
    name: "Data and Font Assets",
    type: "graphics",
    transform: frame(x, y, 300, 210),
    components: [
      comp("fill", { shape: "roundedRect", fill: "#20283a", stroke: "#3c4860", strokeWidth: 2, radius: 18 })
    ],
    children: [
      textNode(`${id}_title`, "Title", "Data + Font", 24, 28, 252, 32, { fontSize: 24, fill: "#ffffff", align: "center", wrap: false }),
      textNode(`${id}_body`, "Body", "asset_window_data\nasset_inter_font", 24, 76, 252, 76, { fontSize: 19, fill: "#9aa7bd", align: "center", verticalAlign: "middle", wrap: true }),
      textNode(`${id}_meta`, "Meta", "types: data, font", 24, 164, 252, 26, { fontSize: 16, fill: "#f2c14e", align: "center", wrap: false })
    ]
  });
}

function stateChip(id, label, x, y, fill, states = {}) {
  return node({
    id,
    name: label,
    type: "graphics",
    transform: frame(x, y, 170, 80),
    components: [
      comp("fill", { shape: "roundedRect", fill, stroke: "#ffffff", strokeWidth: 1, radius: 18 }),
      comp("text", { text: label, fontFamily: "Inter", fontSize: 20, fill: "#101522", align: "center", verticalAlign: "middle", wrap: false })
    ],
    states
  });
}

function textNode(id, name, text, x, y, width, height, props = {}) {
  return node({
    id,
    name,
    type: "graphics",
    transform: frame(x, y, width, height),
    components: [
      comp("text", {
        text,
        fontFamily: "Inter",
        fontSize: 22,
        fill: "#ffffff",
        align: "left",
        verticalAlign: "top",
        lineHeight: 1.2,
        wrap: true,
        ...props
      })
    ]
  });
}

function node(options = {}) {
  return {
    id: options.id,
    name: options.name || options.id,
    type: options.type || "container",
    active: options.active ?? true,
    parentId: options.parentId ?? null,
    children: options.children || [],
    transform: {
      x: 0,
      y: 0,
      width: 240,
      height: 96,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      pivotX: 0,
      pivotY: 0,
      alpha: 1,
      visible: true,
      ...(options.transform || {})
    },
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
    props: options.props || {},
    components: options.components || [],
    states: options.states || {},
    interactions: options.interactions || [],
    bindings: options.bindings || {},
    editorMeta: options.editorMeta || {}
  };
}

function linkParents(root, parentId = null) {
  root.parentId = parentId;
  root.children = (root.children || []).map((child) => linkParents(child, root.id));
  return root;
}

function comp(type, props = {}, id = type) {
  return {
    id,
    type,
    enabled: true,
    props
  };
}

function frame(x, y, width, height) {
  return {
    x,
    y,
    width,
    height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    pivotX: 0,
    pivotY: 0
  };
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function createExampleLayout() {
  return {
    profileVersion: 2,
    leftPanelWidth: 340,
    rightPanelWidth: 430,
    bottomPanelHeight: 360,
    validationPanelHeight: 170,
    assetFolderWidth: 230,
    assetTileSize: 96,
    assetGridEnabled: true,
    leftCollapsed: false,
    rightCollapsed: false,
    bottomCollapsed: false,
    panels: {
      pages: { zone: "left", order: 0, visible: true, size: 260 },
      components: { zone: "left", order: 1, visible: true, size: 260 },
      layers: { zone: "left", order: 2, visible: true },
      inspector: { zone: "right", order: 0, visible: true },
      validation: { zone: "right", order: 1, visible: true },
      assets: { zone: "bottom", order: 0, visible: true }
    }
  };
}

async function writeBundle() {
  const outUrl = new URL("./all-elements.pixiprojectui", import.meta.url);
  const bundle = createAllElementsProjectBundle();
  await writeFile(outUrl, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return fileURLToPath(outUrl);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = await writeBundle();
  console.log(`Wrote ${outPath}`);
}
