export const MIN_NODE_SIZE = 8;

export function moveTransform(transform, dx, dy) {
  return {
    x: roundCanvasNumber(transform.x + dx),
    y: roundCanvasNumber(transform.y + dy),
    width: transform.width,
    height: transform.height
  };
}

export function resizeTransform(transform, handle, dx, dy) {
  let x = transform.x;
  let y = transform.y;
  let width = transform.width;
  let height = transform.height;
  const right = transform.x + transform.width;
  const bottom = transform.y + transform.height;

  if (handle.includes("e")) {
    width = transform.width + dx;
  }

  if (handle.includes("s")) {
    height = transform.height + dy;
  }

  if (handle.includes("w")) {
    x = transform.x + dx;
    width = transform.width - dx;
  }

  if (handle.includes("n")) {
    y = transform.y + dy;
    height = transform.height - dy;
  }

  if (width < MIN_NODE_SIZE) {
    width = MIN_NODE_SIZE;
    if (handle.includes("w")) {
      x = right - MIN_NODE_SIZE;
    }
  }

  if (height < MIN_NODE_SIZE) {
    height = MIN_NODE_SIZE;
    if (handle.includes("n")) {
      y = bottom - MIN_NODE_SIZE;
    }
  }

  return {
    x: roundCanvasNumber(x),
    y: roundCanvasNumber(y),
    width: roundCanvasNumber(width),
    height: roundCanvasNumber(height)
  };
}

export function roundCanvasNumber(value) {
  return Math.round(Number(value || 0));
}
