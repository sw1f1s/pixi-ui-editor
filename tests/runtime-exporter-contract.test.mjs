import assert from "node:assert/strict";
import test from "node:test";

import { createHeadlessPixiAdapter, createMinimalProjectDocument, createSinglePageProjectDocument } from "./fixtures/sample-project.mjs";
import {
  assertFunction,
  assertJsonSerializable,
  importContractModule,
} from "./helpers/contract-loader.mjs";

const exporterContract = {
  label: "@pixi-ui-editor/exporter",
  candidates: [
    "packages/exporter/src/index.mjs",
    "packages/exporter/src/index.js",
    "packages/exporter/index.mjs",
    "packages/exporter/index.js",
    "packages/exporter/dist/index.mjs",
    "packages/exporter/dist/index.js",
  ],
  requiredExports: ["exportPixiUiBundle"],
};

const runtimeContract = {
  label: "@pixi-ui-editor/runtime",
  candidates: [
    "packages/runtime/src/index.mjs",
    "packages/runtime/src/index.js",
    "packages/runtime/index.mjs",
    "packages/runtime/index.js",
    "packages/runtime/dist/index.mjs",
    "packages/runtime/dist/index.js",
  ],
  requiredExports: ["createPixiUiRuntime"],
};

test("exporter produces a JSON-serializable runtime bundle", async () => {
  const exporter = await importContractModule(exporterContract);
  assertFunction(exporter.exportPixiUiBundle, "exportPixiUiBundle");

  const project = createSinglePageProjectDocument();
  const bundle = await exporter.exportPixiUiBundle(project, {
    profileId: "web",
    includeEditorData: false,
  });

  assert.equal(typeof bundle, "object", "exportPixiUiBundle must return an object");
  assert.notEqual(bundle, null, "exportPixiUiBundle must return an object");
  assert.equal(bundle.schemaVersion, project.schemaVersion);
  assert.equal(typeof bundle.manifest, "object", "bundle.manifest must be an object");
  assert.ok(Array.isArray(bundle.pages), "bundle.pages must be an array");
  assert.ok(bundle.pages.some((page) => page.id === "page_shop"), "bundle should include page_shop");
  assertJsonSerializable(bundle, "runtime bundle");

  const serialized = JSON.stringify(bundle);
  assert.ok(!serialized.includes("editorMeta"), "runtime bundle should not include editor-only metadata");
});

test("exporter preserves Phase 4 design-system manifest data", async () => {
  const exporter = await importContractModule(exporterContract);
  const project = createMinimalProjectDocument({
    tokens: {
      colors: { accent: "#33b8a5" },
      spacing: { sm: 8 },
    },
    themes: [{
      id: "dark",
      name: "Dark",
      tokens: { colors: { accent: "#7dd3fc" } },
    }],
    styleLibraries: [{
      id: "hud",
      name: "HUD",
      tokens: { colors: { panel: "#111827" } },
    }],
    components: [{
      id: "component_badge",
      name: "Badge",
      variants: [{ id: "warning", name: "Warning", overrides: {} }],
      exposedProps: { label: { type: "string" } },
      rootNode: {
        id: "badge_root",
        name: "Badge Root",
        type: "graphics",
        transform: { x: 0, y: 0, width: 120, height: 48 },
        children: [],
      },
    }],
  });
  const bundle = await exporter.exportPixiUiBundle(project, {
    includeEditorData: false,
  });

  assert.deepEqual(bundle.manifest.tokens, project.tokens);
  assert.deepEqual(bundle.manifest.themes, project.themes);
  assert.deepEqual(bundle.manifest.styleLibraries, project.styleLibraries);
  assert.deepEqual(bundle.manifest.components[0].variants, project.components[0].variants);
  assert.deepEqual(bundle.manifest.components[0].exposedProps, project.components[0].exposedProps);
});

test("exporter tracks component asset references in summaries", async () => {
  const exporter = await importContractModule(exporterContract);
  const project = createMinimalProjectDocument({
    assets: [
      {
        id: "asset_panel",
        name: "Panel",
        type: "texture",
        src: "panel.png",
      },
      {
        id: "font_inter",
        name: "Inter",
        type: "font",
        src: "inter.woff2",
      },
    ],
    pages: [
      {
        id: "page_assets",
        name: "Assets",
        canvas: { width: 320, height: 180 },
        root: {
          id: "node_root",
          name: "Root",
          type: "container",
          parentId: null,
          children: [
            {
              id: "node_panel",
              name: "Panel",
              type: "graphics",
              parentId: "node_root",
              transform: { x: 0, y: 0, width: 120, height: 60 },
              components: [
                {
                  id: "texture",
                  type: "texture",
                  props: { assetId: "asset_panel" },
                },
              ],
              children: [],
            },
            {
              id: "node_label",
              name: "Label",
              type: "graphics",
              parentId: "node_root",
              transform: { x: 0, y: 72, width: 120, height: 32 },
              components: [
                {
                  id: "text",
                  type: "text",
                  props: { text: "Play", fontAssetId: "font_inter" },
                },
              ],
              children: [],
            },
          ],
        },
      },
    ],
  });

  const bundle = await exporter.exportPixiUiBundle(project);
  const screen = bundle.manifest.screens.find((entry) => entry.id === "page_assets");

  assert.deepEqual(screen.linkedAssetIds, ["asset_panel", "font_inter"]);
  assert.equal(bundle.manifest.summary.usedAssetCount, 2);
  assert.equal(bundle.manifest.summary.unusedAssetCount, 0);
});

test("exporter and runtime default untyped assets to texture", async () => {
  const exporter = await importContractModule(exporterContract);
  const runtimeModule = await importContractModule(runtimeContract);
  const project = createMinimalProjectDocument({
    assets: [
      {
        id: "asset_untyped",
        name: "Untyped",
        src: "untyped.png",
      },
    ],
  });

  const bundle = await exporter.exportPixiUiBundle(project);
  const normalized = runtimeModule.normalizeRuntimeManifest(bundle.manifest);

  assert.equal(bundle.manifest.assets[0].type, "texture");
  assert.equal(normalized.assets[0].type, "texture");
});

test("runtime mounts an exported bundle through a headless Pixi adapter", async () => {
  const exporter = await importContractModule(exporterContract);
  const runtimeModule = await importContractModule(runtimeContract);
  assertFunction(runtimeModule.createPixiUiRuntime, "createPixiUiRuntime");

  const bundle = await exporter.exportPixiUiBundle(createSinglePageProjectDocument(), {
    profileId: "web",
    includeEditorData: false,
  });
  const adapter = createHeadlessPixiAdapter();
  const stage = adapter.createContainer("stage");

  const runtime = await runtimeModule.createPixiUiRuntime({
    bundle,
    adapter,
    locale: "en",
    theme: "default",
  });

  for (const method of ["mountScreen", "destroy"]) {
    assertFunction(runtime[method], `runtime.${method}`);
  }

  const screen = await runtime.mountScreen("page_shop", {
    container: stage,
    data: {
      coins: 1200,
    },
  });

  for (const method of ["findById", "setState", "updateData", "destroy"]) {
    assertFunction(screen[method], `screen.${method}`);
  }

  assert.ok(stage.children.length > 0, "mountScreen should add display objects to the target container");
  assert.ok(screen.findById("node_root"), "screen.findById must resolve the root node");
  assert.ok(screen.findById("node_title"), "screen.findById must resolve leaf nodes");

  screen.setState("node_title", "highlighted");
  screen.updateData({ coins: 1500 });
  screen.destroy();

  assert.equal(stage.children.length, 0, "screen.destroy should detach mounted display objects");
  runtime.destroy();
});

test("runtime mounts component instances from exported bundles", async () => {
  const exporter = await importContractModule(exporterContract);
  const runtimeModule = await importContractModule(runtimeContract);
  const componentRoot = {
    id: "component_badge_root",
    name: "Badge Root",
    type: "container",
    parentId: null,
    transform: { x: 0, y: 0, width: 180, height: 72 },
    children: [
      {
        id: "component_badge_label",
        name: "Badge Label",
        type: "graphics",
        parentId: "component_badge_root",
        transform: { x: 12, y: 10, width: 140, height: 40 },
        props: {},
        components: [
          {
            id: "text",
            type: "text",
            props: { text: "Badge" },
          },
        ],
        children: [],
      },
    ],
  };
  const project = createMinimalProjectDocument({
    components: [
      {
        id: "component_badge",
        name: "Badge",
        rootNode: componentRoot,
      },
    ],
    pages: [
      {
        id: "page_components",
        name: "Components",
        canvas: { width: 800, height: 600 },
        root: {
          id: "page_components_root",
          name: "Root",
          type: "container",
          parentId: null,
          transform: { x: 0, y: 0, width: 800, height: 600 },
          children: [
            {
              id: "node_badge_instance",
              name: "Badge Instance",
              type: "componentInstance",
              parentId: "page_components_root",
              transform: { x: 32, y: 32, width: 180, height: 72 },
              props: { componentId: "component_badge" },
              children: [],
            },
          ],
        },
      },
    ],
  });

  const bundle = await exporter.exportPixiUiBundle(project, {
    includeEditorData: false,
  });
  const adapter = createHeadlessPixiAdapter();
  const stage = adapter.createContainer("stage");
  const runtime = await runtimeModule.createPixiUiRuntime({ bundle, adapter });
  const screen = await runtime.mountScreen("page_components", { container: stage });

  assert.ok(screen.findById("node_badge_instance"));
  assert.ok(screen.findById("node_badge_instance:component_badge_label"));
  assert.ok(screen.findById("component_badge_label"), "source ids should resolve component children");

  screen.destroy();
  runtime.destroy();
});

test("pixi adapter maps editor text props into Pixi TextStyle", async () => {
  const runtimeModule = await importContractModule(runtimeContract);
  assertFunction(runtimeModule.createPixiLikeAdapter, "createPixiLikeAdapter");

  class Container {}
  class Text {
    constructor(input, fallbackStyle = {}) {
      if (typeof input === "object" && input !== null) {
        this.text = input.text || "";
        this.style = input.style || {};
      } else {
        this.text = input || "";
        this.style = fallbackStyle;
      }
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({ Container, Text });
  const textNode = {
    type: "text",
    transform: {
      x: 0,
      y: 0,
      width: 180,
      height: 80,
    },
    style: {},
    props: {
      text: "Hello",
      fontFamily: "Inter",
      fontSize: 20,
      fill: "#ffffff",
      align: "center",
      verticalAlign: "middle",
      lineHeight: 1.5,
      wrap: true,
    },
  };

  const displayObject = adapter.createText({ text: "Hello", node: textNode });

  assert.equal(displayObject.style.fontFamily, "Inter");
  assert.equal(displayObject.style.fontSize, 20);
  assert.equal(displayObject.style.fill, "#ffffff");
  assert.equal(displayObject.style.align, "center");
  assert.equal(displayObject.style.lineHeight, 30);
  assert.equal(displayObject.style.wordWrap, true);
  assert.equal(displayObject.style.wordWrapWidth, 180);

  adapter.setProps(displayObject, { ...textNode.props, align: "right", wrap: false }, {
    ...textNode,
    transform: {
      ...textNode.transform,
      width: 240,
    },
    props: {
      ...textNode.props,
      align: "right",
      wrap: false,
    },
  });

  assert.equal(displayObject.style.align, "right");
  assert.equal(displayObject.style.wordWrap, false);
  assert.equal(displayObject.style.wordWrapWidth, 240);
});

test("pixi adapter applies graphics style and vertical text alignment", async () => {
  const runtimeModule = await importContractModule(runtimeContract);
  assertFunction(runtimeModule.createPixiLikeAdapter, "createPixiLikeAdapter");

  class Container {}
  class Graphics {
    constructor() {
      this.ops = [];
    }
    clear() {
      this.ops.push(["clear"]);
      return this;
    }
    roundRect(x, y, width, height, radius) {
      this.ops.push(["roundRect", x, y, width, height, radius]);
      return this;
    }
    fill(options) {
      this.ops.push(["fill", options]);
      return this;
    }
    stroke(options) {
      this.ops.push(["stroke", options]);
      return this;
    }
  }
  class Text {
    constructor(input) {
      this.text = input.text || "";
      this.style = input.style || {};
      this.anchor = { set: (x, y) => { this.anchorValue = { x, y }; } };
      this.pivot = { set: (x, y) => { this.pivotValue = { x, y }; } };
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({ Container, Graphics, Text });
  const graphicsNode = {
    type: "graphics",
    transform: { x: 4, y: 8, width: 120, height: 48 },
    style: { fill: "#204060", stroke: "#ffffff", strokeWidth: 4, radius: 12 },
    props: { shape: "roundedRect" },
  };
  const graphics = adapter.createGraphics({ node: graphicsNode });
  adapter.setTransform(graphics, graphicsNode.transform, graphicsNode);
  adapter.setStyle(graphics, graphicsNode.style, graphicsNode);
  adapter.setProps(graphics, graphicsNode.props, graphicsNode);

  assert.ok(graphics.ops.some((op) => op[0] === "roundRect" && op[3] === 120 && op[4] === 48 && op[5] === 12));
  assert.ok(graphics.ops.some((op) => op[0] === "fill" && op[1].color === 0x204060));
  assert.ok(graphics.ops.some((op) => op[0] === "stroke" && op[1].color === 0xffffff && op[1].width === 4));

  const textNode = {
    type: "text",
    transform: { x: 0, y: 10, width: 160, height: 60 },
    props: {
      text: "Aligned",
      fontSize: 20,
      lineHeight: 1,
      verticalAlign: "bottom",
      anchor: { x: 0.5, y: 0.5 },
      pivotAnchor: "center",
    },
  };
  const text = adapter.createText({ text: "Aligned", node: textNode });
  adapter.setTransform(text, textNode.transform, textNode);
  adapter.setProps(text, textNode.props, textNode);
  adapter.setText(text, "Aligned", textNode);

  assert.equal(text.style.verticalAlign, "bottom");
  assert.equal(text.y, 50);
  assert.deepEqual(text.anchorValue, { x: 0.5, y: 0.5 });
  assert.deepEqual(text.pivotValue, { x: 80, y: 30 });
});

test("pixi adapter maps shadow and outline effects to text style and sprite filters", async () => {
  const runtimeModule = await importContractModule(runtimeContract);
  assertFunction(runtimeModule.createPixiLikeAdapter, "createPixiLikeAdapter");

  class Container {}
  class Sprite {
    constructor(texture) {
      this.texture = texture;
    }
  }
  class Text {
    constructor(input) {
      this.text = input.text || "";
      this.style = input.style || {};
    }
  }
  class DropShadowFilter {
    constructor(options) {
      this.options = options;
    }
  }
  class OutlineFilter {
    constructor(options) {
      this.options = options;
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({
    Container,
    Sprite,
    Text,
    DropShadowFilter,
    OutlineFilter,
    Texture: {
      EMPTY: { empty: true },
      from: (src) => ({ src, width: 64, height: 64 }),
    },
  });
  const effects = {
    shadow: { color: "#000000", alpha: 0.5, blur: 8, offsetX: 2, offsetY: 6 },
    outline: { color: "#ffcc00", alpha: 0.75, width: 3 },
  };
  const textNode = {
    type: "text",
    transform: { width: 160, height: 48 },
    props: { text: "FX", fontSize: 24, fill: "#ffffff", ...effects },
  };
  const text = adapter.createText({ text: "FX", node: textNode });
  adapter.setProps(text, textNode.props, textNode);

  assert.equal(text.style.stroke.width, 3);
  assert.equal(text.style.stroke.color, "#ffcc00");
  assert.equal(text.style.dropShadow.blur, 8);

  const spriteNode = {
    type: "sprite",
    transform: { width: 64, height: 64 },
    props: { assetId: "asset_icon", ...effects },
  };
  const sprite = adapter.createSprite({ asset: { id: "asset_icon", src: "icon.png" }, node: spriteNode });
  adapter.setProps(sprite, spriteNode.props, spriteNode);

  assert.equal(sprite.filters.length, 2);
  assert.ok(sprite.filters.every((filter) => filter.__pixiUiEditorEffectFilter));
});

test("runtime preloads assets and resolves sprite atlas frames", async () => {
  const exporter = await importContractModule(exporterContract);
  const runtimeModule = await importContractModule(runtimeContract);
  assertFunction(runtimeModule.loadRuntimeAssets, "loadRuntimeAssets");

  const project = createMinimalProjectDocument({
    assets: [
      {
        id: "asset_atlas",
        name: "HUD Atlas",
        type: "spriteAtlas",
        src: "assets/hud.png",
        frames: {
          "coin.png": {
            x: 4,
            y: 8,
            width: 32,
            height: 32,
            nineSlice: {
              left: 4,
              right: 6,
              top: 5,
              bottom: 7,
            },
          },
        },
      },
      {
        id: "asset_font",
        name: "Hud Font",
        type: "font",
        src: "assets/hud.woff2",
        family: "HudFont",
      },
    ],
    pages: [
      {
        id: "page_assets",
        name: "Assets",
        canvas: { width: 320, height: 240 },
        root: {
          id: "page_assets_root",
          name: "Root",
          type: "container",
          parentId: null,
          transform: { x: 0, y: 0, width: 320, height: 240 },
          children: [
            {
              id: "node_coin",
              name: "Coin",
              type: "graphics",
              parentId: "page_assets_root",
              transform: { x: 12, y: 16, width: 32, height: 32 },
              props: {},
              components: [
                {
                  id: "texture",
                  type: "texture",
                  props: { assetId: "asset_atlas", frame: "coin.png" },
                },
              ],
              children: [],
            },
          ],
        },
      },
    ],
  });

  const bundle = await exporter.exportPixiUiBundle(project, { includeEditorData: false });
  assert.deepEqual(bundle.manifest.assets[0].frames["coin.png"], {
    x: 4,
    y: 8,
    width: 32,
    height: 32,
    nineSlice: {
      left: 4,
      right: 6,
      top: 5,
      bottom: 7,
    },
  });
  assert.equal(bundle.manifest.assets[1].family, "HudFont");

  const adapter = createHeadlessPixiAdapter();
  adapter.loadTexture = async (asset) => ({ loadedTextureFor: asset.id, src: asset.src });
  const runtime = await runtimeModule.createPixiUiRuntime({
    bundle,
    adapter,
    loadFont: async (asset) => ({ loadedFontFor: asset.id }),
  });
  const stage = adapter.createContainer("stage");
  const screen = await runtime.mountScreen("page_assets", { container: stage });
  const sprite = screen.findById("node_coin#texture").displayObject;

  assert.equal(runtime.assetLoadResult.errors.length, 0);
  assert.equal(sprite.texture.frameName, "coin.png");
  assert.deepEqual(sprite.texture.frame, {
    x: 4,
    y: 8,
    width: 32,
    height: 32,
    nineSlice: {
      left: 4,
      right: 6,
      top: 5,
      bottom: 7,
    },
  });
  assert.deepEqual(sprite.props.nineSlice, {
    left: 4,
    right: 6,
    top: 5,
    bottom: 7,
  });

  screen.destroy();
  runtime.destroy();
});

test("runtime applies texture-level nine-slice defaults", async () => {
  const exporter = await importContractModule(exporterContract);
  const runtimeModule = await importContractModule(runtimeContract);
  const nineSlice = { left: 6, right: 8, top: 4, bottom: 10 };
  const project = createMinimalProjectDocument({
    assets: [
      {
        id: "asset_panel",
        name: "Panel",
        type: "texture",
        src: "assets/panel.png",
        nineSlice,
      },
    ],
    pages: [
      {
        id: "page_texture_slice",
        name: "Texture Slice",
        canvas: { width: 320, height: 240 },
        root: {
          id: "page_texture_slice_root",
          name: "Root",
          type: "container",
          parentId: null,
          transform: { x: 0, y: 0, width: 320, height: 240 },
          children: [
            {
              id: "node_panel",
              name: "Panel",
              type: "graphics",
              parentId: "page_texture_slice_root",
              transform: { x: 20, y: 24, width: 180, height: 72 },
              props: {},
              components: [
                {
                  id: "texture",
                  type: "texture",
                  props: { assetId: "asset_panel" },
                },
              ],
              children: [],
            },
          ],
        },
      },
    ],
  });

  const bundle = await exporter.exportPixiUiBundle(project, { includeEditorData: false });
  assert.deepEqual(bundle.manifest.assets[0].nineSlice, nineSlice);

  const adapter = createHeadlessPixiAdapter();
  adapter.loadTexture = async (asset) => ({ loadedTextureFor: asset.id, src: asset.src });
  const runtime = await runtimeModule.createPixiUiRuntime({ bundle, adapter });
  const stage = adapter.createContainer("stage");
  const screen = await runtime.mountScreen("page_texture_slice", { container: stage });
  const sprite = screen.findById("node_panel#texture").displayObject;

  assert.deepEqual(sprite.props.nineSlice, nineSlice);

  screen.destroy();
  runtime.destroy();
});

test("runtime scales default nine-slice with pixels-per-unit multiplier", async () => {
  const exporter = await importContractModule(exporterContract);
  const runtimeModule = await importContractModule(runtimeContract);
  const project = createMinimalProjectDocument({
    assets: [
      {
        id: "asset_panel_scaled",
        name: "Scaled Panel",
        type: "texture",
        src: "assets/panel-scaled.png",
        nineSlice: { left: 6, right: 8, top: 4, bottom: 10 },
      },
    ],
    pages: [
      {
        id: "page_texture_slice_scaled",
        name: "Texture Slice Scaled",
        canvas: { width: 320, height: 240 },
        root: {
          id: "page_texture_slice_scaled_root",
          name: "Root",
          type: "container",
          parentId: null,
          transform: { x: 0, y: 0, width: 320, height: 240 },
          children: [
            {
              id: "node_panel_scaled",
              name: "Panel",
              type: "graphics",
              parentId: "page_texture_slice_scaled_root",
              transform: { x: 20, y: 24, width: 180, height: 72 },
              props: {},
              components: [
                {
                  id: "texture",
                  type: "texture",
                  props: {
                    assetId: "asset_panel_scaled",
                    pixelsPerUnitMultiplier: 2,
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

  const bundle = await exporter.exportPixiUiBundle(project, { includeEditorData: false });
  const adapter = createHeadlessPixiAdapter();
  adapter.loadTexture = async (asset) => ({ loadedTextureFor: asset.id, src: asset.src });
  const runtime = await runtimeModule.createPixiUiRuntime({ bundle, adapter });
  const stage = adapter.createContainer("stage");
  const screen = await runtime.mountScreen("page_texture_slice_scaled", { container: stage });
  const sprite = screen.findById("node_panel_scaled#texture").displayObject;

  assert.deepEqual(sprite.props.nineSlice, {
    left: 12,
    right: 16,
    top: 8,
    bottom: 20,
  });

  screen.destroy();
  runtime.destroy();
});

test("pixi adapter creates nine-slice sprites when requested", async () => {
  const runtimeModule = await importContractModule(runtimeContract);

  class Container {}
  class Sprite {
    constructor(texture) {
      this.texture = texture;
    }
  }
  class NineSliceSprite {
    constructor(input) {
      this.input = input;
      this.texture = input.texture;
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({
    Container,
    Sprite,
    NineSliceSprite,
    Texture: {
      EMPTY: { empty: true },
      from: (src) => ({ src }),
    },
  });
  const displayObject = adapter.createSprite({
    asset: { id: "button", src: "button.png" },
    node: {
      type: "sprite",
      transform: { width: 180, height: 64 },
      props: { nineSlice: 12 },
    },
  });

  assert.ok(displayObject instanceof NineSliceSprite);
  assert.equal(displayObject.input.leftWidth, 12);
  assert.equal(displayObject.input.rightWidth, 12);
  assert.equal(displayObject.input.width, 180);
});

test("pixi adapter creates tiled sprites when requested", async () => {
  const runtimeModule = await importContractModule(runtimeContract);

  class Container {}
  class Sprite {
    constructor(texture) {
      this.texture = texture;
    }
  }
  class TilingSprite {
    constructor(input, width, height) {
      if (input?.texture) {
        this.input = input;
        this.texture = input.texture;
        this.width = input.width;
        this.height = input.height;
      } else {
        this.texture = input;
        this.width = width;
        this.height = height;
      }
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({
    Container,
    Sprite,
    TilingSprite,
    Texture: {
      EMPTY: { empty: true },
      from: (src) => ({ src, width: 32, height: 32 }),
    },
  });
  const displayObject = adapter.createSprite({
    asset: { id: "tile", src: "tile.png" },
    node: {
      type: "sprite",
      transform: { width: 180, height: 64 },
      props: { textureType: "tiled" },
    },
  });

  assert.ok(displayObject instanceof TilingSprite);
  assert.equal(displayObject.texture.src, "tile.png");
  assert.equal(displayObject.width, 180);
  assert.equal(displayObject.height, 64);
});

test("pixi adapter applies editor sprite object fit", async () => {
  const runtimeModule = await importContractModule(runtimeContract);

  class Container {}
  class Sprite {
    constructor(texture) {
      this.texture = texture;
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({
    Container,
    Sprite,
    Texture: {
      EMPTY: { empty: true },
      from: (src) => ({ src, width: 200, height: 100 }),
    },
  });
  const node = {
    type: "sprite",
    transform: { x: 10, y: 20, width: 100, height: 100 },
    props: { objectFit: "contain" },
  };
  const displayObject = adapter.createSprite({
    asset: { id: "wide", src: "wide.png", width: 200, height: 100 },
    node,
  });
  adapter.setTransform(displayObject, node.transform, node);
  adapter.setProps(displayObject, node.props, node);
  adapter.setTexture(displayObject, { id: "wide", src: "wide.png", width: 200, height: 100 });

  assert.equal(displayObject.x, 10);
  assert.equal(displayObject.y, 45);
  assert.equal(displayObject.width, 100);
  assert.equal(displayObject.height, 50);
});

test("pixi adapter applies texture tint and flip props", async () => {
  const runtimeModule = await importContractModule(runtimeContract);

  class Container {}
  class Sprite {
    constructor(texture) {
      this.texture = texture;
      this.scale = { x: 1, y: 1 };
    }
  }

  const adapter = runtimeModule.createPixiLikeAdapter({
    Container,
    Sprite,
    Texture: {
      EMPTY: { empty: true },
      from: (src) => ({ src, width: 200, height: 100 }),
    },
  });
  const node = {
    type: "sprite",
    transform: { x: 10, y: 20, width: 100, height: 100 },
    props: { objectFit: "contain", tint: "#336699", flipX: true, flipY: true },
  };
  const displayObject = adapter.createSprite({
    asset: { id: "wide", src: "wide.png", width: 200, height: 100 },
    node,
  });
  adapter.setTransform(displayObject, node.transform, node);
  adapter.setProps(displayObject, node.props, node);
  adapter.setTexture(displayObject, { id: "wide", src: "wide.png", width: 200, height: 100 });

  assert.equal(displayObject.tint, 0x336699);
  assert.equal(displayObject.x, 110);
  assert.equal(displayObject.y, 95);
  assert.equal(displayObject.width, 100);
  assert.equal(displayObject.height, 50);
  assert.equal(displayObject.scale.x < 0, true);
  assert.equal(displayObject.scale.y < 0, true);

  const tiledProps = { textureType: "tiled", tint: "#ffffff", flipX: false, flipY: false };
  adapter.setProps(displayObject, tiledProps, { ...node, props: tiledProps });
  assert.equal(displayObject.x, 10);
  assert.equal(displayObject.y, 20);
  assert.equal(displayObject.width, 100);
  assert.equal(displayObject.height, 100);
  assert.equal(displayObject.scale.x > 0, true);
  assert.equal(displayObject.scale.y > 0, true);
});
