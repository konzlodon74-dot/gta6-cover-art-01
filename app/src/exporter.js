// PNG export: renders the cover once more at the full export size on an
// offscreen canvas and hands it to the browser as a download.

import { drawCover } from "./render.js";
import { sizeOf } from "./state.js";

export function exportPng(state, photos) {
  const { w, h } = sizeOf(state);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  const clean = { ...state, highlightActive: false };
  drawCover(g, w, h, clean, photos);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neon-coast-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve({ w, h });
    }, "image/png");
  });
}
