import assert from "node:assert/strict";
import test from "node:test";

import {
  MIN_NODE_SIZE,
  moveTransform,
  resizeTransform,
} from "../apps/editor/src/canvasTransforms.js";

test("canvas move transform rounds position and preserves size", () => {
  const result = moveTransform({ x: 10, y: 20, width: 120, height: 44 }, 5.4, -3.6);

  assert.deepEqual(result, {
    x: 15,
    y: 16,
    width: 120,
    height: 44,
  });
});

test("canvas resize transform supports edge and corner handles", () => {
  const transform = { x: 100, y: 80, width: 200, height: 120 };

  assert.deepEqual(resizeTransform(transform, "e", 25, 0), {
    x: 100,
    y: 80,
    width: 225,
    height: 120,
  });

  assert.deepEqual(resizeTransform(transform, "nw", -20, -10), {
    x: 80,
    y: 70,
    width: 220,
    height: 130,
  });

  assert.deepEqual(resizeTransform(transform, "se", 10.2, 9.6), {
    x: 100,
    y: 80,
    width: 210,
    height: 130,
  });
});

test("canvas resize transform clamps north and west handles to minimum size", () => {
  const transform = { x: 50, y: 60, width: 30, height: 20 };

  assert.deepEqual(resizeTransform(transform, "nw", 100, 100), {
    x: 50 + 30 - MIN_NODE_SIZE,
    y: 60 + 20 - MIN_NODE_SIZE,
    width: MIN_NODE_SIZE,
    height: MIN_NODE_SIZE,
  });
});
