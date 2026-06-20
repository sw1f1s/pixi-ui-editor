// project file persistence and bundles.
import { els, state, session, bindEditorApi } from "../app/editorRuntime.js";
import { createPixiUiProjectBundle, isPixiUiProjectBundle } from "../app/editorDeps.js";
import { IMPORT_YIELD_INTERVAL, PROJECT_FILE_EXTENSION, PROJECT_FILE_EXTENSIONS, PROJECT_STORAGE_KEY, createDefaultLayout } from "../app/editorConfig.js";
const { createBlankProject, downloadJsonFile, getAssetById, getAssetStorageKey, getProjectDisplayName, loadProjectDocument, loadStoredProject, openAssetDatabase, readAssetRecord, render, sanitizeFileName, serializeProjectForStorage, setExportPreviewPayload, writeAssetRecords, yieldToBrowser } = bindEditorApi(["createBlankProject","downloadJsonFile","getAssetById","getAssetStorageKey","getProjectDisplayName","loadProjectDocument","loadStoredProject","openAssetDatabase","readAssetRecord","render","sanitizeFileName","serializeProjectForStorage","setExportPreviewPayload","writeAssetRecords","yieldToBrowser"]);

export function showStartupDialogIfNeeded() {
  if (!els.startupDialog) {
    return;
  }

  els.startupContinueButton.hidden = !localStorage.getItem(PROJECT_STORAGE_KEY);
  els.startupDialog.hidden = false;
}

export function closeStartupDialog() {
  if (els.startupDialog) {
    els.startupDialog.hidden = true;
  }
}

export function showProjectLoading(title = "Opening project", detail = "Preparing workspace...") {
  if (!els.projectLoadingDialog) {
    return;
  }

  updateProjectLoading(title, detail);
  els.projectLoadingDialog.hidden = false;
}

export function updateProjectLoading(title, detail = "") {
  if (!els.projectLoadingDialog) {
    return;
  }

  if (title && els.projectLoadingTitle) {
    els.projectLoadingTitle.textContent = title;
  }
  if (els.projectLoadingDetail) {
    els.projectLoadingDetail.textContent = detail;
  }
}

export function hideProjectLoading() {
  if (els.projectLoadingDialog) {
    els.projectLoadingDialog.hidden = true;
  }
}

export function persistCurrentProjectDocument() {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(serializeProjectForStorage(state.project)));
}

export function promptForProjectName(defaultName = "New Pixi UI") {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    return normalizeProjectName(defaultName);
  }

  let value;
  try {
    value = window.prompt("Project name", defaultName);
  } catch {
    return normalizeProjectName(defaultName);
  }
  if (value === null) {
    return null;
  }
  return normalizeProjectName(value);
}

export function normalizeProjectName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ") || "New Pixi UI";
}

export function renameCurrentProject() {
  const projectName = promptForProjectName(getProjectDisplayName());
  if (!projectName) {
    return false;
  }

  state.project.project.name = projectName;
  state.project.project.updatedAt = new Date().toISOString();
  persistCurrentProjectDocument();
  render();
  return true;
}

export async function createNewProjectFromDeviceFlow() {
  const confirmed = typeof window === "undefined" || window.confirm("Create a new project and replace the current workspace?");
  if (!confirmed) {
    return false;
  }
  const projectName = promptForProjectName();
  if (!projectName) {
    return false;
  }
  return await loadProjectDocument(createBlankProject(projectName), "new-project", {
    layout: createDefaultLayout(),
    fileName: null,
    fileHandle: null,
    persist: true
  });
}

export async function createNewProjectFromStartup() {
  const projectName = promptForProjectName();
  if (!projectName) {
    return false;
  }
  closeStartupDialog();
  return await loadProjectDocument(createBlankProject(projectName), "new-project", {
    layout: createDefaultLayout(),
    fileName: null,
    fileHandle: null,
    persist: true
  });
}

export async function openProjectFileFromStartup() {
  const opened = await openProjectFileFromDevice();
  if (opened) {
    closeStartupDialog();
  }
  return opened;
}

export async function openProjectFileFromDevice() {
  if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: "Pixi UI Project",
          accept: {
            "application/json": PROJECT_FILE_EXTENSIONS
          }
        }]
      });
      const file = await handle.getFile();
      return loadProjectFile(file, { handle });
    } catch (error) {
      if (error?.name !== "AbortError") {
        setExportPreviewPayload({
          action: "open-project-file",
          status: "failed",
          message: error.message
        });
      }
      return false;
    }
  }

  els.importFileInput.click();
  return false;
}

export async function saveProjectFileToDevice() {
  try {
    const bundle = await createProjectBundle();
    const filename = session.activeProjectFileName || createProjectBundleFilename();
    if (session.activeProjectFileHandle?.createWritable) {
      await writeProjectBundleToHandle(session.activeProjectFileHandle, bundle);
    } else if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      session.activeProjectFileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: "Pixi UI Project",
          accept: {
            "application/json": PROJECT_FILE_EXTENSIONS
          }
        }]
      });
      await writeProjectBundleToHandle(session.activeProjectFileHandle, bundle);
      session.activeProjectFileName = session.activeProjectFileHandle.name || filename;
    } else {
      downloadJsonFile(filename, bundle);
      session.activeProjectFileName = filename;
    }

    setExportPreviewPayload({
      action: "save-project-file",
      status: "saved",
      filename: session.activeProjectFileName || filename,
      assets: state.project.assets.length,
      embeddedFiles: bundle.assetFiles.length
    });
    return true;
  } catch (error) {
    if (error?.name !== "AbortError") {
      setExportPreviewPayload({
        action: "save-project-file",
        status: "failed",
        message: error.message
      });
    }
    return false;
  }
}

export async function writeProjectBundleToHandle(handle, bundle) {
  const writable = await handle.createWritable();
  await writable.write(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
  await writable.close();
}

export async function importProjectFromFile(event) {
  const [file] = event.target.files || [];
  event.target.value = "";
  if (!file) {
    return false;
  }

  const loaded = await loadProjectFile(file);
  if (loaded) {
    closeStartupDialog();
  }
  return loaded;
}

export async function loadProjectFile(file, options = {}) {
  showProjectLoading("Opening project", file?.name || "Reading project file...");
  try {
    await yieldToBrowser();
    updateProjectLoading("Reading project file", file.name || "Loading project data...");
    const text = await file.text();
    await yieldToBrowser();
    updateProjectLoading("Parsing project", file.name || "Checking project format...");
    const parsed = JSON.parse(text);
    if (isPixiUiProjectBundle(parsed)) {
      return await loadProjectBundle(parsed, file.name, options.handle || null);
    }
    setExportPreviewPayload({
      action: "open-project-file",
      status: "invalid",
      message: "Project file must be a .pixiprojectui bundle."
    });
    return false;
  } catch (error) {
    setExportPreviewPayload({
      action: "import",
      status: "failed",
      message: error.message
    });
    return false;
  } finally {
    hideProjectLoading();
  }
}

export async function loadProjectBundle(bundle, fileName, fileHandle = null) {
  const project = bundle.project;
  if (!project) {
    setExportPreviewPayload({
      action: "open-project-file",
      status: "invalid",
      message: "Project file has no project document."
    });
    return false;
  }

  try {
    updateProjectLoading("Importing project assets", `${bundle.assetFiles?.length || 0} embedded files`);
    await persistBundleAssetFiles(bundle.assetFiles || [], project.project?.id);
    updateProjectLoading("Loading workspace", `${project.pages?.length || 0} pages, ${project.assets?.length || 0} assets`);
    const loaded = await loadProjectDocument(project, "open-project-file", {
      layout: bundle.layout,
      fileName,
      fileHandle,
      persist: true
    });
    if (loaded) {
      setExportPreviewPayload({
        action: "open-project-file",
        status: "loaded",
        filename: fileName,
        assets: project.assets?.length || 0,
        embeddedFiles: bundle.assetFiles?.length || 0
      });
    }
    return loaded;
  } catch (error) {
    setExportPreviewPayload({
      action: "open-project-file",
      status: "failed",
      message: error.message
    });
    return false;
  }
}

export async function createProjectBundle() {
  const project = serializeProjectForStorage(state.project, { includeSessionBlobs: true });
  const assetFiles = await collectProjectBundleAssetFiles(project);
  return createPixiUiProjectBundle(project, {
    editorVersion: state.project.project.editorVersion || "0.1.0",
    project,
    layout: state.layout,
    assetFiles
  });
}

export async function collectProjectBundleAssetFiles(project) {
  const files = [];
  const seenKeys = new Set();

  for (const asset of project.assets || []) {
    const storageKey = getAssetStorageKey(asset);
    if (!storageKey || seenKeys.has(storageKey)) {
      continue;
    }
    seenKeys.add(storageKey);

    const liveAsset = getAssetById(asset.id);
    const blob = await readAssetBlobForBundle(storageKey, liveAsset || asset);
    if (!blob) {
      continue;
    }

    files.push({
      key: storageKey,
      assetId: asset.id,
      name: asset.name || asset.id,
      fileName: asset.meta?.fileName || asset.name || asset.id,
      mime: blob.type || asset.mime || "application/octet-stream",
      byteSize: blob.size,
      dataUrl: await readBlobAsDataUrl(blob)
    });

    if (files.length % IMPORT_YIELD_INTERVAL === 0) {
      await yieldToBrowser();
    }
  }

  return files;
}

export async function readAssetBlobForBundle(storageKey, asset) {
  const sessionBlob = asset?.src && session.assetObjectUrls.get(asset.src);
  if (sessionBlob instanceof Blob) {
    return sessionBlob;
  }

  try {
    const db = await openAssetDatabase();
    if (db) {
      const record = await readAssetRecord(db, storageKey);
      if (record?.blob) {
        return record.blob;
      }
    }
  } catch (error) {
    console.warn(`Failed to read asset "${asset?.id || storageKey}" from asset database.`, error);
  }

  if (asset?.src?.startsWith("data:")) {
    return dataUrlToBlob(asset.src);
  }

  return null;
}

export async function persistBundleAssetFiles(assetFiles, projectId = state.project.project.id) {
  if (!assetFiles.length) {
    return { persisted: 0 };
  }

  const db = await openAssetDatabase();
  if (!db) {
    return { persisted: 0 };
  }

  const records = assetFiles
    .filter((file) => file?.key && file?.dataUrl)
    .map((file) => {
      const blob = dataUrlToBlob(file.dataUrl, file.mime);
      return {
        key: file.key,
        projectId,
        assetId: file.assetId,
        name: file.name,
        fileName: file.fileName,
        mime: file.mime || blob.type || "application/octet-stream",
        size: file.byteSize ?? blob.size,
        importedAt: new Date().toISOString(),
        blob
      };
    });

  await writeAssetRecords(db, records);
  return { persisted: records.length };
}

export function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Failed to encode asset file.")));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl, fallbackMime = "application/octet-stream") {
  const [header, body = ""] = String(dataUrl || "").split(",", 2);
  const mime = header.match(/^data:([^;,]+)/)?.[1] || fallbackMime;
  if (header.includes(";base64")) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mime });
  }

  return new Blob([decodeURIComponent(body)], { type: mime });
}

export function createProjectBundleFilename() {
  return `${sanitizeFileName(getProjectDisplayName())}.${PROJECT_FILE_EXTENSION}`;
}
