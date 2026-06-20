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
  requiredExports: ["createPixiUiRuntime", "resolveTransform"],
};

test("runtime resolves plural anchors against the safe area when requested", async () => {
  const runtime = await importContractModule(runtimeContract);
  assertFunction(runtime.resolveTransform, "resolveTransform");

  const transform = runtime.resolveTransform({
    type: "graphics",
    transform: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    layout: {
      safeArea: true,
      anchors: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    props: {},
  }, {
    viewport: {
      width: 2532,
      height: 1170,
      safeArea: {
        top: 0,
        right: 59,
        bottom: 21,
        left: 59,
      },
    },
  });

  assert.equal(transform.x, 59);
  assert.equal(transform.y, 0);
  assert.equal(transform.width, 2414);
  assert.equal(transform.height, 1149);
});

test("runtime keeps singular anchor behavior on the full viewport", async () => {
  const runtime = await importContractModule(runtimeContract);

  const transform = runtime.resolveTransform({
    type: "graphics",
    transform: {
      x: 0,
      y: 0,
      width: 120,
      height: 80,
    },
    layout: {
      safeArea: false,
      anchor: {
        right: 10,
        bottom: 20,
      },
    },
    props: {},
  }, {
    viewport: {
      width: 1000,
      height: 600,
      safeArea: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
    },
  });

  assert.equal(transform.x, 870);
  assert.equal(transform.y, 500);
});

test("runtime resolves anchors against the parent frame for nested UI", async () => {
  const runtime = await importContractModule(runtimeContract);

  const transform = runtime.resolveTransform({
    type: "graphics",
    transform: {
      x: 0,
      y: 0,
      width: 90,
      height: 40,
    },
    layout: {
      anchors: {
        right: 16,
        bottom: 12,
      },
    },
    props: {},
  }, {
    viewport: {
      width: 1200,
      height: 800,
    },
    parentFrame: {
      width: 320,
      height: 180,
    },
  });

  assert.equal(transform.x, 214);
  assert.equal(transform.y, 128);
});

test("runtime mountScreen defaults viewport from screen canvas safe area", async () => {
  const runtime = await importContractModule(runtimeContract);
  assertFunction(runtime.createPixiUiRuntime, "createPixiUiRuntime");

  const pixiUi = await runtime.createPixiUiRuntime({
    loadAssets: false,
    manifest: {
      screens: [{
        id: "screen",
        canvas: {
          width: 1000,
          height: 600,
          safeArea: { top: 20, right: 30, bottom: 40, left: 50 },
        },
        rootNode: {
          id: "root",
          type: "container",
          transform: { x: 0, y: 0, width: 1000, height: 600 },
          children: [{
            id: "safe",
            type: "graphics",
            transform: { x: 0, y: 0, width: 10, height: 10 },
            layout: {
              safeArea: true,
              anchors: { left: 0, right: 0, top: 0, bottom: 0 },
            },
          }],
        },
      }],
      assets: [],
      components: [],
    },
  });
  const mounted = await pixiUi.mountScreen("screen");
  const safe = mounted.findById("safe");

  assert.deepEqual({
    x: safe.displayObject.transform.x,
    y: safe.displayObject.transform.y,
    width: safe.displayObject.transform.width,
    height: safe.displayObject.transform.height,
  }, {
    x: 50,
    y: 20,
    width: 920,
    height: 540,
  });
});
