export function createHorizontalAxis(frame, progress) {
  return {
    fillFrame: (childFrame) => ({
      x: 0,
      y: childFrame.y,
      width: Math.max(0, frame.width * progress),
      height: childFrame.height || frame.height
    }),
    fillLayout: () => ({ anchors: { left: 0, centerY: 0 } }),
    thumbFrame: (childFrame) => {
      const x = Math.max(0, (frame.width - childFrame.width) * progress);
      return {
        x,
        y: Math.max(0, (frame.height - childFrame.height) / 2),
        width: childFrame.width,
        height: childFrame.height
      };
    },
    thumbLayout: (childFrame) => ({
      anchors: {
        left: Math.max(0, (frame.width - childFrame.width) * progress),
        centerY: 0
      }
    }),
    progressFrame: () => ({
      x: 0,
      y: 0,
      width: Math.max(0, frame.width * progress),
      height: frame.height
    }),
    progressLayout: () => ({ anchors: { left: 0, top: 0, bottom: 0 } })
  };
}

export function createVerticalAxis(frame, progress) {
  return {
    fillFrame: (childFrame) => {
      const height = Math.max(0, frame.height * progress);
      return {
        x: childFrame.x,
        y: Math.max(0, frame.height - height),
        width: childFrame.width || frame.width,
        height
      };
    },
    fillLayout: () => ({ anchors: { bottom: 0, centerX: 0 } }),
    thumbFrame: (childFrame) => {
      const y = Math.max(0, (frame.height - childFrame.height) * (1 - progress));
      return {
        x: Math.max(0, (frame.width - childFrame.width) / 2),
        y,
        width: childFrame.width,
        height: childFrame.height
      };
    },
    thumbLayout: (childFrame) => ({
      anchors: {
        centerX: 0,
        top: Math.max(0, (frame.height - childFrame.height) * (1 - progress))
      }
    }),
    progressFrame: () => {
      const height = Math.max(0, frame.height * progress);
      return {
        x: 0,
        y: Math.max(0, frame.height - height),
        width: frame.width,
        height
      };
    },
    progressLayout: () => ({ anchors: { left: 0, right: 0, bottom: 0 } })
  };
}
