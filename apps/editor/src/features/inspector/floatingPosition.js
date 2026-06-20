export function positionFloatingElement(trigger, popover, options = {}) {
  const margin = options.margin ?? 8;
  const gap = options.gap ?? 6;
  const triggerRect = trigger.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const maxLeft = Math.max(margin, window.innerWidth - popoverRect.width - margin);
  const targetLeft = getTargetLeft(triggerRect, popoverRect, options.align);
  const left = Math.min(Math.max(targetLeft, margin), maxLeft);
  const belowTop = triggerRect.bottom + gap;
  const aboveTop = triggerRect.top - popoverRect.height - gap;
  const top = belowTop + popoverRect.height <= window.innerHeight - margin
    ? belowTop
    : Math.max(margin, aboveTop);

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function getTargetLeft(triggerRect, popoverRect, align = "left") {
  return align === "right"
    ? triggerRect.right - popoverRect.width
    : triggerRect.left;
}
