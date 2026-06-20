import { canCreateInstanceFromSelectedLayer, clearLayerDropIndicators, els, enterComponentEditMode, getComponentById, getComponentDisplayName, getComponentSummary, getComponentUsageEntries, getSelectedNode, renameComponentDefinition, setAddMenuOpen, setAssetContextMenuOpen, setCanvasContextMenuOpen, setDeviceMenuOpen, setHistoryMenuOpen, setInstanceContextMenuOpen, setLayoutMenuOpen, setPageContextMenuOpen, setProjectMenuOpen, setWindowMenuOpen, state } from "./deps.js";

export function renderComponents() {
  const selected = getSelectedNode();
  els.createComponentButton.disabled = !canCreateInstanceFromSelectedLayer(selected);
  const query = String(els.instanceSearchInput.value || "").trim().toLowerCase();
  const components = (state.project.components || [])
    .filter((component) => !query || getComponentSearchText(component).includes(query));
  const children = [];

  if (!state.project.components.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list-message";
    empty.textContent = "Create from a layer context menu";
    children.push(empty);
    els.componentsList.replaceChildren(...children);
    return;
  }

  if (!components.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list-message";
    empty.textContent = "No instances found";
    children.push(empty);
    els.componentsList.replaceChildren(...children);
    return;
  }

  children.push(...components.map((component) => {
    const summary = getComponentSummary(component);
    const item = document.createElement("div");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.className = `component-item${state.editingComponentId === component.id ? " is-editing" : ""}`;
    item.draggable = state.renamingComponentId !== component.id;
    item.dataset.componentId = component.id;
    item.title = getComponentDisplayName(component);

    const info = document.createElement("span");
    info.className = "component-info";
    const name = state.renamingComponentId === component.id
      ? createComponentRenameInput(component)
      : document.createElement("strong");
    if (name.tagName !== "INPUT") {
      name.textContent = getComponentDisplayName(component);
    }
    const meta = document.createElement("span");
    meta.textContent = `${summary.nodes} nodes · ${summary.usageCount} usages`;
    info.append(name, meta);

    item.append(info);
    item.addEventListener("dblclick", () => enterComponentEditMode(component.id));
    item.addEventListener("keydown", (event) => {
      if (event.target === item && event.key === "Enter") {
        event.preventDefault();
        enterComponentEditMode(component.id);
      }
    });
    item.addEventListener("contextmenu", (event) => openInstanceContextMenu(event, component));
    item.addEventListener("dragstart", (event) => startComponentDrag(event, component));
    item.addEventListener("dragend", finishComponentDrag);
    return item;
  }));
  els.componentsList.replaceChildren(...children);
}

function getComponentSearchText(component) {
  const summary = getComponentSummary(component);
  return [
    getComponentDisplayName(component),
    component.name,
    component.id,
    ...summary.variantLabels,
    `${summary.usageCount} usages`,
    `${summary.variants} variants`
  ].join(" ").toLowerCase();
}

export function createComponentRenameInput(component) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "component-rename-input";
  input.value = getComponentDisplayName(component);
  input.setAttribute("aria-label", "Instance name");
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("dblclick", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      finishComponentRename(component.id, input.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelComponentRename();
    }
  });
  input.addEventListener("blur", () => {
    finishComponentRename(component.id, input.value);
  });
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  return input;
}

export function startComponentRename(componentId) {
  if (!getComponentById(componentId)) {
    return false;
  }

  state.renamingComponentId = componentId;
  renderComponents();
  return true;
}

export function finishComponentRename(componentId, rawName) {
  if (state.renamingComponentId !== componentId) {
    return false;
  }

  state.renamingComponentId = null;
  const renamed = renameComponentDefinition(componentId, rawName);
  if (!renamed) {
    renderComponents();
  }
  return renamed;
}

export function cancelComponentRename() {
  if (!state.renamingComponentId) {
    return false;
  }

  state.renamingComponentId = null;
  renderComponents();
  return true;
}

export function openInstanceContextMenu(event, component) {
  event.preventDefault();
  event.stopPropagation();
  state.instanceContextComponentId = component?.id || null;
  els.instanceContextSelectUsageButton.hidden = !component || !getComponentUsageEntries(component.id).length;
  setHistoryMenuOpen(false);
  setProjectMenuOpen(false);
  setDeviceMenuOpen(false);
  setLayoutMenuOpen(false);
  setWindowMenuOpen(false);
  setAddMenuOpen(false);
  setCanvasContextMenuOpen(false);
  setAssetContextMenuOpen(false);
  setPageContextMenuOpen(false);
  setInstanceContextMenuOpen(true, {
    x: event.clientX,
    y: event.clientY
  });
}

export function startComponentDrag(event, component) {
  state.componentDragId = component.id;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-pixi-ui-component-id", component.id);
  event.dataTransfer.setData("text/plain", component.id);
}

export function finishComponentDrag() {
  state.componentDragId = null;
  clearLayerDropIndicators();
}
