import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { createRuntimeParityProjectDocument } from "./fixtures/sample-project.mjs";
import {
  assertFunction,
  importContractModule,
  repoPath,
} from "./helpers/contract-loader.mjs";

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
  requiredExports: ["buildRenderTreeNode", "createManifestIndexes", "createPlainPixiAdapter"],
};

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

const rendererFactoryCandidates = [
  "packages/renderer/src/index.mjs",
  "packages/renderer/src/index.js",
  "packages/renderer/index.mjs",
  "packages/renderer/index.js",
  "packages/renderer/dist/index.mjs",
  "packages/renderer/dist/index.js",
  "packages/runtime/src/index.mjs",
  "packages/runtime/src/index.js",
  "packages/runtime/index.mjs",
  "packages/runtime/index.js",
  "packages/runtime/dist/index.mjs",
  "packages/runtime/dist/index.js",
];

const rendererFactoryExportNames = [
  "createRendererFactory",
  "createRuntimeRendererFactory",
  "createPixiUiRendererFactory",
];

test("runtime render tree preserves Phase 2 editor props through node components", async () => {
  const runtime = await importContractModule(runtimeContract);
  const exporter = await importContractModule(exporterContract);

  for (const exportName of runtimeContract.requiredExports) {
    assertFunction(runtime[exportName], exportName);
  }

  const project = createRuntimeParityProjectDocument();
  const bundle = await exporter.exportPixiUiBundle(project, { includeEditorData: false });
  const screen = bundle.pages.find((candidate) => candidate.id === "page_runtime_parity");
  const manifest = bundle.manifest;
  const indexes = runtime.createManifestIndexes(manifest);
  const adapter = runtime.createPlainPixiAdapter();
  const context = {
    adapter,
    manifest,
    assetsById: indexes.assetsById,
    componentsById: indexes.componentsById,
    data: {},
    stateByNodeId: new Map(),
  };

  const renderTree = runtime.buildRenderTreeNode(screen.rootNode, context, {
    path: screen.id,
    fallbackId: `${screen.id}.root`,
  });
  const nodes = flattenRenderTree(renderTree);

  const button = findById(nodes, "node_cta_button");
  assert.equal(button.displayObject.kind, "Container");
  assert.equal(button.displayObject.props.cursor, "pointer");

  const buttonFill = findById(nodes, "node_cta_button#fill");
  assert.equal(buttonFill.displayObject.kind, "Graphics");
  assert.deepEqual(pick(buttonFill.displayObject.props, ["fill", "stroke", "strokeWidth", "radius", "pressedFill"]), {
    fill: "#1f8fff",
    stroke: "#0b376d",
    strokeWidth: 3,
    radius: 14,
    pressedFill: "#166dcc",
  });

  const graphics = findById(nodes, "node_panel_shape#fill");
  assert.equal(graphics.displayObject.kind, "Graphics");
  assert.deepEqual(pick(graphics.displayObject.props, ["fill", "stroke", "strokeWidth", "radius"]), {
    fill: "#111827",
    stroke: "#f8c452",
    strokeWidth: 2,
    radius: 10,
  });

  const text = findById(nodes, "node_centered_label#text");
  assert.equal(text.displayObject.kind, "Text");
  assert.equal(text.displayObject.text, "Centered");
  assert.deepEqual(pick(text.displayObject.props, ["align", "verticalAlign", "anchor", "pivotAnchor"]), {
    align: "center",
    verticalAlign: "middle",
    anchor: { x: 0.5, y: 0.5 },
    pivotAnchor: "center",
  });

  const sprite = findById(nodes, "node_atlas_panel#texture");
  assert.equal(sprite.displayObject.kind, "Sprite");
  assert.equal(sprite.displayObject.texture.id, "asset_ui_atlas");
  assert.equal(sprite.displayObject.texture.frameName, "button-panel.png");
  assert.deepEqual(sprite.displayObject.texture.frame, {
    x: 8,
    y: 12,
    width: 96,
    height: 48,
  });
  assert.deepEqual(sprite.displayObject.props.nineSlice, {
    left: 12,
    right: 14,
    top: 8,
    bottom: 10,
  });
  assert.deepEqual(pick(sprite.displayObject.props, ["tint", "flipX", "flipY"]), {
    tint: "#ff8844",
    flipX: true,
    flipY: false,
  });
});

test("shared renderer factory uses the same render tree builder when exported", async (t) => {
  const factoryModule = await importOptionalRendererFactoryModule();
  if (!factoryModule) {
    t.skip("No shared renderer factory is exported yet.");
    return;
  }

  const runtime = await importContractModule(runtimeContract);
  const exporter = await importContractModule(exporterContract);
  const factoryName = rendererFactoryExportNames.find((name) => typeof factoryModule[name] === "function");
  assert.ok(factoryName, `renderer factory must export one of: ${rendererFactoryExportNames.join(", ")}`);

  const project = createRuntimeParityProjectDocument();
  const bundle = await exporter.exportPixiUiBundle(project, { includeEditorData: false });
  const screen = bundle.pages.find((candidate) => candidate.id === "page_runtime_parity");
  const manifest = bundle.manifest;
  const directAdapter = runtime.createPlainPixiAdapter();
  const factoryAdapter = runtime.createPlainPixiAdapter();
  const indexes = runtime.createManifestIndexes(manifest);
  const baseContext = {
    manifest,
    assetsById: indexes.assetsById,
    componentsById: indexes.componentsById,
    data: {},
    stateByNodeId: new Map(),
  };
  const options = {
    path: screen.id,
    fallbackId: `${screen.id}.root`,
  };

  const directTree = runtime.buildRenderTreeNode(screen.rootNode, {
    ...baseContext,
    adapter: directAdapter,
  }, options);
  const rendererFactory = factoryModule[factoryName];
  const renderer = rendererFactory({
    manifest,
    adapter: factoryAdapter,
    buildRenderTreeNode: runtime.buildRenderTreeNode,
  });
  const renderTree = await renderWithFactory(renderer, screen.rootNode, {
    ...baseContext,
    adapter: factoryAdapter,
  }, options);

  assert.deepEqual(summarizeRenderTree(renderTree), summarizeRenderTree(directTree));
});

test("runtime renders component-backed graphics as a composed container", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const rootNode = {
    id: "node_root",
    name: "Root",
    type: "container",
    parentId: null,
    transform: { x: 0, y: 0, width: 320, height: 200 },
    props: {},
    children: [
      {
        id: "node_composed_card",
        name: "Composed Card",
        type: "graphics",
        parentId: "node_root",
        transform: { x: 20, y: 30, width: 180, height: 72 },
        props: {},
        components: [
          {
            id: "fill",
            type: "fill",
            props: { fill: "#223344", radius: 12 },
          },
          {
            id: "icon",
            type: "texture",
            props: { assetId: "asset_icon", objectFit: "contain" },
          },
          {
            id: "label",
            type: "text",
            props: { text: "READY", fill: "#ffffff", align: "center", verticalAlign: "middle" },
          },
          {
            id: "button",
            type: "button",
            props: {},
          },
        ],
        children: [],
      },
    ],
  };
  const context = {
    adapter,
    manifest: {},
    assetsById: new Map([["asset_icon", { id: "asset_icon", type: "texture", src: "assets/icon.png" }]]),
    componentsById: new Map(),
    data: {},
    stateByNodeId: new Map(),
  };

  const renderTree = runtime.buildRenderTreeNode(rootNode, context, {
    path: "page_component_runtime",
    fallbackId: "page_component_runtime.root",
  });
  const nodes = flattenRenderTree(renderTree);
  const card = findById(nodes, "node_composed_card");
  const fill = findById(nodes, "node_composed_card#fill");
  const icon = findById(nodes, "node_composed_card#icon");
  const label = findById(nodes, "node_composed_card#label");

  assert.equal(card.displayObject.kind, "Container");
  assert.equal(card.displayObject.props.cursor, "pointer");
  assert.equal(fill.displayObject.kind, "Graphics");
  assert.equal(fill.displayObject.props.fill, "#223344");
  assert.equal(icon.displayObject.kind, "Sprite");
  assert.equal(icon.displayObject.texture.id, "asset_icon");
  assert.equal(label.displayObject.kind, "Text");
  assert.equal(label.displayObject.text, "READY");
  assert.deepEqual(label.displayObject.transform, {
    x: 0,
    y: 0,
    width: 180,
    height: 72,
    alpha: 1,
    rotation: 0,
    scale: { x: 1, y: 1 },
    pivot: { x: 0, y: 0 },
  });
});

test("runtime applies shadow and outline components to every render component", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const renderTree = runtime.buildRenderTreeNode({
    id: "node_effects",
    name: "Effects",
    type: "graphics",
    transform: { x: 0, y: 0, width: 180, height: 72 },
    components: [
      { id: "fill", type: "fill", props: { fill: "#223344", radius: 8 } },
      { id: "text", type: "text", props: { text: "FX", fill: "#ffffff", fontSize: 24 } },
      { id: "shadow", type: "shadow", props: { color: "#000000", alpha: 0.5, blur: 10, offsetX: 2, offsetY: 4 } },
      { id: "outline", type: "outline", props: { color: "#ffcc00", alpha: 0.8, width: 3 } },
    ],
    children: [],
  }, {
    adapter,
    manifest: {},
    assetsById: new Map(),
    componentsById: new Map(),
    data: {},
    stateByNodeId: new Map(),
  }, {
    path: "page_effects",
    fallbackId: "page_effects.root",
  });
  const nodes = flattenRenderTree(renderTree);
  const fill = findById(nodes, "node_effects#fill");
  const text = findById(nodes, "node_effects#text");

  assert.deepEqual(fill.displayObject.props.shadow, {
    color: "#000000",
    alpha: 0.5,
    blur: 10,
    offsetX: 2,
    offsetY: 4,
  });
  assert.deepEqual(text.displayObject.props.outline, {
    color: "#ffcc00",
    alpha: 0.8,
    width: 3,
  });
});

test("runtime preserves Phase 4 controls and resolves tokens, themes, and variants", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const manifest = {
    tokens: {
      colors: {
        accent: "#0ea5e9",
      },
    },
    styleLibraries: [{
      id: "library_core",
      tokens: {
        colors: {
          track: "#e5e7eb",
        },
      },
    }],
    themes: [{
      id: "dark",
      tokens: {
        colors: {
          accent: "#f59e0b",
        },
      },
    }],
    components: [{
      id: "component_meter",
      name: "Meter",
      variants: [{
        id: "warning",
        overrides: {
          meter_fill: {
            components: [{
              id: "fill",
              type: "fill",
              props: { fill: "{colors.accent}" },
            }],
          },
        },
      }],
      rootNode: {
        id: "meter_root",
        name: "Meter Root",
        type: "graphics",
        transform: { x: 0, y: 0, width: 200, height: 32 },
        components: [
          { id: "progress", type: "progressBar", props: { value: 25, min: 0, max: 100, trackFill: "{colors.track}" } },
          { id: "toggle", type: "toggle", props: { checked: true } },
          { id: "mask", type: "mask", props: { shape: "rect", radius: 8 } },
          { id: "repeater", type: "repeater", props: { dataPath: "rows" } },
        ],
        children: [{
          id: "meter_fill",
          name: "Meter Fill",
          type: "graphics",
          parentId: "meter_root",
          transform: { x: 0, y: 0, width: 200, height: 32 },
          components: [{
            id: "fill",
            type: "fill",
            props: { fill: "$colors.accent" },
          }],
          children: [],
        }],
      },
    }],
  };
  const indexes = runtime.createManifestIndexes({
    ...manifest,
    screens: [],
    assets: [],
  });
  const renderTree = runtime.buildRenderTreeNode({
    id: "node_meter_instance",
    name: "Meter Instance",
    type: "componentInstance",
    transform: { x: 0, y: 0, width: 200, height: 32 },
    props: { componentId: "component_meter", variant: "warning" },
    children: [],
  }, {
    adapter,
    manifest,
    assetsById: new Map(),
    componentsById: indexes.componentsById,
    data: {},
    stateByNodeId: new Map(),
    theme: "dark",
  }, {
    path: "page_phase4",
    fallbackId: "page_phase4.root",
  });
  const nodes = flattenRenderTree(renderTree);
  const root = findById(nodes, "node_meter_instance:meter_root");
  const progress = findById(nodes, "node_meter_instance:meter_root#progress");
  const fill = findById(nodes, "node_meter_instance:meter_fill#fill");

  assert.equal(root.displayObject.props.controls.toggle.checked, true);
  assert.equal(root.displayObject.props.controls.mask.radius, 8);
  assert.equal(root.displayObject.props.controls.repeater.dataPath, "rows");
  assert.equal(progress.displayObject.props.progress, 0.25);
  assert.equal(progress.displayObject.props.trackFill, "#e5e7eb");
  assert.equal(fill.displayObject.props.fill, "#f59e0b");
});

test("runtime applies component exposed props to component instance internals", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const manifest = {
    components: [{
      id: "component_badge",
      name: "Badge",
      exposedProps: {
        label: {
          type: "string",
          path: "badge_label.components.text.props.text",
        },
        accent: {
          type: "color",
          nodeId: "badge_fill",
          component: "fill",
          prop: "fill",
        },
      },
      rootNode: {
        id: "badge_root",
        name: "Badge Root",
        type: "container",
        transform: { x: 0, y: 0, width: 180, height: 56 },
        children: [
          {
            id: "badge_fill",
            name: "Badge Fill",
            type: "graphics",
            transform: { x: 0, y: 0, width: 180, height: 56 },
            components: [{ id: "fill", type: "fill", props: { fill: "#111827", radius: 12 } }],
            children: [],
          },
          {
            id: "badge_label",
            name: "Badge Label",
            type: "graphics",
            transform: { x: 0, y: 0, width: 180, height: 56 },
            components: [{ id: "text", type: "text", props: { text: "Default", fill: "#ffffff" } }],
            children: [],
          },
        ],
      },
    }],
  };
  const indexes = runtime.createManifestIndexes({
    ...manifest,
    screens: [],
    assets: [],
  });
  const renderTree = runtime.buildRenderTreeNode({
    id: "badge_instance",
    name: "Badge Instance",
    type: "componentInstance",
    transform: { x: 0, y: 0, width: 180, height: 56 },
    props: {
      componentId: "component_badge",
      label: "Ready",
      accent: "#33b8a5",
    },
    children: [],
  }, {
    adapter,
    manifest,
    assetsById: new Map(),
    componentsById: indexes.componentsById,
    data: {},
    stateByNodeId: new Map(),
  }, {
    path: "page_exposed_props",
    fallbackId: "page_exposed_props.root",
  });
  const nodes = flattenRenderTree(renderTree);

  assert.equal(findById(nodes, "badge_instance:badge_label#text").displayObject.text, "Ready");
  assert.equal(findById(nodes, "badge_instance:badge_fill#fill").displayObject.props.fill, "#33b8a5");
});

test("runtime syncs control state to child parts with fill or texture skins", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const renderTree = runtime.buildRenderTreeNode({
    id: "control_root",
    name: "Control Root",
    type: "container",
    transform: { x: 0, y: 0, width: 400, height: 400 },
    children: [
      {
        id: "toggle_control",
        name: "Toggle",
        type: "graphics",
        transform: { x: 0, y: 0, width: 120, height: 44 },
        components: [
          { id: "toggle", type: "toggle", props: { checked: false, onFill: "#00ff00", offFill: "#222222", knobFill: "#ffffff" } },
          { id: "track_texture", type: "texture", props: { assetId: "asset_track", tint: "#00ff00" } },
        ],
        children: [{
          id: "toggle_thumb",
          name: "Thumb",
          type: "graphics",
          transform: { x: 82, y: 8, width: 28, height: 28 },
          editorMeta: { controlPart: "toggleThumb" },
          components: [
            { id: "thumb_texture", type: "texture", props: { assetId: "asset_thumb", tint: "#cccccc" } },
          ],
          children: [],
        }],
      },
      {
        id: "slider_control",
        name: "Slider",
        type: "graphics",
        transform: { x: 0, y: 60, width: 200, height: 40 },
        components: [
          { id: "slider", type: "slider", props: { min: 0, max: 100, value: 25, trackFill: "#111111", fill: "#33b8a5", thumbFill: "#eeeeee" } },
          { id: "track", type: "texture", props: { assetId: "asset_track", tint: "#111111" } },
        ],
        children: [
          {
            id: "slider_fill",
            name: "Value Fill",
            type: "graphics",
            transform: { x: 0, y: 10, width: 10, height: 20 },
            editorMeta: { controlPart: "sliderFill" },
            components: [
              { id: "fill_texture", type: "texture", props: { assetId: "asset_track", tint: "#ffffff" } },
            ],
            children: [],
          },
          {
            id: "slider_thumb",
            name: "Thumb",
            type: "graphics",
            transform: { x: 0, y: 0, width: 20, height: 20 },
            editorMeta: { controlPart: "sliderThumb" },
            components: [
              { id: "thumb_texture", type: "texture", props: { assetId: "asset_thumb", tint: "#ffffff" } },
            ],
            children: [],
          },
        ],
      },
      {
        id: "checkbox_control",
        name: "Checkbox",
        type: "graphics",
        transform: { x: 0, y: 120, width: 120, height: 40 },
        components: [
          { id: "checkbox", type: "checkbox", props: { checked: false, checkFill: "#33b8a5", boxFill: "#151922", stroke: "#59657a" } },
        ],
        children: [
          {
            id: "checkbox_box",
            name: "Box",
            type: "graphics",
            transform: { x: 0, y: 0, width: 40, height: 40 },
            editorMeta: { controlPart: "checkboxBox" },
            components: [
              { id: "box_texture", type: "texture", props: { assetId: "asset_track", tint: "#ffffff" } },
            ],
            children: [
              {
                id: "checkbox_check",
                name: "Check",
                type: "graphics",
                transform: { x: 0, y: 0, width: 40, height: 40 },
                editorMeta: { controlPart: "checkboxCheck" },
                components: [
                  { id: "check_texture", type: "texture", props: { assetId: "asset_thumb", tint: "#ffffff" } },
                ],
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "progress_control",
        name: "Progress",
        type: "graphics",
        transform: { x: 0, y: 180, width: 240, height: 24 },
        components: [
          { id: "progress", type: "progressBar", props: { min: 0, max: 100, value: 75, trackFill: "#222222", fill: "#ffcc00" } },
        ],
        children: [{
          id: "progress_fill",
          name: "Value Fill",
          type: "graphics",
          transform: { x: 0, y: 0, width: 10, height: 24 },
          editorMeta: { controlPart: "progressFill" },
          components: [
            { id: "fill_texture", type: "texture", props: { assetId: "asset_track", tint: "#ffffff" } },
          ],
          children: [],
        }],
      },
      {
        id: "input_control",
        name: "Input",
        type: "graphics",
        transform: { x: 0, y: 220, width: 220, height: 44 },
        components: [
          { id: "input", type: "input", props: { value: "", placeholder: "Player name", placeholderFill: "#888888" } },
          { id: "text", type: "text", props: { text: "", fill: "#ffffff" } },
        ],
        children: [],
      },
      {
        id: "dropdown_control",
        name: "Dropdown",
        type: "graphics",
        transform: { x: 0, y: 280, width: 220, height: 44 },
        components: [
          { id: "dropdown", type: "dropdown", props: { value: "Hard", options: "Easy, Hard" } },
          { id: "text", type: "text", props: { text: "Easy", fill: "#ffffff" } },
        ],
        children: [{
          id: "dropdown_arrow",
          name: "Arrow",
          type: "graphics",
          transform: { x: 0, y: 0, width: 20, height: 20 },
          editorMeta: { controlPart: "dropdownArrow" },
          components: [],
          children: [],
        }],
      },
    ],
  }, {
    adapter,
    manifest: {},
    assetsById: new Map([
      ["asset_track", { id: "asset_track", type: "texture", src: "assets/track.png" }],
      ["asset_thumb", { id: "asset_thumb", type: "texture", src: "assets/thumb.png" }],
    ]),
    componentsById: new Map(),
    data: {},
    stateByNodeId: new Map(),
  }, {
    path: "page_control_state",
    fallbackId: "page_control_state.root",
  });
  const nodes = flattenRenderTree(renderTree);

  assert.equal(findById(nodes, "toggle_control#track_texture").displayObject.props.tint, "#222222");
  assert.equal(findById(nodes, "toggle_thumb").displayObject.transform.x, 14);
  assert.equal(findById(nodes, "toggle_thumb#thumb_texture").displayObject.props.tint, "#ffffff");

  assert.equal(findById(nodes, "slider_fill").displayObject.transform.width, 50);
  assert.equal(findById(nodes, "slider_fill#fill_texture").displayObject.props.tint, "#33b8a5");
  assert.equal(findById(nodes, "slider_thumb").displayObject.transform.x, 45);
  assert.equal(findById(nodes, "slider_thumb#thumb_texture").displayObject.props.tint, "#eeeeee");

  assert.equal(findById(nodes, "checkbox_box#box_texture").displayObject.props.tint, "#151922");
  assert.equal(findById(nodes, "checkbox_check").displayObject.visible, false);
  assert.equal(findById(nodes, "checkbox_check#check_texture").displayObject.props.tint, "#33b8a5");

  assert.equal(findById(nodes, "progress_fill").displayObject.transform.width, 180);
  assert.equal(findById(nodes, "progress_fill#fill_texture").displayObject.props.tint, "#ffcc00");

  assert.equal(findById(nodes, "input_control#text").displayObject.text, "Player name");
  assert.equal(findById(nodes, "input_control#text").displayObject.props.fill, "#888888");
  assert.equal(findById(nodes, "dropdown_control#text").displayObject.text, "Hard");
  assert.equal(findById(nodes, "dropdown_arrow").displayObject.transform.x, 176);
});

test("runtime skips disabled node components but keeps the object as a container", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const renderTree = runtime.buildRenderTreeNode({
    id: "node_component_toggle",
    name: "Component Toggle",
    type: "graphics",
    transform: { x: 0, y: 0, width: 180, height: 72 },
    components: [{
      id: "fill",
      type: "fill",
      enabled: false,
      props: { fill: "#ff00ff", radius: 12 },
    }],
    children: [],
  }, {
    adapter,
    manifest: {},
    assetsById: new Map(),
    componentsById: new Map(),
    data: {},
    stateByNodeId: new Map(),
  }, {
    path: "page_component_toggle",
    fallbackId: "page_component_toggle.root",
  });

  assert.equal(renderTree.displayObject.kind, "Container");
  assert.equal(renderTree.children.length, 0);
});

test("runtime hides inactive nodes", async () => {
  const runtime = await importContractModule(runtimeContract);
  const adapter = runtime.createPlainPixiAdapter();
  const renderTree = runtime.buildRenderTreeNode({
    id: "node_root",
    name: "Root",
    type: "container",
    parentId: null,
    transform: { x: 0, y: 0, width: 320, height: 200 },
    children: [{
      id: "node_inactive_panel",
      name: "Inactive Panel",
      type: "graphics",
      active: false,
      transform: { x: 20, y: 20, width: 120, height: 60 },
      style: { visible: true },
      children: [],
    }],
  }, {
    adapter,
    manifest: {},
    assetsById: new Map(),
    componentsById: new Map(),
    data: {},
    stateByNodeId: new Map(),
  }, {
    path: "page_active_runtime",
    fallbackId: "page_active_runtime.root",
  });
  const inactive = findById(flattenRenderTree(renderTree), "node_inactive_panel");

  assert.equal(inactive.displayObject.visible, false);
});

async function importOptionalRendererFactoryModule() {
  for (const candidate of rendererFactoryCandidates) {
    const resolved = repoPath(candidate);
    if (!existsSync(resolved)) {
      continue;
    }

    const module = await import(pathToFileURL(resolved).href);
    if (rendererFactoryExportNames.some((name) => typeof module[name] === "function")) {
      return module;
    }
  }

  return null;
}

async function renderWithFactory(renderer, node, context, options) {
  if (typeof renderer === "function") {
    return renderer(node, context, options);
  }

  for (const methodName of ["buildRenderTreeNode", "buildNode", "renderNode", "createRenderTree"]) {
    if (typeof renderer?.[methodName] === "function") {
      return renderer[methodName](node, context, options);
    }
  }

  throw new Error("renderer factory must return a render function or an object with a render-tree method.");
}

function flattenRenderTree(renderTree) {
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    for (const child of node.children || []) {
      visit(child);
    }
  };
  visit(renderTree);
  return nodes;
}

function findById(nodes, id) {
  const node = nodes.find((candidate) => candidate.id === id);
  assert.ok(node, `expected render tree to include ${id}`);
  return node;
}

function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source?.[key]]));
}

function summarizeRenderTree(renderTree) {
  return flattenRenderTree(renderTree).map((node) => ({
    id: node.id,
    sourceId: node.sourceId,
    type: node.type,
    path: node.path,
    kind: node.displayObject?.kind,
    text: node.displayObject?.text,
    texture: node.displayObject?.texture
      ? pick(node.displayObject.texture, ["id", "frameName", "frame"])
      : null,
    style: pick(node.displayObject?.style, ["fill", "stroke", "strokeWidth", "radius"]),
    props: pick(node.displayObject?.props, ["fill", "stroke", "strokeWidth", "radius", "align", "verticalAlign", "anchor", "pivotAnchor", "nineSlice"]),
    transform: node.displayObject?.transform,
  }));
}
