export function createTextureResolver({ Texture, Rectangle }) {
  return function resolveTexture(asset) {
    if (!asset) {
      return Texture?.EMPTY;
    }

    if (asset.texture) {
      return asset.texture;
    }

    let texture = asset.texture;
    if (!texture && Texture?.from && asset.src) {
      texture = Texture.from(asset.src);
    }

    if (texture && asset.frame && Rectangle) {
      return createFrameTexture(Texture, Rectangle, texture, asset.frame);
    }

    if (texture) {
      return texture;
    }

    return Texture?.EMPTY;
  };
}

function createFrameTexture(Texture, Rectangle, texture, frame) {
  try {
    return new Texture({
      source: texture.source || texture.baseTexture,
      frame: new Rectangle(frame.x || 0, frame.y || 0, frame.width || frame.w || 0, frame.height || frame.h || 0)
    });
  } catch (_error) {
    try {
      return new Texture(texture.baseTexture, new Rectangle(frame.x || 0, frame.y || 0, frame.width || frame.w || 0, frame.height || frame.h || 0));
    } catch (_fallbackError) {
      return texture;
    }
  }
}
