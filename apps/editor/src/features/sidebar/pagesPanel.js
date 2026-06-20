import { closeAtlasEditor, closeComponentAddMenus, createId, createPage, els, getActivePage, render, runCommand, setAddMenuOpen, setAssetContextMenuOpen, setCanvasContextMenuOpen, setDeviceMenuOpen, setHistoryMenuOpen, setLayoutMenuOpen, setPageContextMenuOpen, setProjectMenuOpen, setWindowMenuOpen, state } from "./deps.js";

export function renderPages() {
  const query = String(els.pageSearchInput.value || "").trim().toLowerCase();
  const pages = state.project.pages
    .filter((page) => !query || `${page.name} ${page.id}`.toLowerCase().includes(query));

  if (!pages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list-message";
    empty.textContent = "No pages found";
    els.pagesList.replaceChildren(empty);
    return;
  }

  els.pagesList.replaceChildren(...pages.map((page) => {
    const item = document.createElement("div");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Select ${page.name}`);
    item.className = `list-item page-item${page.id === state.pageId ? " is-selected" : ""}`;
    item.dataset.pageId = page.id;
    const name = state.renamingPageId === page.id
      ? createPageRenameInput(page)
      : document.createElement("span");
    if (state.renamingPageId !== page.id) {
      name.textContent = page.name;
    }
    item.append(name);
    item.addEventListener("click", () => {
      if (state.renamingPageId === page.id) {
        return;
      }
      item.focus({ preventScroll: true });
      selectEditorPage(page.id);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        startPageRename(page.id);
      } else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        selectEditorPage(page.id);
      }
    });
    return item;
  }));
}

export function createPageRenameInput(page) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "page-rename-input";
  input.value = page.name;
  input.setAttribute("aria-label", "Page name");
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      finishPageRename(page.id, input.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelPageRename();
    }
  });
  input.addEventListener("blur", () => {
    finishPageRename(page.id, input.value);
  });
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  return input;
}

export function openPagesContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();

  const item = event.target.closest(".page-item");
  const pageId = item && els.pagesList.contains(item) ? item.dataset.pageId : state.pageId;
  selectEditorPage(pageId);
  state.pageContextPageId = pageId;
  setHistoryMenuOpen(false);
  setProjectMenuOpen(false);
  setDeviceMenuOpen(false);
  setLayoutMenuOpen(false);
  setWindowMenuOpen(false);
  setAddMenuOpen(false);
  setCanvasContextMenuOpen(false);
  setAssetContextMenuOpen(false);
  closeComponentAddMenus();
  setPageContextMenuOpen(true, {
    x: event.clientX,
    y: event.clientY
  });
}

export function selectEditorPage(pageId) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    return false;
  }

  if (state.renamingPageId && state.renamingPageId !== page.id) {
    state.renamingPageId = null;
  }
  state.pageId = page.id;
  state.selectedPageId = page.id;
  state.editingComponentId = null;
  state.selectedNodeId = null;
  render();
  return true;
}

export function startPageRename(pageId = state.pageId) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    return false;
  }

  state.pageId = page.id;
  state.selectedPageId = page.id;
  state.selectedNodeId = null;
  state.renamingPageId = page.id;
  render();
  return true;
}

export function finishPageRename(pageId, rawName) {
  if (state.renamingPageId !== pageId) {
    return false;
  }

  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  state.renamingPageId = null;
  if (!page) {
    render();
    return false;
  }

  const nextName = createUniquePageName(normalizePageName(rawName || page.name), pageId);
  if (nextName === page.name) {
    render();
    return false;
  }

  runCommand({
    type: "project.rename_page",
    args: {
      pageId,
      name: nextName
    },
    meta: { source: "user", label: `Rename ${page.name} to ${nextName}` }
  });
  return true;
}

export function cancelPageRename() {
  if (!state.renamingPageId) {
    return false;
  }

  state.renamingPageId = null;
  render();
  return true;
}

export function createEditorPage() {
  const sourcePage = getActivePage();
  const index = state.project.pages.length + 1;
  const page = createPage({
    id: createId("page"),
    name: createUniquePageName(`Page ${index}`),
    width: sourcePage?.canvas?.width || 1080,
    height: sourcePage?.canvas?.height || 1920,
    orientation: sourcePage?.canvas?.orientation || "portrait",
    background: sourcePage?.canvas?.background ?? "transparent",
    safeArea: { ...(sourcePage?.canvas?.safeArea || { top: 0, right: 0, bottom: 0, left: 0 }) }
  });

  state.pageId = page.id;
  state.selectedPageId = page.id;
  state.selectedNodeId = null;
  els.pageSearchInput.value = "";
  runCommand({
    type: "project.create_page",
    args: { page },
    meta: { source: "user", label: `Create ${page.name}` }
  });
  return true;
}

export function deleteActivePage() {
  return deletePageById(state.pageId);
}

export function deletePageById(pageId) {
  if (state.project.pages.length <= 1) {
    return false;
  }

  const pageIndex = state.project.pages.findIndex((page) => page.id === pageId);
  if (pageIndex < 0) {
    return false;
  }

  const page = state.project.pages[pageIndex];
  if (!page) {
    return false;
  }

  const nextPage = state.project.pages[pageIndex + 1] || state.project.pages[pageIndex - 1];
  state.pageId = nextPage.id;
  state.selectedPageId = nextPage.id;
  state.selectedNodeId = null;
  state.renamingPageId = null;
  state.collapsedLayerIds.clear();
  closeAtlasEditor();
  runCommand({
    type: "project.delete_page",
    args: { pageId: page.id },
    meta: { source: "user", label: `Delete ${page.name}` }
  });
  return true;
}

export function createUniquePageName(baseName, exceptPageId = null) {
  const existingNames = new Set(state.project.pages
    .filter((page) => page.id !== exceptPageId)
    .map((page) => page.name));
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
}

export function normalizePageName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ") || "Page";
}
