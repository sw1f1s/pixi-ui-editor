export function createMinimalProjectDocument(overrides = {}) {
  const projectOverrides = overrides.project || {};

  return {
    schemaVersion: overrides.schemaVersion || "1.0.0",
    project: {
      id: projectOverrides.id || "project_smoke",
      name: projectOverrides.name || "Smoke Project",
      createdAt: projectOverrides.createdAt || "2026-05-19T00:00:00.000Z",
    },
    tokens: overrides.tokens || {},
    themes: overrides.themes || [],
    styleLibraries: overrides.styleLibraries || [],
    assets: overrides.assets || [],
    components: overrides.components || [],
    pages: overrides.pages || [],
    locales: overrides.locales || [],
    exportProfiles: overrides.exportProfiles || [
      {
        id: "web",
        name: "Web runtime",
        target: "pixi",
      },
    ],
  };
}

export function createSinglePageProjectDocument() {
  const titleNode = {
    id: "node_title",
    name: "Title",
    type: "graphics",
    parentId: "node_root",
    children: [],
    transform: {
      x: 32,
      y: 24,
      width: 320,
      height: 64,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      visible: true,
    },
    layout: {
      mode: "absolute",
    },
    style: {
      fill: "#ffffff",
      fontSize: 32,
      fontFamily: "Inter",
    },
    props: {},
    components: [
      {
        id: "text",
        type: "text",
        props: {
          text: "Shop",
          fontFamily: "Inter",
          fontSize: 32,
          fill: "#ffffff",
        },
      },
    ],
    states: {
      normal: {},
      highlighted: {
        style: {
          fill: "#ffd166",
        },
      },
    },
    bindings: {},
    interactions: [],
    editorMeta: {
      selected: false,
    },
  };

  const rootNode = {
    id: "node_root",
    name: "Root",
    type: "container",
    parentId: null,
    children: [titleNode],
    transform: {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      visible: true,
    },
    layout: {
      mode: "absolute",
    },
    style: {},
    props: {},
    states: {},
    bindings: {},
    interactions: [],
    editorMeta: {},
  };

  return createMinimalProjectDocument({
    pages: [
      {
        id: "page_shop",
        name: "Shop",
        canvas: {
          width: 800,
          height: 600,
          orientation: "landscape",
          background: "#101820",
        },
        variables: {},
        root: rootNode,
        interactions: [],
        animations: [],
        editorMeta: {},
      },
    ],
  });
}

export function createRuntimeParityProjectDocument() {
  return createMinimalProjectDocument({
    assets: [
      {
        id: "asset_ui_atlas",
        name: "UI Atlas",
        type: "spriteAtlas",
        src: "assets/ui-atlas.png",
        frames: {
          "button-panel.png": {
            x: 8,
            y: 12,
            width: 96,
            height: 48,
          },
        },
      },
    ],
    pages: [
      {
        id: "page_runtime_parity",
        name: "Runtime Parity",
        canvas: {
          width: 480,
          height: 320,
        },
        root: {
          id: "node_parity_root",
          name: "Parity Root",
          type: "container",
          parentId: null,
          transform: { x: 0, y: 0, width: 480, height: 320 },
          children: [
            {
              id: "node_cta_button",
              name: "CTA Button",
              type: "graphics",
              parentId: "node_parity_root",
              transform: { x: 24, y: 28, width: 180, height: 56 },
              props: {},
              components: [
                {
                  id: "fill",
                  type: "fill",
                  props: {
                    fill: "#1f8fff",
                    stroke: "#0b376d",
                    strokeWidth: 3,
                    radius: 14,
                    pressedFill: "#166dcc",
                  },
                },
                {
                  id: "button",
                  type: "button",
                  props: { cursor: "pointer" },
                },
              ],
              children: [],
            },
            {
              id: "node_panel_shape",
              name: "Panel Shape",
              type: "graphics",
              parentId: "node_parity_root",
              transform: { x: 240, y: 24, width: 160, height: 92 },
              props: {},
              components: [
                {
                  id: "fill",
                  type: "fill",
                  props: {
                    fill: "#111827",
                    stroke: "#f8c452",
                    strokeWidth: 2,
                    radius: 10,
                  },
                },
              ],
              children: [],
            },
            {
              id: "node_centered_label",
              name: "Centered Label",
              type: "graphics",
              parentId: "node_parity_root",
              transform: { x: 24, y: 116, width: 220, height: 72 },
              props: {},
              components: [
                {
                  id: "text",
                  type: "text",
                  props: {
                    text: "Centered",
                    fontFamily: "Inter",
                    fontSize: 24,
                    fill: "#ffffff",
                    align: "center",
                    verticalAlign: "middle",
                    anchor: { x: 0.5, y: 0.5 },
                    pivotAnchor: "center",
                  },
                },
              ],
              children: [],
            },
            {
              id: "node_atlas_panel",
              name: "Atlas Panel",
              type: "graphics",
              parentId: "node_parity_root",
              transform: { x: 260, y: 144, width: 144, height: 72 },
              props: {},
              components: [
                {
                  id: "texture",
                  type: "texture",
                  props: {
                    assetId: "asset_ui_atlas",
                    frame: "button-panel.png",
                    tint: "#ff8844",
                    flipX: true,
                    flipY: false,
                    nineSlice: {
                      left: 12,
                      right: 14,
                      top: 8,
                      bottom: 10,
                    },
                  },
                },
              ],
              children: [],
            },
          ],
        },
      },
    ],
  });
}

export function createHeadlessPixiAdapter() {
  function createContainer(name = "Container") {
    return {
      kind: "container",
      name,
      children: [],
      addChild(child) {
        this.children.push(child);
        child.parent = this;
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((candidate) => candidate !== child);
        child.parent = null;
        return child;
      },
      destroy() {
        this.destroyed = true;
        this.children = [];
      },
    };
  }

  return {
    createContainer,
    createText(props = {}) {
      return {
        kind: "text",
        text: props.text || "",
        style: props.style || {},
        destroy() {
          this.destroyed = true;
        },
      };
    },
    createSprite(props = {}) {
      return {
        kind: "sprite",
        texture: props.texture || null,
        destroy() {
          this.destroyed = true;
        },
      };
    },
  };
}
