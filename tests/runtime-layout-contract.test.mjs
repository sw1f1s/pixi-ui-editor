import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFunction,
  importContractModule,
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
  requiredExports: ["buildRenderTreeNode", "createPlainPixiAdapter", "resolveChildLayoutFrames"],
};

test("runtime lays out flex row children with padding, gap and alignment", async () => {
  const runtime = await importContractModule(runtimeContract);
  for (const exportName of runtimeContract.requiredExports) {
    assertFunction(runtime[exportName], exportName);
  }

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 500, height: 200 },
    layout: {
      mode: "flex",
      direction: "row",
      padding: { top: 20, right: 10, bottom: 20, left: 10 },
      gap: 5,
      alignItems: "center",
    },
    children: [
      child("one", 100, 40),
      child("two", 80, 60),
    ],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "one")), {
    x: 10,
    y: 80,
    width: 100,
    height: 40,
  });
  assert.deepEqual(pickTransform(findById(nodes, "two")), {
    x: 115,
    y: 70,
    width: 80,
    height: 60,
  });
});

test("runtime uses layout components for child layout", async () => {
  const runtime = await importContractModule(runtimeContract);

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 360, height: 120 },
    components: [{
      id: "layout",
      type: "layout",
      props: {
        mode: "flex",
        direction: "row",
        padding: 12,
        gap: 8,
        alignItems: "center",
      },
    }],
    children: [
      child("first", 90, 40),
      child("second", 70, 60),
    ],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "first")), {
    x: 12,
    y: 40,
    width: 90,
    height: 40,
  });
  assert.deepEqual(pickTransform(findById(nodes, "second")), {
    x: 110,
    y: 30,
    width: 70,
    height: 60,
  });
});

test("runtime ignores disabled layout components", async () => {
  const runtime = await importContractModule(runtimeContract);

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 360, height: 120 },
    components: [{
      id: "layout",
      type: "layout",
      enabled: false,
      props: {
        mode: "flex",
        direction: "row",
        padding: 12,
        gap: 8,
      },
    }],
    children: [
      { ...child("first", 90, 40), transform: { x: 20, y: 30, width: 90, height: 40 } },
      { ...child("second", 70, 60), transform: { x: 140, y: 20, width: 70, height: 60 } },
    ],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "first")), {
    x: 20,
    y: 30,
    width: 90,
    height: 40,
  });
  assert.deepEqual(pickTransform(findById(nodes, "second")), {
    x: 140,
    y: 20,
    width: 70,
    height: 60,
  });
});

test("runtime ignores child anchors inside parent layout containers", async () => {
  const runtime = await importContractModule(runtimeContract);

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 300, height: 120 },
    layout: { mode: "flex", direction: "row", padding: 10, gap: 8, alignItems: "start" },
    children: [{
      ...child("anchored", 72, 32),
      layout: {
        mode: "absolute",
        anchors: { left: 0, right: 0, top: 0, bottom: 0 },
        anchorPreset: "stretch",
      },
    }],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "anchored")), {
    x: 10,
    y: 10,
    width: 72,
    height: 32,
  });
});

test("runtime excludes inactive children from parent layout flow", async () => {
  const runtime = await importContractModule(runtimeContract);

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 420, height: 120 },
    layout: { mode: "flex", direction: "row", gap: 10, alignItems: "start" },
    children: [
      child("first", 100, 40),
      {
        ...child("inactive", 80, 40),
        active: false,
        transform: { x: 240, y: 12, width: 80, height: 40 },
      },
      child("second", 60, 40),
    ],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);
  const inactive = findById(nodes, "inactive");

  assert.deepEqual(pickTransform(findById(nodes, "first")), {
    x: 0,
    y: 0,
    width: 100,
    height: 40,
  });
  assert.deepEqual(pickTransform(findById(nodes, "second")), {
    x: 110,
    y: 0,
    width: 60,
    height: 40,
  });
  assert.deepEqual(pickTransform(inactive), {
    x: 240,
    y: 12,
    width: 80,
    height: 40,
  });
  assert.equal(inactive.displayObject.visible, false);
});

test("runtime distributes flex grow space and respects min/max constraints", async () => {
  const runtime = await importContractModule(runtimeContract);

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 420, height: 120 },
    layout: { mode: "flex", direction: "row", gap: 10, alignItems: "stretch" },
    children: [
      child("fixed", 100, 40),
      {
        ...child("grow", 50, 40),
        layout: { grow: 1, minWidth: 180, maxWidth: 260 },
      },
    ],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "fixed")), {
    x: 0,
    y: 0,
    width: 100,
    height: 120,
  });
  assert.deepEqual(pickTransform(findById(nodes, "grow")), {
    x: 110,
    y: 0,
    width: 260,
    height: 120,
  });
});

test("runtime lays out grid children into deterministic cells", async () => {
  const runtime = await importContractModule(runtimeContract);

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 320, height: 240 },
    layout: {
      mode: "grid",
      columns: 2,
      cellWidth: 120,
      cellHeight: 80,
      gap: 10,
      padding: 20,
      alignItems: "center",
      justifyItems: "center",
    },
    children: [
      child("a", 40, 20),
      child("b", 60, 30),
      child("c", 50, 40),
    ],
  }, createTestContext(runtime));
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "a")), { x: 60, y: 50, width: 40, height: 20 });
  assert.deepEqual(pickTransform(findById(nodes, "b")), { x: 180, y: 45, width: 60, height: 30 });
  assert.deepEqual(pickTransform(findById(nodes, "c")), { x: 55, y: 130, width: 50, height: 40 });
});

test("runtime applies parent layout frames to component instances", async () => {
  const runtime = await importContractModule(runtimeContract);
  const context = createTestContext(runtime);
  context.componentsById.set("button_component", {
    id: "button_component",
    name: "Button",
    rootNode: child("component_root", 120, 44),
  });

  const tree = runtime.buildRenderTreeNode({
    id: "root",
    type: "container",
    transform: { x: 0, y: 0, width: 300, height: 80 },
    layout: { mode: "flex", direction: "row", gap: 12, padding: 20 },
    children: [{
      id: "instance",
      name: "Instance",
      type: "componentInstance",
      transform: { x: 0, y: 0, width: 120, height: 44 },
      props: { componentId: "button_component" },
      children: [],
    }],
  }, context);
  const nodes = flattenRenderTree(tree);

  assert.deepEqual(pickTransform(findById(nodes, "instance")), {
    x: 20,
    y: 20,
    width: 120,
    height: 44,
  });
});

function createTestContext(runtime) {
  return {
    adapter: runtime.createPlainPixiAdapter(),
    manifest: { assets: [], components: [] },
    assetsById: new Map(),
    componentsById: new Map(),
    data: {},
    stateByNodeId: new Map(),
  };
}

function child(id, width, height) {
  return {
    id,
    name: id,
    type: "container",
    transform: { x: 0, y: 0, width, height },
    layout: { mode: "absolute" },
    children: [],
  };
}

function flattenRenderTree(node, out = []) {
  out.push(node);
  for (const childNode of node.children || []) {
    flattenRenderTree(childNode, out);
  }
  return out;
}

function findById(nodes, id) {
  const node = nodes.find((candidate) => candidate.id === id);
  assert.ok(node, `Expected render tree node ${id}`);
  return node;
}

function pickTransform(node) {
  const transform = node.displayObject.transform;
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}
