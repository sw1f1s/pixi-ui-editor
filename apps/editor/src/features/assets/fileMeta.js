import { normalizeNineSlice, session } from "./deps.js?v=20260620-designless";

export function isImageFile(file) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export function isFontFile(file) {
  return file.type.startsWith("font/") || /\.(ttf|otf|woff2?|fnt)$/i.test(file.name);
}

export function isJsonFile(file) {
  return file.type === "application/json" || /\.json$/i.test(file.name);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error(`Failed to read ${file.name}.`)));
    reader.readAsText(file);
  });
}

export function createObjectUrlForFile(file) {
  const url = URL.createObjectURL(file);
  session.assetObjectUrls.set(url, file);
  return url;
}
export function yieldToBrowser() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function getFileBaseName(fileName) {
  return String(fileName || "").replace(/\.[^.]+$/, "");
}

export function getFileRelativePath(file) {
  return String(file.webkitRelativePath || file.name || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

export function getFileFolder(file) {
  const path = getFileRelativePath(file);
  const segments = path.split("/").filter(Boolean);
  segments.pop();
  return segments.join("/");
}

export function getFileDeviceMeta(file) {
  const devicePath = getFileDevicePath(file);
  if (!devicePath) {
    return {};
  }

  return {
    devicePath,
    deviceFolder: getDeviceFolderPath(devicePath)
  };
}

export function getFileDevicePath(file) {
  const path = String(file?.path || file?.fullPath || file?.mozFullPath || "");
  return isAbsoluteDevicePath(path) ? path : "";
}

export function isAbsoluteDevicePath(path) {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("\\\\");
}

export function getDeviceFolderPath(path) {
  return String(path || "").replace(/[\\/][^\\/]*$/, "");
}

export function getFileExtension(fileName) {
  return String(fileName || "").split(".").pop()?.toLowerCase() || "";
}

export function sanitizeAssetId(value) {
  return String(value || "asset")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "asset";
}

export function inferImageMime(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === "jpg") {
    return "image/jpeg";
  }
  return ext ? `image/${ext}` : "image/png";
}

export function isSpriteAtlasJson(value) {
  return Boolean(value && typeof value === "object" && value.frames && typeof value.frames === "object");
}

export function findLinkedAtlasImageAsset(jsonFile, imageName, assetsByFileName, assetsByBaseName) {
  const folder = getFileFolder(jsonFile);
  const candidates = [
    imageName,
    imageName && folder ? `${folder}/${imageName}` : null,
    imageName ? imageName.split(/[\\/]/).pop() : null,
    getFileBaseName(jsonFile.name)
  ].filter(Boolean);

  for (const candidate of candidates) {
    const byFile = assetsByFileName.get(String(candidate).toLowerCase());
    if (byFile) {
      return byFile;
    }
    const byBase = assetsByBaseName.get(getFileBaseName(candidate).toLowerCase());
    if (byBase) {
      return byBase;
    }
  }

  return null;
}

export function normalizeAtlasFrames(frames) {
  const entries = Array.isArray(frames)
    ? frames.map((frame, index) => [frame.filename || frame.name || `frame_${index}`, frame])
    : Object.entries(frames || {});

  return Object.fromEntries(entries.map(([name, entry]) => {
    const frame = entry.frame || entry;
    const sourceSize = entry.sourceSize || {};
    const spriteSourceSize = entry.spriteSourceSize || {};
    const normalized = {
      x: Number(frame.x || 0),
      y: Number(frame.y || 0),
      width: Number(frame.w ?? frame.width ?? 0),
      height: Number(frame.h ?? frame.height ?? 0),
      sourceWidth: Number(sourceSize.w ?? sourceSize.width ?? frame.w ?? frame.width ?? 0),
      sourceHeight: Number(sourceSize.h ?? sourceSize.height ?? frame.h ?? frame.height ?? 0),
      offsetX: Number(spriteSourceSize.x || 0),
      offsetY: Number(spriteSourceSize.y || 0),
      rotated: Boolean(entry.rotated),
      trimmed: Boolean(entry.trimmed)
    };
    const nineSlice = normalizeImportedNineSlice(entry.nineSlice || entry.border || entry.borders || frame.nineSlice || frame.border || frame.borders);
    if (nineSlice) {
      normalized.nineSlice = nineSlice;
    }
    return [name, normalized];
  }));
}

export function normalizeImportedNineSlice(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return normalizeNineSlice({
      left: value[0],
      top: value[1],
      right: value[2] ?? value[0],
      bottom: value[3] ?? value[1]
    });
  }

  return normalizeNineSlice(value);
}
