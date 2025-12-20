let mapInitialized = false;

let scale = 1;
let minScale = 1;
let translateX = 0;
let translateY = 0;
let wrapperW = 0;
let wrapperH = 0;

export function updateTabMap(): void {
  const img = document.querySelector<HTMLImageElement>("#worldMap");
  const stage = document.querySelector<HTMLElement>("#worldMapStage");
  const wrapper = document.querySelector<HTMLElement>(".map-wrapper");

  if (!img || !stage || !wrapper) {
    return;
  }

  img.draggable = false;
  img.style.userSelect = "none";
  img.addEventListener("dragstart", (e) => {
    e.preventDefault();
    return false;
  });

  wrapper.style.userSelect = "none";
  wrapper.style.touchAction = "none";

  const applyTransform = () => {
    stage.style.transform = `translate(-50%, -50%) translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
  };

  const clampPan = () => {
    if (img.naturalWidth === 0 || wrapperW === 0) {
      return;
    }
    const halfImgW = (img.naturalWidth * scale) / 2;
    const halfImgH = (img.naturalHeight * scale) / 2;
    const limitX = Math.max(0, halfImgW - wrapperW / 2);
    const limitY = Math.max(0, halfImgH - wrapperH / 2);

    translateX = Math.max(-limitX, Math.min(limitX, translateX));
    translateY = Math.max(-limitY, Math.min(limitY, translateY));
  };

  const fitToScreen = () => {
    wrapperW = wrapper.clientWidth;
    wrapperH = wrapper.clientHeight;
    if (img.naturalWidth === 0 || wrapperW === 0) {
      return;
    }

    const scaleW = wrapperW / img.naturalWidth;
    const scaleH = wrapperH / img.naturalHeight;

    minScale = Math.min(scaleW, scaleH) * 0.9;
    scale = minScale;
    translateX = 0;
    translateY = 0;

    applyTransform();
  };

  if (mapInitialized) {
    applyTransform();
    return;
  }
  mapInitialized = true;

  const observer = new ResizeObserver(() => {
    if (wrapper.clientWidth > 0) {
      fitToScreen();
    }
  });
  observer.observe(wrapper);

  wrapper.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const prevScale = scale;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.max(minScale, Math.min(scale * factor, 6));

      if (newScale !== prevScale) {
        const actualFactor = newScale / prevScale;
        translateX = mouseX - (mouseX - translateX) * actualFactor;
        translateY = mouseY - (mouseY - translateY) * actualFactor;
        scale = newScale;
      }

      clampPan();
      applyTransform();
    },
    { passive: false },
  );

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  wrapper.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".map-pin")) {
      return;
    }
    e.preventDefault();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    wrapper.setPointerCapture(e.pointerId);
    wrapper.style.cursor = "grabbing";
  });

  wrapper.addEventListener("pointermove", (e) => {
    if (!dragging) {
      return;
    }
    e.preventDefault();
    translateX += e.clientX - lastX;
    translateY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    clampPan();
    applyTransform();
  });

  const stopDrag = (e: PointerEvent) => {
    dragging = false;
    try {
      wrapper.releasePointerCapture(e.pointerId);
    } catch {
      /* empty */
    }
    wrapper.style.cursor = "";
  };

  wrapper.addEventListener("pointerup", stopDrag);
  wrapper.addEventListener("pointercancel", stopDrag);
  wrapper.addEventListener("pointerleave", stopDrag);

  if (img.complete) {
    fitToScreen();
  } else {
    img.addEventListener("load", () => {
      fitToScreen();
    });
  }
}
