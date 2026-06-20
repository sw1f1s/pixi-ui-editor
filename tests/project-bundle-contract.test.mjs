import assert from "node:assert/strict";
import test from "node:test";

import { createMinimalProjectDocument } from "./fixtures/sample-project.mjs";
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
  requiredExports: [
    "createPixiUiProjectBundle",
    "isPixiUiProjectBundle",
    "readPixiUiProjectBundle",
    "PIXIPROJECTUI_FILE_EXTENSION",
  ],
};

test(".pixiprojectui project bundle roundtrips project, layout and embedded asset files", async () => {
  const exporter = await importContractModule(exporterContract);
  for (const exportName of exporterContract.requiredExports) {
    if (exportName.startsWith("PIXI")) {
      continue;
    }
    assertFunction(exporter[exportName], exportName);
  }

  const project = createMinimalProjectDocument({
    project: { id: "project_bundle", name: "Bundle Contract" },
    assets: [
      {
        id: "asset_button",
        name: "Button",
        type: "texture",
        src: "assetdb://project_bundle/asset_button",
        width: 64,
        height: 32,
        mime: "image/png",
        nineSlice: { left: 8, right: 8, top: 6, bottom: 6 },
      },
      {
        id: "asset_button_atlas",
        name: "Button Atlas",
        type: "spriteAtlas",
        src: "assetdb://project_bundle/asset_button",
        frames: {
          button: {
            x: 0,
            y: 0,
            width: 64,
            height: 32,
            nineSlice: { left: 10, right: 12, top: 7, bottom: 9 },
          },
        },
      },
    ],
  });
  const layout = {
    panels: {
      assets: { zone: "bottom", order: 0, visible: true },
      inspector: { zone: "right", order: 0, visible: true },
    },
    bottomPanelHeight: 280,
  };
  const assetFiles = [
    {
      key: "project_bundle/asset_button",
      assetId: "asset_button",
      name: "Button",
      fileName: "Button.png",
      mime: "image/png",
      byteSize: 4,
      dataUrl: "data:image/png;base64,AAAA",
    },
  ];

  const bundle = exporter.createPixiUiProjectBundle(project, {
    savedAt: "2026-05-20T00:00:00.000Z",
    editorVersion: "0.1.0-test",
    layout,
    assetFiles,
  });
  const serialized = JSON.stringify(bundle);
  const opened = exporter.readPixiUiProjectBundle(JSON.parse(serialized));

  assert.equal(exporter.PIXIPROJECTUI_FILE_EXTENSION, "pixiprojectui");
  assert.equal(exporter.isPixiUiProjectBundle(bundle), true);
  assertJsonSerializable(bundle, ".pixiprojectui bundle");
  assert.equal(opened.project.project.id, "project_bundle");
  assert.equal(opened.project.assets[0].src, "assetdb://project_bundle/asset_button");
  assert.deepEqual(opened.project.assets[0].nineSlice, { left: 8, right: 8, top: 6, bottom: 6 });
  assert.deepEqual(opened.project.assets[1].frames.button.nineSlice, { left: 10, right: 12, top: 7, bottom: 9 });
  assert.deepEqual(opened.layout, layout);
  assert.deepEqual(opened.assetFiles, assetFiles);
});
