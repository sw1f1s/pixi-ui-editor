// dock layout and device profiles.
import { els, state, bindEditorApi } from "../app/editorRuntime.js";
import { roundCanvasNumber } from "../app/editorDeps.js";
import { DEVICE_PROFILES, DOCK_ZONE_NAMES, PANEL_DEFINITIONS, createDefaultPanelLayout } from "../app/editorConfig.js";
const { clamp, getActivePage, normalizeLayoutState, normalizePanelLayout, renderCanvas, runCommand, saveLayoutState, setAddMenuOpen, setAssetContextMenuOpen, setAssetViewMenuOpen, setCanvasContextMenuOpen, setDeviceMenuOpen, setHistoryMenuOpen, setInstanceContextMenuOpen, setLayoutMenuOpen, setPageContextMenuOpen, setPanelOptionsMenuOpen, setProjectMenuOpen, setWindowMenuOpen, syncAssetViewMenu } = bindEditorApi(["clamp","getActivePage","normalizeLayoutState","normalizePanelLayout","renderCanvas","runCommand","saveLayoutState","setAddMenuOpen","setAssetContextMenuOpen","setAssetViewMenuOpen","setCanvasContextMenuOpen","setDeviceMenuOpen","setHistoryMenuOpen","setInstanceContextMenuOpen","setLayoutMenuOpen","setPageContextMenuOpen","setPanelOptionsMenuOpen","setProjectMenuOpen","setWindowMenuOpen","syncAssetViewMenu"]);

export function renderDeviceProfileList() {
  const groups = new Map();
  for (const [profileId, profile] of Object.entries(DEVICE_PROFILES)) {
    const group = profile.group || "Devices";
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group).push({ profileId, profile });
  }

  const fragment = document.createDocumentFragment();
  for (const [group, profiles] of groups) {
    const title = document.createElement("span");
    title.className = "device-profile-group-title";
    title.textContent = group;
    fragment.append(title);

    for (const { profileId, profile } of profiles) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.deviceProfile = profileId;
      button.textContent = `${profile.name} · ${profile.width}x${profile.height}`;
      fragment.append(button);
    }
  }

  els.deviceProfileList.replaceChildren(fragment);
}

export function bindResizeHandles() {
  els.resizeHandles.forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const resizeTarget = handle.dataset.resizeHandle;
      const start = {
        x: event.clientX,
        y: event.clientY,
        layout: { ...state.layout }
      };

      handle.classList.add("is-active");
      els.appShell.classList.add("is-resizing");
      handle.setPointerCapture?.(event.pointerId);

      const onPointerMove = (moveEvent) => {
        updateLayoutFromDrag(resizeTarget, start, moveEvent);
      };

      const onPointerUp = () => {
        handle.classList.remove("is-active");
        els.appShell.classList.remove("is-resizing");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        saveLayoutState();
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    });
  });
}

export function bindDockPanels() {
  els.dockPanels.forEach((panel) => {
    const panelId = panel.dataset.panelId;
    const header = panel.querySelector(".panel-header");
    if (!panelId || !header) {
      return;
    }

    header.draggable = true;
    header.dataset.panelDragHandle = panelId;
    ensurePanelOptionsMenu(panel, panelId);
    header.addEventListener("pointerdown", handleDockPanelHeaderPointerDown, true);
    header.addEventListener("dragstart", (event) => startDockPanelDrag(event, panelId));
    header.addEventListener("dragend", finishDockPanelDrag);
  });

  els.dockZones.forEach((zone) => {
    zone.addEventListener("dragover", handleDockZoneDragOver);
    zone.addEventListener("drop", handleDockZoneDrop);
    zone.addEventListener("dragleave", handleDockZoneDragLeave);
  });
}

export function bindAssetBrowserResize() {
  els.assetFolderResizeHandle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const start = {
      x: event.clientX,
      width: state.layout.assetFolderWidth
    };

    els.assetFolderResizeHandle.classList.add("is-active");
    els.assetFolderResizeHandle.setPointerCapture?.(event.pointerId);

    const onPointerMove = (moveEvent) => {
      state.layout = {
        ...state.layout,
        assetFolderWidth: clamp(start.width + moveEvent.clientX - start.x, 140, 380)
      };
      applyLayoutState();
    };

    const onPointerUp = () => {
      els.assetFolderResizeHandle.classList.remove("is-active");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      saveLayoutState();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  });
}

export function ensurePanelOptionsMenu(panel, panelId) {
  const header = panel.querySelector(".panel-header");
  if (!header || panelId === "assets" || header.querySelector(".panel-options-controls")) {
    return;
  }

  const title = PANEL_DEFINITIONS[panelId]?.title || panelId;
  const controls = document.createElement("div");
  controls.className = "panel-options-controls";

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "panel-options-menu-button";
  menuButton.title = `${title} options`;
  menuButton.setAttribute("aria-label", `${title} options`);
  menuButton.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.className = "panel-options-icon";
  icon.setAttribute("aria-hidden", "true");
  menuButton.append(icon);

  const menu = document.createElement("div");
  menu.className = "dropdown-menu panel-options-menu";
  menu.hidden = true;

  const group = document.createElement("div");
  group.className = "menu-group";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "context-menu-danger";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setPanelOptionsMenuOpen(controls, false);
    setDockPanelVisible(panelId, false);
  });

  group.append(closeButton);
  menu.append(group);
  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    setPanelOptionsMenuOpen(controls, !expanded);
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setDeviceMenuOpen(false);
    setLayoutMenuOpen(false);
    setWindowMenuOpen(false);
    setAddMenuOpen(false);
    setAssetViewMenuOpen(false);
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
    setInstanceContextMenuOpen(false);
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
  controls.append(menuButton, menu);
  header.append(controls);
}

export function startDockPanelDrag(event, panelId) {
  if (isDockPanelInteractiveTarget(event.target)) {
    event.preventDefault();
    return;
  }

  state.dockDragPanelId = panelId;
  els.appShell.classList.add("is-dock-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-pixi-ui-panel-id", panelId);
  event.currentTarget.closest(".dock-panel")?.classList.add("is-dragging");
}

export function handleDockPanelHeaderPointerDown(event) {
  if (!isDockPanelInteractiveTarget(event.target)) {
    return;
  }

  const header = event.currentTarget;
  header.draggable = false;
  const restoreDrag = () => {
    header.draggable = true;
    window.removeEventListener("pointerup", restoreDrag);
    window.removeEventListener("pointercancel", restoreDrag);
  };
  window.addEventListener("pointerup", restoreDrag, { once: true });
  window.addEventListener("pointercancel", restoreDrag, { once: true });
}

export function isDockPanelInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest("button, input, select, textarea, label, .dropdown-menu"));
}

export function finishDockPanelDrag() {
  state.dockDragPanelId = null;
  els.appShell.classList.remove("is-dock-dragging");
  clearDockDropTargets();
}

export function handleDockZoneDragOver(event) {
  const panelId = getDraggedPanelId(event);
  if (!panelId) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearDockDropTargets();
  event.currentTarget.classList.add("is-dock-target");
}

export function handleDockZoneDrop(event) {
  const panelId = getDraggedPanelId(event);
  if (!panelId) {
    return;
  }

  event.preventDefault();
  const zone = event.currentTarget;
  const zoneName = zone.dataset.dockZone;
  moveDockPanel(panelId, zoneName, getDockInsertIndex(zone, event, panelId));
  finishDockPanelDrag();
}

export function handleDockZoneDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove("is-dock-target");
  }
}

export function getDraggedPanelId(event) {
  return event.dataTransfer?.getData("application/x-pixi-ui-panel-id") || state.dockDragPanelId || null;
}

export function getDockInsertIndex(zone, event, draggedPanelId) {
  const zoneName = zone.dataset.dockZone;
  const panelIds = getPanelIdsForZone(zoneName).filter((panelId) => panelId !== draggedPanelId);
  const horizontal = zoneName === "bottom";

  for (const [index, panelId] of panelIds.entries()) {
    const panel = getPanelElement(panelId);
    if (!panel || panel.hidden) {
      continue;
    }
    const rect = panel.getBoundingClientRect();
    const midpoint = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const pointer = horizontal ? event.clientX : event.clientY;
    if (pointer < midpoint) {
      return index;
    }
  }

  return panelIds.length;
}

export function moveDockPanel(panelId, zoneName, index = 0) {
  if (!PANEL_DEFINITIONS[panelId] || !DOCK_ZONE_NAMES.includes(zoneName)) {
    return false;
  }

  const panels = normalizePanelLayout(state.layout.panels);
  const ordered = getPanelIdsForZone(zoneName, panels).filter((candidate) => candidate !== panelId);
  ordered.splice(clamp(index, 0, ordered.length), 0, panelId);
  for (const [order, candidate] of ordered.entries()) {
    panels[candidate] = {
      ...panels[candidate],
      zone: zoneName,
      order,
      visible: candidate === panelId ? true : panels[candidate].visible
    };
  }
  panels[panelId] = {
    ...panels[panelId],
    zone: zoneName,
    size: undefined,
    visible: true
  };

  state.layout = {
    ...state.layout,
    panels,
    ...getUncollapsedZoneState(zoneName)
  };
  saveLayoutState();
  applyLayoutState();
  return true;
}

export function clearDockDropTargets() {
  els.dockZones.forEach((zone) => zone.classList.remove("is-dock-target"));
  els.dockPanels.forEach((panel) => panel.classList.remove("is-dragging"));
}

export function updateLayoutFromDrag(resizeTarget, start, event) {
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  const next = { ...state.layout };

  if (resizeTarget === "left") {
    next.leftCollapsed = false;
    next.leftPanelWidth = clamp(start.layout.leftPanelWidth + dx, 180, 560);
  }

  if (resizeTarget === "right") {
    next.rightCollapsed = false;
    next.rightPanelWidth = clamp(start.layout.rightPanelWidth - dx, 260, 680);
  }

  if (resizeTarget === "bottom") {
    next.bottomCollapsed = false;
    next.bottomPanelHeight = clamp(start.layout.bottomPanelHeight - dy, 96, 460);
  }

  if (resizeTarget === "validation") {
    next.rightCollapsed = false;
    next.validationPanelHeight = clamp(start.layout.validationPanelHeight - dy, 88, 420);
  }

  state.layout = next;
  applyLayoutState();
}

export function applyLayoutState() {
  const layout = normalizeLayoutState(state.layout);
  state.layout = layout;

  const emptyZones = applyDockLayout();
  const collapsedZones = {
    left: layout.leftCollapsed || emptyZones.left,
    right: layout.rightCollapsed || emptyZones.right,
    bottom: layout.bottomCollapsed || emptyZones.bottom
  };
  const dockDragging = Boolean(state.dockDragPanelId);

  els.appShell.style.setProperty("--left-panel-width", `${collapsedZones.left ? (dockDragging ? 120 : 0) : layout.leftPanelWidth}px`);
  els.appShell.style.setProperty("--right-panel-width", `${collapsedZones.right ? (dockDragging ? 120 : 0) : layout.rightPanelWidth}px`);
  els.appShell.style.setProperty("--bottom-panel-height", `${collapsedZones.bottom ? (dockDragging ? 82 : 0) : layout.bottomPanelHeight}px`);
  els.appShell.style.setProperty("--left-splitter-size", collapsedZones.left && !dockDragging ? "0px" : "var(--splitter-size)");
  els.appShell.style.setProperty("--right-splitter-size", collapsedZones.right && !dockDragging ? "0px" : "var(--splitter-size)");
  els.appShell.style.setProperty("--bottom-splitter-size", collapsedZones.bottom && !dockDragging ? "0px" : "var(--splitter-size)");
  els.appShell.style.setProperty("--validation-panel-height", `${layout.validationPanelHeight}px`);
  els.appShell.style.setProperty("--asset-folder-width", `${layout.assetFolderWidth}px`);
  els.appShell.style.setProperty("--asset-tile-size", `${layout.assetTileSize}px`);
  els.appShell.classList.toggle("is-left-collapsed", collapsedZones.left);
  els.appShell.classList.toggle("is-right-collapsed", collapsedZones.right);
  els.appShell.classList.toggle("is-bottom-collapsed", collapsedZones.bottom);

  els.toggleLeftPanelButton.textContent = collapsedZones.left ? "Show left panel" : "Hide left panel";
  els.toggleRightPanelButton.textContent = collapsedZones.right ? "Show right panel" : "Hide right panel";
  els.toggleBottomPanelButton.textContent = collapsedZones.bottom ? "Show bottom panel" : "Hide bottom panel";
  els.assetTileSizeSlider.value = String(layout.assetTileSize);
  if (els.assetTileSizeValue) {
    els.assetTileSizeValue.textContent = `${layout.assetTileSize}px`;
  }
  syncAssetViewMenu();
  renderWindowMenu();

  requestAnimationFrame(renderCanvas);
}

export function togglePanel(key) {
  state.layout = {
    ...state.layout,
    [key]: !state.layout[key]
  };
  saveLayoutState();
  applyLayoutState();
}

export function applyDockLayout() {
  const panels = normalizePanelLayout(state.layout.panels);
  state.layout.panels = panels;
  const emptyZones = {};

  for (const zoneName of DOCK_ZONE_NAMES) {
    const zone = getDockZoneElement(zoneName);
    if (!zone) {
      continue;
    }
    zone.querySelectorAll(".dock-panel-resize").forEach((handle) => handle.remove());

    const panelIds = getPanelIdsForZone(zoneName, panels);
    const visiblePanelIds = panelIds.filter((panelId) => panels[panelId].visible !== false);
    emptyZones[zoneName] = visiblePanelIds.length === 0;
    zone.classList.toggle("is-empty", emptyZones[zoneName]);

    for (const panelId of panelIds) {
      const panel = getPanelElement(panelId);
      if (!panel) {
        continue;
      }
      panel.hidden = panels[panelId].visible === false;
      const size = Number(panels[panelId].size);
      if (visiblePanelIds.length > 1 && Number.isFinite(size) && size > 0) {
        panel.style.flex = `0 0 ${size}px`;
      } else {
        panel.style.flex = "";
      }
      zone.append(panel);
    }

    for (const [index, panelId] of visiblePanelIds.slice(0, -1).entries()) {
      const nextPanelId = visiblePanelIds[index + 1];
      const nextPanel = getPanelElement(nextPanelId);
      if (!nextPanel) {
        continue;
      }
      zone.insertBefore(createDockPanelResizeHandle(panelId, nextPanelId, zoneName), nextPanel);
    }
  }

  return emptyZones;
}

export function createDockPanelResizeHandle(beforePanelId, afterPanelId, zoneName) {
  const handle = document.createElement("div");
  handle.className = `dock-panel-resize dock-panel-resize-${zoneName === "bottom" ? "vertical" : "horizontal"}`;
  handle.dataset.beforePanelId = beforePanelId;
  handle.dataset.afterPanelId = afterPanelId;
  handle.dataset.dockZone = zoneName;
  handle.title = "Resize windows";
  handle.addEventListener("pointerdown", startDockPanelResize);
  return handle;
}

export function startDockPanelResize(event) {
  event.preventDefault();
  const handle = event.currentTarget;
  const zoneName = handle.dataset.dockZone;
  const beforePanel = getPanelElement(handle.dataset.beforePanelId);
  const afterPanel = getPanelElement(handle.dataset.afterPanelId);
  if (!beforePanel || !afterPanel) {
    return;
  }

  const horizontal = zoneName === "bottom";
  const beforeRect = beforePanel.getBoundingClientRect();
  const afterRect = afterPanel.getBoundingClientRect();
  const start = {
    x: event.clientX,
    y: event.clientY,
    beforePanelId: handle.dataset.beforePanelId,
    afterPanelId: handle.dataset.afterPanelId,
    beforeSize: horizontal ? beforeRect.width : beforeRect.height,
    afterSize: horizontal ? afterRect.width : afterRect.height,
    horizontal
  };

  handle.classList.add("is-active");
  els.appShell.classList.add("is-resizing");
  handle.setPointerCapture?.(event.pointerId);

  const onPointerMove = (moveEvent) => updateDockPanelResize(start, moveEvent);
  const onPointerUp = () => {
    handle.classList.remove("is-active");
    els.appShell.classList.remove("is-resizing");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    saveLayoutState();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp, { once: true });
}

export function updateDockPanelResize(start, event) {
  const delta = start.horizontal ? event.clientX - start.x : event.clientY - start.y;
  const total = start.beforeSize + start.afterSize;
  const minSize = 96;
  const beforeSize = clamp(start.beforeSize + delta, minSize, Math.max(minSize, total - minSize));
  const afterSize = Math.max(minSize, total - beforeSize);
  const panels = normalizePanelLayout(state.layout.panels);

  panels[start.beforePanelId] = {
    ...panels[start.beforePanelId],
    size: beforeSize
  };
  panels[start.afterPanelId] = {
    ...panels[start.afterPanelId],
    size: afterSize
  };

  state.layout = {
    ...state.layout,
    panels
  };
  applyLayoutState();
}

export function renderWindowMenu() {
  const panels = normalizePanelLayout(state.layout.panels);
  const fragment = document.createDocumentFragment();

  for (const [panelId, definition] of Object.entries(PANEL_DEFINITIONS)) {
    const panelState = panels[panelId];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "window-menu-item";
    button.dataset.windowPanel = panelId;

    const mark = document.createElement("span");
    mark.textContent = panelState.visible === false ? "" : "✓";
    const label = document.createElement("span");
    label.textContent = definition.title;
    const zone = document.createElement("span");
    zone.className = "window-menu-zone";
    zone.textContent = formatDockZoneName(panelState.zone);

    button.append(mark, label, zone);
    fragment.append(button);
  }

  els.windowMenuList.replaceChildren(fragment);
}

export function setDockPanelVisible(panelId, visible) {
  if (!PANEL_DEFINITIONS[panelId]) {
    return false;
  }

  const panels = normalizePanelLayout(state.layout.panels);
  panels[panelId] = {
    ...panels[panelId],
    visible
  };

  state.layout = {
    ...state.layout,
    panels,
    ...(visible ? getUncollapsedZoneState(panels[panelId].zone) : {})
  };
  saveLayoutState();
  applyLayoutState();
  return true;
}

export function toggleDockPanelVisibility(panelId) {
  const panels = normalizePanelLayout(state.layout.panels);
  return setDockPanelVisible(panelId, panels[panelId]?.visible === false);
}

export function getPanelIdsForZone(zoneName, panels = state.layout.panels) {
  const normalized = panels || createDefaultPanelLayout();
  return Object.keys(PANEL_DEFINITIONS)
    .filter((panelId) => normalized[panelId]?.zone === zoneName)
    .sort((a, b) => (normalized[a]?.order || 0) - (normalized[b]?.order || 0));
}

export function getDockZoneElement(zoneName) {
  return document.querySelector(`[data-dock-zone="${zoneName}"]`);
}

export function getPanelElement(panelId) {
  return document.querySelector(`[data-panel-id="${panelId}"]`);
}

export function getUncollapsedZoneState(zoneName) {
  if (zoneName === "left") {
    return { leftCollapsed: false };
  }
  if (zoneName === "right") {
    return { rightCollapsed: false };
  }
  if (zoneName === "bottom") {
    return { bottomCollapsed: false };
  }
  return {};
}

export function formatDockZoneName(zoneName) {
  if (zoneName === "left") {
    return "Left";
  }
  if (zoneName === "right") {
    return "Right";
  }
  if (zoneName === "bottom") {
    return "Bottom";
  }
  return "Dock";
}

export function applyDeviceProfile(profileId) {
  const profile = DEVICE_PROFILES[profileId];
  return applyDeviceProfileObject(profile, profileId);
}

export function applyCustomDeviceProfile() {
  const width = Number(els.customDeviceWidth.value);
  const height = Number(els.customDeviceHeight.value);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  return applyDeviceProfileObject({
    name: els.customDeviceName.value.trim() || "Custom",
    width: roundCanvasNumber(width),
    height: roundCanvasNumber(height),
    orientation: width >= height ? "landscape" : "portrait",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  }, "custom");
}

export function applyDeviceProfileObject(profile, profileId) {
  const page = getActivePage();
  if (!profile || !page) {
    return false;
  }

  runCommand({
    type: "page.update",
    args: {
      pageId: page.id,
      canvas: {
        width: profile.width,
        height: profile.height,
        orientation: profile.orientation,
        safeArea: profile.safeArea
      },
      rootTransform: {
        width: profile.width,
        height: profile.height
      },
      editorMeta: {
        deviceProfileId: profileId,
        deviceProfileName: profile.name
      }
    },
    meta: { source: "user", label: `Apply ${profile.name}` }
  });
  return true;
}

