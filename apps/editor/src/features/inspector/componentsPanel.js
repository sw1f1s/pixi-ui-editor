import {
  EDITABLE_NODE_COMPONENTS,
  els,
  isComponentInstanceNode,
  getNodeComponents
} from "./deps.js";
import { withInspectorAppendTarget } from "./context.js";
import { addNodeComponentFields } from "./componentFields.js";
import { getNodeComponentLabel } from "./componentRegistry.js";
import { positionFloatingElement } from "./floatingPosition.js";
import { getComponentValidationMessages } from "./componentValidation.js";
import {
  addSelectedNodeComponent,
  removeSelectedNodeComponent,
  reorderSelectedNodeComponent,
  setSelectedNodeComponentEnabled
} from "./componentMutations.js";

export function addNodeComponentCards(node) {
  const components = getNodeComponents(node);
  const section = document.createElement("section");
  section.className = "inspector-components";

  const header = document.createElement("div");
  header.className = "inspector-components-header";
  const title = document.createElement("div");
  title.className = "inspector-section-title";
  title.textContent = "Components";
  const count = document.createElement("span");
  count.className = "inspector-components-count";
  count.textContent = components.length ? `${components.length} added` : "empty";
  header.append(title, count);
  section.append(header);

  if (components.length) {
    for (const [index, component] of components.entries()) {
      section.append(createNodeComponentCard(node, component, index, components.length));
    }
  } else {
    const empty = document.createElement("p");
    empty.className = "component-stack-empty";
    empty.textContent = "No components on this object.";
    section.append(empty);
  }

  if (!isComponentInstanceNode(node)) {
    section.append(createAddComponentFooter(node, components));
  }
  els.inspectorForm.append(section);
}

export function createNodeComponentCard(node, component, index = 0, total = 1) {
  const enabled = component.enabled !== false;
  const labelText = getNodeComponentLabel(component.type);
  const card = document.createElement("section");
  card.className = `inspector-component-card${enabled ? "" : " is-disabled"}`;
  card.dataset.componentType = component.type;

  const header = document.createElement("div");
  header.className = "component-card-header";
  const enabledToggle = document.createElement("input");
  enabledToggle.type = "checkbox";
  enabledToggle.className = "component-card-enabled";
  enabledToggle.checked = enabled;
  enabledToggle.title = enabled ? `Disable ${getNodeComponentLabel(component.type)}` : `Enable ${getNodeComponentLabel(component.type)}`;
  enabledToggle.setAttribute("aria-label", enabledToggle.title);
  enabledToggle.addEventListener("click", (event) => event.stopPropagation());
  enabledToggle.addEventListener("change", () => {
    setSelectedNodeComponentEnabled(component.type, enabledToggle.checked);
  });
  const titleBlock = document.createElement("div");
  titleBlock.className = "component-card-title";
  const title = document.createElement("strong");
  title.textContent = labelText;
  const meta = document.createElement("span");
  meta.textContent = enabled ? component.type : `${component.type} · disabled`;
  titleBlock.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "component-card-actions";

  const moveUp = createComponentIconButton("↑", `Move ${labelText} up`);
  moveUp.disabled = index <= 0;
  moveUp.addEventListener("click", () => reorderSelectedNodeComponent(component.type, "up"));

  const moveDown = createComponentIconButton("↓", `Move ${labelText} down`);
  moveDown.disabled = index >= total - 1;
  moveDown.addEventListener("click", () => reorderSelectedNodeComponent(component.type, "down"));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "component-card-remove";
  remove.textContent = "×";
  remove.title = `Remove ${labelText}`;
  remove.setAttribute("aria-label", `Remove ${labelText} component`);
  remove.addEventListener("click", () => removeSelectedNodeComponent(component.type));
  actions.append(moveUp, moveDown, remove);
  header.append(enabledToggle, titleBlock, actions);

  const body = document.createElement("div");
  body.className = "component-card-body";
  const validationMessages = enabled ? getComponentValidationMessages(node, component.type) : [];
  if (validationMessages.length) {
    body.append(createComponentValidationList(validationMessages));
  }
  if (enabled) {
    withInspectorAppendTarget(body, () => {
      addNodeComponentFields(node, component.type);
    });
  } else {
    const disabled = document.createElement("p");
    disabled.className = "component-stack-empty";
    disabled.textContent = "Component disabled.";
    body.append(disabled);
  }

  card.append(header, body);
  return card;
}

export function createComponentValidationList(messages) {
  const list = document.createElement("div");
  list.className = "component-validation-list";
  for (const message of messages) {
    const item = document.createElement("div");
    item.className = `component-validation-message ${message.severity || "warning"}`;
    item.textContent = message.message;
    if (message.code) {
      item.title = message.code;
    }
    list.append(item);
  }
  return list;
}

function createComponentIconButton(text, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "component-card-icon-button";
  button.textContent = text;
  button.title = label;
  button.setAttribute("aria-label", label);
  return button;
}

export function createAddComponentFooter(node, components) {
  const presentTypes = new Set(components.map((component) => component.type));
  const availableTypes = EDITABLE_NODE_COMPONENTS.filter((type) => !presentTypes.has(type));
  const addRow = document.createElement("div");
  addRow.className = "component-add-row";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "component-add-button";
  addButton.textContent = availableTypes.length ? "Add Component" : "All Components Added";
  addButton.disabled = availableTypes.length === 0;
  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openComponentAddMenu(node, addButton);
  });
  addRow.append(addButton);
  return addRow;
}

export function openComponentAddMenu(node, trigger) {
  const availableTypes = getAvailableNodeComponentTypes(node);
  if (!availableTypes.length) {
    return false;
  }

  closeComponentAddMenus();

  const popover = document.createElement("div");
  popover.className = "component-add-popover";
  popover.setAttribute("role", "menu");
  popover.addEventListener("click", (event) => event.stopPropagation());

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search component";
  search.setAttribute("aria-label", "Search components");
  search.className = "component-add-search";

  const list = document.createElement("div");
  list.className = "component-add-list";

  const renderResults = () => {
    renderComponentAddResults(list, availableTypes, search.value);
  };
  search.addEventListener("input", renderResults);

  popover.append(search, list);
  document.body.append(popover);
  renderResults();
  positionComponentAddPopover(trigger, popover);
  search.focus();
  return true;
}

export function renderComponentAddResults(list, componentTypes, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const matches = componentTypes.filter((type) => {
    const label = getNodeComponentLabel(type).toLowerCase();
    return !normalizedQuery || label.includes(normalizedQuery) || type.toLowerCase().includes(normalizedQuery);
  });

  list.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "component-add-empty";
    empty.textContent = "No matching components";
    list.append(empty);
    return;
  }

  for (const type of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.className = "component-add-option";
    const label = document.createElement("span");
    label.textContent = getNodeComponentLabel(type);
    const meta = document.createElement("span");
    meta.textContent = type;
    button.append(label, meta);
    button.addEventListener("click", () => {
      closeComponentAddMenus();
      addSelectedNodeComponent(type);
    });
    list.append(button);
  }
}

export function positionComponentAddPopover(trigger, popover) {
  positionFloatingElement(trigger, popover);
}

export function closeComponentAddMenus() {
  document.querySelectorAll(".component-add-popover")
    .forEach((popover) => popover.remove());
}

export function getAvailableNodeComponentTypes(node) {
  if (isComponentInstanceNode(node)) {
    return [];
  }
  const presentTypes = new Set(getNodeComponents(node).map((component) => component.type));
  return EDITABLE_NODE_COMPONENTS.filter((type) => !presentTypes.has(type));
}
