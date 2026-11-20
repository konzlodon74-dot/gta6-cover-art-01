// Fixed scenes for screenshots, named by ?shot= in the page URL:
//   ?shot=cover   the exported cover alone, full-bleed
//   ?shot=editor  the editor with a photo loaded
// `photo` names a bundled sample, `caption` the title, and `layout`,
// `subtitle`, `size` may be given too. window.__shotReady is set once the
// scene is painted, so a screenshot tool can wait for it.

import { SAMPLE_PHOTOS } from "./photos.js";

export function parseShot(query) {
  const shot = query.get("shot");
  if (!shot) return null;
  return {
    shot,
    photo: query.get("photo") ?? "pier",
    caption: query.get("caption") ?? undefined,
    subtitle: query.get("subtitle") ?? undefined,
    layout: query.get("layout") ?? undefined,
    size: query.get("size") ?? undefined,
  };
}

// Applies a scene to the state before the first paint. A cover scene fills
// every panel with the named photo (the one-photo cover); an editor scene
// leads with it and keeps the collage behind.
export function applyShot(state, scene, photos) {
  const index = photos.findIndex((p) => p.name === scene.photo);
  const photoIndex = index === -1 ? 0 : index;
  if (scene.caption !== undefined) state.caption = scene.caption;
  if (scene.subtitle !== undefined) state.subtitle = scene.subtitle;
  if (scene.layout) state.layoutKey = scene.layout;
  if (scene.size) state.sizeKey = scene.size;
  if (scene.shot === "cover") {
    state.panels = state.panels.map((panel) => ({ ...panel, photo: photoIndex }));
    document.body.classList.add("shot-cover");
  } else if (state.panels[0]) {
    state.panels[0] = { ...state.panels[0], photo: photoIndex };
  }
  state.activePanel = 0;
  return SAMPLE_PHOTOS.some((s) => s.name === scene.photo);
}

export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
