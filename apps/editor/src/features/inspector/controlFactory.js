export function createLabeledField(label, className = "field") {
  const field = document.createElement("div");
  field.className = className;
  const title = document.createElement("label");
  title.textContent = label;
  field.append(title);
  return field;
}

export function createTextInput(type, value) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  return input;
}

export function createSelect(options, value) {
  const select = document.createElement("select");
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    select.append(option);
  }
  select.value = String(value);
  return select;
}

export function createFieldGrid(fields, createField, options = {}) {
  const row = document.createElement("div");
  const columnCount = Math.max(1, fields.length);
  row.className = options.countClass === false
    ? "field-grid"
    : `field-grid field-grid-${columnCount}`;
  row.append(...fields.map((field) => createField(...field)));
  return row;
}
