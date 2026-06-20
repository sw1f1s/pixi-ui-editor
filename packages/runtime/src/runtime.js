import { loadRuntimeAssets } from "./assets.js";
import { loadRuntimeManifest } from "./document.js";
import { createPlainPixiAdapter } from "./plain-adapter.js";
import { createRendererAdapter } from "./renderer-factory.js";
import { MountedScreen } from "./runtime/mounted-screen.js";
import { PixiUiRuntime } from "./runtime/pixi-ui-runtime.js";

export async function createPixiUiRuntime(options = {}) {
  const manifest = await loadRuntimeManifest(options);
  const adapter = createRendererAdapter(options.adapter || createPlainPixiAdapter());
  const assetLoadResult = options.loadAssets === false
    ? null
    : await loadRuntimeAssets(manifest, { ...options, adapter });
  return new PixiUiRuntime({ ...options, manifest, adapter, assetLoadResult });
}

export {
  MountedScreen,
  PixiUiRuntime
};
