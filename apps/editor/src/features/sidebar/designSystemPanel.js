import { els, getComponentById, getComponentDisplayName, getComponentReferenceId, getProjectStyleLibrarySummary, getSelectedNode, isComponentInstanceNode, renderCanvas, runCommand, state } from "./deps.js";

const TOKEN_GROUPS = Object.freeze(["colors", "spacing", "typography", "radii", "animation"]);

export function renderDesignSystem() {
  if (!els.designSystemPanel || !els.designThemeSelect) {
    return;
  }

  syncThemeSelect();
  const summary = getProjectStyleLibrarySummary();
  const children = [
    createSummary(summary),
    createTokenSection(),
    createThemeSection(),
    createComponentApiSection(),
    createStyleLibrarySection()
  ];
  els.designSystemPanel.replaceChildren(...children);
}

function syncThemeSelect() {
  const themes = Array.isArray(state.project.themes) ? state.project.themes : [];
  const current = state.previewTheme || "default";
  const options = [
    option("default", "Default"),
    ...themes.map((theme) => option(theme.id || theme.name, theme.name || theme.id))
  ];
  els.designThemeSelect.replaceChildren(...options);
  els.designThemeSelect.value = themes.some((theme) => (theme.id || theme.name) === current) ? current : "default";
  els.designThemeSelect.onchange = () => {
    state.previewTheme = els.designThemeSelect.value || "default";
    renderCanvas();
  };
}

function createSummary(summary) {
  const section = createSection("Library");
  const grid = document.createElement("div");
  grid.className = "design-summary-grid";
  grid.append(
    createSummaryItem("Tokens", summary.totalTokens),
    createSummaryItem("Themes", summary.themes),
    createSummaryItem("Libraries", summary.styleLibraries)
  );
  section.append(grid);
  return section;
}

function createTokenSection() {
  const section = createSection("Tokens");
  const form = document.createElement("form");
  form.className = "design-inline-form";
  const group = document.createElement("select");
  group.setAttribute("aria-label", "Token group");
  group.append(...TOKEN_GROUPS.map((name) => option(name, name)));
  const name = input("Name", "text");
  const value = input("Value", "text");
  const add = button("Add", "submit");
  form.append(group, name, value, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const tokenName = name.value.trim();
    if (!tokenName) {
      return;
    }
    runCommand({
      type: "project.set_token",
      args: {
        group: group.value,
        name: tokenName,
        value: normalizeTokenEditorValue(value.value)
      },
      meta: { source: "user", label: `Set ${group.value}.${tokenName}` }
    });
  });

  const list = document.createElement("div");
  list.className = "design-record-list";
  const entries = getTokenEntries();
  if (!entries.length) {
    list.append(empty("No tokens"));
  } else {
    list.append(...entries.map(([tokenGroup, tokenName, tokenValue]) => createRecordRow({
      title: `${tokenGroup}.${tokenName}`,
      meta: formatTokenValue(tokenValue),
      dangerLabel: "Delete",
      onDelete: () => runCommand({
        type: "project.delete_token",
        args: { group: tokenGroup, name: tokenName },
        meta: { source: "user", label: `Delete ${tokenGroup}.${tokenName}` }
      })
    })));
  }

  section.append(form, list);
  return section;
}

function createThemeSection() {
  const section = createSection("Themes");
  const form = document.createElement("form");
  form.className = "design-inline-form design-inline-form-compact";
  const name = input("Theme name", "text");
  const add = button("Create", "submit");
  form.append(name, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const themeName = name.value.trim();
    if (!themeName) {
      return;
    }
    runCommand({
      type: "project.create_theme",
      args: {
        id: createRecordId("theme", themeName),
        name: themeName,
        tokens: {}
      },
      meta: { source: "user", label: `Create ${themeName} theme` }
    });
  });

  const overrideForm = createThemeOverrideForm();
  const list = document.createElement("div");
  list.className = "design-record-list";
  const themes = Array.isArray(state.project.themes) ? state.project.themes : [];
  if (!themes.length) {
    list.append(empty("No themes"));
  } else {
    list.append(...themes.map((theme) => createRecordRow({
      title: theme.name || theme.id,
      meta: theme.id,
      dangerLabel: "Delete",
      onDelete: () => runCommand({
        type: "project.delete_theme",
        args: { themeId: theme.id },
        meta: { source: "user", label: `Delete ${theme.name || theme.id} theme` }
      })
    })));
  }
  section.append(form);
  if (overrideForm) {
    section.append(overrideForm);
  }
  section.append(list);
  return section;
}

function createThemeOverrideForm() {
  const themes = Array.isArray(state.project.themes) ? state.project.themes : [];
  if (!themes.length) {
    return null;
  }

  const form = document.createElement("form");
  form.className = "design-inline-form";
  const theme = document.createElement("select");
  theme.setAttribute("aria-label", "Theme");
  theme.append(...themes.map((item) => option(item.id, item.name || item.id)));
  const group = document.createElement("select");
  group.setAttribute("aria-label", "Token group");
  group.append(...TOKEN_GROUPS.map((name) => option(name, name)));
  const name = input("Token", "text");
  const value = input("Value", "text");
  const add = button("Override", "submit");
  form.append(theme, group, name, value, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const tokenName = name.value.trim();
    if (!tokenName) {
      return;
    }
    runCommand({
      type: "project.update_theme",
      args: {
        themeId: theme.value,
        patch: { tokens: { [group.value]: { [tokenName]: normalizeTokenEditorValue(value.value) } } }
      },
      meta: { source: "user", label: `Set ${theme.value}.${group.value}.${tokenName}` }
    });
  });
  return form;
}

function createComponentApiSection() {
  const section = createSection("Component API");
  const components = Array.isArray(state.project.components) ? state.project.components : [];
  if (!components.length) {
    section.append(empty("No instances"));
    return section;
  }

  const selectedComponentId = getSelectedComponentApiId(components);
  const component = getComponentById(selectedComponentId) || components[0];
  state.designSystemComponentId = component.id;

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Component");
  select.append(...components.map((item) => option(item.id, getComponentDisplayName(item))));
  select.value = component.id;
  select.addEventListener("change", () => {
    state.designSystemComponentId = select.value;
    renderDesignSystem();
  });

  section.append(select, createVariantEditor(component), createExposedPropsEditor(component));
  return section;
}

function getSelectedComponentApiId(components) {
  if (state.designSystemComponentId && components.some((component) => component.id === state.designSystemComponentId)) {
    return state.designSystemComponentId;
  }
  const selectedNode = getSelectedNode();
  if (isComponentInstanceNode(selectedNode)) {
    return getComponentReferenceId(selectedNode);
  }
  if (state.editingComponentId) {
    return state.editingComponentId;
  }
  return components[0]?.id;
}

function createVariantEditor(component) {
  const wrapper = document.createElement("div");
  wrapper.className = "design-subsection";
  const title = document.createElement("strong");
  title.textContent = "Variants";
  const form = document.createElement("form");
  form.className = "design-inline-form design-inline-form-compact";
  const name = input("Variant", "text");
  const add = button("Add", "submit");
  form.append(name, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const variantName = name.value.trim();
    if (!variantName) {
      return;
    }
    runCommand({
      type: "component.create_variant",
      args: {
        componentId: component.id,
        id: createRecordId("variant", variantName),
        name: variantName,
        overrides: {}
      },
      meta: { source: "user", label: `Create ${variantName} variant` }
    });
  });

  const list = document.createElement("div");
  list.className = "design-record-list";
  const variants = Array.isArray(component.variants) ? component.variants : [];
  list.append(...(variants.length ? variants.map((variant) => createRecordRow({
    title: variant.name || variant.id,
    meta: variant.id,
    dangerLabel: "Delete",
    onDelete: () => runCommand({
      type: "component.delete_variant",
      args: { componentId: component.id, variantId: variant.id },
      meta: { source: "user", label: `Delete ${variant.name || variant.id} variant` }
    })
  })) : [empty("No variants")]));
  wrapper.append(title, form, list);
  return wrapper;
}

function createExposedPropsEditor(component) {
  const wrapper = document.createElement("div");
  wrapper.className = "design-subsection";
  const title = document.createElement("strong");
  title.textContent = "Exposed Props";
  const form = document.createElement("form");
  form.className = "design-inline-form";
  const propName = input("Prop", "text");
  const type = document.createElement("select");
  type.setAttribute("aria-label", "Prop type");
  type.append(
    option("string", "String"),
    option("number", "Number"),
    option("boolean", "Boolean"),
    option("color", "Color")
  );
  const path = input("target.path", "text");
  const add = button("Add", "submit");
  form.append(propName, type, path, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = propName.value.trim();
    if (!name) {
      return;
    }
    const nextProps = {
      ...(component.exposedProps || {}),
      [name]: {
        type: type.value,
        path: path.value.trim()
      }
    };
    runCommand({
      type: "component.update_exposed_props",
      args: {
        componentId: component.id,
        exposedProps: nextProps
      },
      meta: { source: "user", label: `Expose ${name} on ${getComponentDisplayName(component)}` }
    });
  });

  const list = document.createElement("div");
  list.className = "design-record-list";
  const entries = Object.entries(component.exposedProps || {});
  list.append(...(entries.length ? entries.map(([name, definition]) => {
    const nextProps = { ...(component.exposedProps || {}) };
    delete nextProps[name];
    return createRecordRow({
      title: name,
      meta: formatExposedPropMeta(definition),
      dangerLabel: "Delete",
      onDelete: () => runCommand({
        type: "component.update_exposed_props",
        args: {
          componentId: component.id,
          exposedProps: nextProps
        },
        meta: { source: "user", label: `Delete exposed prop ${name}` }
      })
    });
  }) : [empty("No exposed props")]));
  wrapper.append(title, form, list);
  return wrapper;
}

function createStyleLibrarySection() {
  const section = createSection("Style Libraries");
  const form = document.createElement("form");
  form.className = "design-inline-form design-inline-form-compact";
  const name = input("Library name", "text");
  const add = button("Create", "submit");
  form.append(name, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const libraryName = name.value.trim();
    if (!libraryName) {
      return;
    }
    runCommand({
      type: "project.create_style_library",
      args: {
        id: createRecordId("library", libraryName),
        name: libraryName,
        tokens: {},
        themes: [],
        components: []
      },
      meta: { source: "user", label: `Create ${libraryName} style library` }
    });
  });

  const list = document.createElement("div");
  list.className = "design-record-list";
  const libraries = Array.isArray(state.project.styleLibraries) ? state.project.styleLibraries : [];
  if (!libraries.length) {
    list.append(empty("No style libraries"));
  } else {
    list.append(...libraries.map((library) => createRecordRow({
      title: library.name || library.id,
      meta: `${Object.keys(library.tokens || {}).length} token groups`,
      dangerLabel: "Delete",
      actions: [
        ["Capture", () => runCommand({
          type: "project.update_style_library",
          args: {
            libraryId: library.id,
            patch: {
              tokens: state.project.tokens || {},
              themes: state.project.themes || [],
              components: state.project.components || []
            }
          },
          meta: { source: "user", label: `Capture ${library.name || library.id} style library` }
        })],
        ["Apply", () => runCommand({
          type: "project.apply_style_library",
          args: { libraryId: library.id },
          meta: { source: "user", label: `Apply ${library.name || library.id} style library` }
        })]
      ],
      onDelete: () => runCommand({
        type: "project.delete_style_library",
        args: { libraryId: library.id },
        meta: { source: "user", label: `Delete ${library.name || library.id} style library` }
      })
    })));
  }
  section.append(form, list);
  return section;
}

function getTokenEntries() {
  const tokens = state.project.tokens || {};
  return TOKEN_GROUPS.flatMap((group) => {
    const values = tokens[group] && typeof tokens[group] === "object" && !Array.isArray(tokens[group])
      ? tokens[group]
      : {};
    return Object.entries(values).map(([name, value]) => [group, name, value]);
  });
}

function createSection(title) {
  const section = document.createElement("section");
  section.className = "design-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);
  return section;
}

function createSummaryItem(label, value) {
  const item = document.createElement("div");
  const number = document.createElement("strong");
  number.textContent = String(value || 0);
  const caption = document.createElement("span");
  caption.textContent = label;
  item.append(number, caption);
  return item;
}

function createRecordRow({ title, meta, dangerLabel, onDelete, actions = [] }) {
  const row = document.createElement("div");
  row.className = "design-record-row";
  const info = document.createElement("span");
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("small");
  small.textContent = meta || "";
  info.append(strong, small);
  const controls = document.createElement("span");
  controls.className = "design-record-actions";
  for (const [label, action] of actions) {
    const actionButton = button(label, "button");
    actionButton.addEventListener("click", action);
    controls.append(actionButton);
  }
  if (dangerLabel && onDelete) {
    const remove = button(dangerLabel, "button");
    remove.className = "context-menu-danger";
    remove.addEventListener("click", onDelete);
    controls.append(remove);
  }
  row.append(info, controls);
  return row;
}

function input(placeholder, type) {
  const element = document.createElement("input");
  element.type = type;
  element.placeholder = placeholder;
  element.setAttribute("aria-label", placeholder);
  return element;
}

function button(label, type) {
  const element = document.createElement("button");
  element.type = type;
  element.textContent = label;
  return element;
}

function option(value, label) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function empty(text) {
  const element = document.createElement("div");
  element.className = "empty-list-message";
  element.textContent = text;
  return element;
}

function normalizeTokenEditorValue(value) {
  const text = String(value || "").trim();
  const number = Number(text);
  return text !== "" && Number.isFinite(number) ? number : text;
}

function formatTokenValue(value) {
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatExposedPropMeta(definition) {
  if (definition && typeof definition === "object") {
    return [definition.type, definition.path || definition.targetPath || definition.binding].filter(Boolean).join(" · ");
  }
  return String(definition || "");
}

function createRecordId(prefix, value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${slug || Date.now()}`;
}
