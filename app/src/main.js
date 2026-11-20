// Entry point: load the bundled photos, build the state, start the editor,
// and — when the URL names a ?shot= scene — set that scene up first and
// flag it ready once it has painted.

import { createState, sizeOf } from "./state.js";
import { loadSamples } from "./photos.js";
import { ensureFonts, drawCover } from "./render.js";
import { createEditor } from "./editor.js";
import { parseShot, applyShot, markShotReady } from "./shots.js";

async function boot() {
  const query = new URLSearchParams(location.search);
  const scene = parseShot(query);
  const [photos] = await Promise.all([loadSamples(), ensureFonts()]);
  const state = createState(photos.length);
  const canvas = document.getElementById("stage");

  if (scene) {
    applyShot(state, scene, photos);
    document.getElementById("captionText").value = state.caption;
    document.getElementById("subtitleText").value = state.subtitle;
  }
  const editor = createEditor(state, photos, canvas);
  if (scene) {
    if (scene.shot === "cover") {
      // Paint the export-size cover with no editor highlight, full-bleed.
      const { w, h } = sizeOf(state);
      canvas.width = w;
      canvas.height = h;
      drawCover(canvas.getContext("2d"), w, h, { ...state, highlightActive: false }, photos);
    } else {
      editor.requestPaint();
    }
    markShotReady();
  }
}

boot();
