let idCounter = 0;

export function createId(prefix = "id") {
  idCounter += 1;
  const time = Date.now().toString(36);
  const count = idCounter.toString(36).padStart(4, "0");
  return `${prefix}_${time}_${count}`;
}

export function normalizeIdPrefix(value) {
  return String(value || "id")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "id";
}
