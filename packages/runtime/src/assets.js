import { asArray, cloneJson } from "./helpers.js";

export async function loadRuntimeAssets(manifest, options = {}) {
  const adapter = options.adapter || {};
  const assets = asArray(manifest?.assets).map((asset) => cloneJson(asset));
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const results = [];

  for (const asset of assets) {
    try {
      if ((asset.type === "texture" || asset.type === "spriteAtlas") && asset.src && adapter.loadTexture) {
        asset.texture = await adapter.loadTexture(asset);
      }

      if (asset.type === "font") {
        await loadFontAsset(asset, options);
      }

      asset.loadState = "loaded";
      results.push({ id: asset.id, status: "loaded" });
    } catch (error) {
      asset.loadState = "failed";
      asset.error = error?.message || String(error);
      results.push({ id: asset.id, status: "failed", error: asset.error });
      if (options.failFast) {
        throw error;
      }
    }
  }

  return {
    assets,
    assetsById,
    results,
    errors: results.filter((result) => result.status === "failed")
  };
}

async function loadFontAsset(asset, options = {}) {
  if (options.loadFont) {
    return options.loadFont(asset);
  }

  if (!asset?.src || typeof FontFace === "undefined" || !globalThis.document?.fonts) {
    return null;
  }

  const font = new FontFace(asset.family || asset.name || asset.id, `url(${asset.src})`);
  const loaded = await font.load();
  globalThis.document.fonts.add(loaded);
  return loaded;
}
