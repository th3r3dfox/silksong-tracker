let mapInitialized = false;

export function updateTabMap(): void {
  if (mapInitialized) {
    return;
  }
  mapInitialized = true;

  const img = document.querySelector<HTMLImageElement>("#worldMap");
  if (!img) {
    console.error("worldMap not found");
    return;
  }

  const wrapper = img.parentElement;
  if (!(wrapper instanceof HTMLElement)) {
    console.error("Map wrapper not found or not an HTMLElement.");
    return;
  }

  let scale = 1;
  let minScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Apply translation and scaling.
  const updateTransform = () => {
    img.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  // Keep panning centered prevent image from leaving screen.
  const clampPan = () => {
    const rect = wrapper.getBoundingClientRect();

    // Half dimensions of the visible area.
    const halfViewWidth = rect.width / 2;
    const halfViewHeight = rect.height / 2;

    // Half dimensions of the scaled image.
    const halfImageWidth = (img.naturalWidth * scale) / 2;
    const halfImageHeight = (img.naturalHeight * scale) / 2;

    // Calculate allowed translation range (centered).
    const maxX = Math.max(0, halfImageWidth - halfViewWidth);
    const maxY = Math.max(0, halfImageHeight - halfViewHeight);

    translateX = Math.max(-maxX, Math.min(maxX, translateX));
    translateY = Math.max(-maxY, Math.min(maxY, translateY));
  };

  // Fit map to screen automatically.
  const fitToScreen = () => {
    const rect = wrapper.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;

    if (naturalWidth > 0 && naturalHeight > 0) {
      const scaleX = rect.width / naturalWidth;
      const scaleY = rect.height / naturalHeight;

      // Slightly smaller so it fits comfortably.
      scale = Math.min(scaleX, scaleY) * 1.25;
      minScale = scale;
      translateX = 20;
      translateY = 60;
      updateTransform();
    }
  };

  if (img.complete) {
    fitToScreen();
  } else {
    img.addEventListener("load", fitToScreen, { once: true });
  }

  // Zoom with mouse wheel.
  wrapper.addEventListener(
    "wheel",
    (e) => {
      if (isDragging) {
        return;
      }
      e.preventDefault();

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const prevScale = scale;
      const zoomFactor = 1.1;

      scale *= e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      scale = Math.min(Math.max(minScale, scale), 6);

      // Adjust translation to keep the zoom focus point.
      translateX -= mouseX / prevScale - mouseX / scale;
      translateY -= mouseY / prevScale - mouseY / scale;

      clampPan();
      updateTransform();
    },
    { passive: false },
  );

  // Drag to pan.
  wrapper.addEventListener("mousedown", (e) => {
    if (e.button !== 0) {
      return;
    }
    isDragging = true;
    wrapper.style.cursor = "grabbing";
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    wrapper.style.cursor = "grab";
  });

  wrapper.addEventListener("mousemove", (e) => {
    if (!isDragging) {
      return;
    }
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;

    clampPan();
    updateTransform();
  });

  // Double-click --> reset zoom and recenter.
  wrapper.addEventListener("dblclick", fitToScreen);

  wrapper.style.cursor = "grab";
}
