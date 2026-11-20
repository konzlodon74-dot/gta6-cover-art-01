// The editor: builds the control panel from the state, keeps the preview
// painted, and turns pointer gestures on the canvas into panel edits —
// click to choose a panel, drag to reframe its photo, scroll to zoom it.

import { ACCENTS, EXPORT_SIZES, LAYOUTS, layoutOf, panelsForLayout, sizeOf } from "./state.js";
import { drawCover } from "./render.js";
import { exportPng } from "./exporter.js";
import { loadOwnPhotos } from "./photos.js";

const $ = (id) => document.getElementById(id);

export function createEditor(state, photos, canvas) {
  const ctx = canvas.getContext("2d");
  let needsPaint = true;
  const paint = () => {
    needsPaint = false;
    const { w, h } = sizeOf(state);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    drawCover(ctx, w, h, { ...state, highlightActive: true }, photos);
  };
  const requestPaint = () => {
    if (!needsPaint) {
      needsPaint = true;
      requestAnimationFrame(paint);
    }
  };

  // --- segmented button groups -------------------------------------------
  function segButton(label, pressed) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
    return b;
  }

  function buildLayoutSeg() {
    const seg = $("layoutSeg");
    seg.replaceChildren();
    for (const layout of LAYOUTS) {
      const b = segButton(layout.label, layout.key === state.layoutKey);
      b.addEventListener("click", () => {
        state.layoutKey = layout.key;
        state.panels = panelsForLayout(layout.key, photos.length);
        state.activePanel = 0;
        buildLayoutSeg();
        buildPanelTabs();
        syncPanelControls();
        requestPaint();
      });
      seg.appendChild(b);
    }
  }

  function buildPanelTabs() {
    const tabs = $("panelTabs");
    tabs.replaceChildren();
    state.panels.forEach((_, i) => {
      const b = segButton(`Panel ${i + 1}`, i === state.activePanel);
      b.addEventListener("click", () => {
        state.activePanel = i;
        buildPanelTabs();
        syncPanelControls();
        requestPaint();
      });
      tabs.appendChild(b);
    });
  }

  function buildSizeSeg() {
    const seg = $("sizeSeg");
    seg.replaceChildren();
    for (const size of EXPORT_SIZES) {
      const b = segButton(size.label, size.key === state.sizeKey);
      b.addEventListener("click", () => {
        state.sizeKey = size.key;
        buildSizeSeg();
        requestPaint();
      });
      seg.appendChild(b);
    }
  }

  // --- photo shelf ---------------------------------------------------------
  function buildThumbs() {
    const wrap = $("sampleThumbs");
    wrap.replaceChildren();
    photos.forEach((photo, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      const panel = state.panels[state.activePanel];
      b.setAttribute("aria-pressed", panel && panel.photo === i ? "true" : "false");
      b.title = photo.label;
      const img = document.createElement("img");
      img.src = photo.img.src;
      img.alt = photo.label;
      b.appendChild(img);
      b.addEventListener("click", () => {
        const p = state.panels[state.activePanel];
        if (p) p.photo = i;
        buildThumbs();
        syncPanelControls();
        requestPaint();
      });
      wrap.appendChild(b);
    });
  }

  function buildPhotoSelect() {
    const sel = $("panelPhoto");
    sel.replaceChildren();
    photos.forEach((photo, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = photo.label;
      sel.appendChild(opt);
    });
  }

  // --- panel controls ------------------------------------------------------
  function syncPanelControls() {
    const panel = state.panels[state.activePanel];
    if (!panel) return;
    $("panelPhoto").value = String(panel.photo);
    $("panelGrade").value = panel.grade;
    $("panelZoom").value = String(panel.zoom);
    $("panelX").value = String(panel.ox);
    $("panelY").value = String(panel.oy);
    $("panelFlip").checked = panel.flip;
    buildThumbs();
  }

  function bindPanelControls() {
    const panel = () => state.panels[state.activePanel];
    $("panelPhoto").addEventListener("change", (e) => {
      panel().photo = Number(e.target.value);
      buildThumbs();
      requestPaint();
    });
    $("panelGrade").addEventListener("change", (e) => {
      panel().grade = e.target.value;
      requestPaint();
    });
    $("panelZoom").addEventListener("input", (e) => {
      panel().zoom = Number(e.target.value);
      requestPaint();
    });
    $("panelX").addEventListener("input", (e) => {
      panel().ox = Number(e.target.value);
      requestPaint();
    });
    $("panelY").addEventListener("input", (e) => {
      panel().oy = Number(e.target.value);
      requestPaint();
    });
    $("panelFlip").addEventListener("change", (e) => {
      panel().flip = e.target.checked;
      requestPaint();
    });
  }

  // --- caption + finish controls ------------------------------------------
  function bindCaptionControls() {
    $("captionText").addEventListener("input", (e) => {
      state.caption = e.target.value;
      requestPaint();
    });
    $("subtitleText").addEventListener("input", (e) => {
      state.subtitle = e.target.value;
      requestPaint();
    });
    $("titleSize").addEventListener("input", (e) => {
      state.titleSize = Number(e.target.value);
      requestPaint();
    });
    $("titlePos").addEventListener("change", (e) => {
      state.titlePos = e.target.value;
      requestPaint();
    });
    $("gradeAll").addEventListener("input", (e) => {
      state.gradeAll = Number(e.target.value);
      requestPaint();
    });
    $("grainToggle").addEventListener("change", (e) => {
      state.grain = e.target.checked;
      requestPaint();
    });
    $("frameToggle").addEventListener("change", (e) => {
      state.frame = e.target.checked;
      requestPaint();
    });
    const wrap = $("accentSwatches");
    ACCENTS.forEach((accent, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.title = accent.key;
      b.style.background = accent.lo;
      b.setAttribute("aria-pressed", i === state.accent ? "true" : "false");
      b.addEventListener("click", () => {
        state.accent = i;
        wrap.querySelectorAll(".swatch").forEach((el, j) =>
          el.setAttribute("aria-pressed", j === i ? "true" : "false"),
        );
        requestPaint();
      });
      wrap.appendChild(b);
    });
  }

  // --- photo intake ---------------------------------------------------------
  function bindPhotoIntake() {
    $("ownPhotos").addEventListener("change", async (e) => {
      const files = [...(e.target.files ?? [])];
      if (!files.length) return;
      const added = await loadOwnPhotos(files);
      const firstNew = photos.length;
      photos.push(...added);
      if (added.length) {
        const panel = state.panels[state.activePanel];
        if (panel) panel.photo = firstNew;
        $("photoNote").textContent = `${added.length} photo${added.length > 1 ? "s" : ""} added — the selected panel now shows the first.`;
      }
      buildPhotoSelect();
      buildThumbs();
      syncPanelControls();
      requestPaint();
      e.target.value = "";
    });
    $("fillAll").addEventListener("click", () => {
      const panel = state.panels[state.activePanel];
      if (!panel) return;
      state.panels = state.panels.map((p) => ({ ...p, photo: panel.photo }));
      requestPaint();
    });
  }

  // --- direct manipulation on the canvas ------------------------------------
  function bindCanvasGestures() {
    const toCover = (evt) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((evt.clientX - rect.left) / rect.width) * canvas.width,
        y: ((evt.clientY - rect.top) / rect.height) * canvas.height,
      };
    };
    const panelAt = (pt) => {
      const { w, h } = sizeOf(state);
      const frameW = state.frame ? Math.round(Math.min(w, h) * 0.026) : 0;
      const layout = layoutOf(state);
      for (let i = layout.panels.length - 1; i >= 0; i--) {
        const r = layout.panels[i];
        const px = frameW + r.x * (w - frameW * 2);
        const py = frameW + r.y * (h - frameW * 2);
        if (pt.x >= px && pt.x <= px + r.w * (w - frameW * 2) && pt.y >= py && pt.y <= py + r.h * (h - frameW * 2)) return i;
      }
      return -1;
    };
    let drag = null;
    canvas.addEventListener("pointerdown", (evt) => {
      const pt = toCover(evt);
      const hit = panelAt(pt);
      if (hit >= 0 && hit !== state.activePanel) {
        state.activePanel = hit;
        buildPanelTabs();
        syncPanelControls();
      }
      const panel = state.panels[state.activePanel];
      if (panel) {
        drag = { x: pt.x, y: pt.y, ox: panel.ox, oy: panel.oy };
        canvas.setPointerCapture(evt.pointerId);
      }
      requestPaint();
    });
    canvas.addEventListener("pointermove", (evt) => {
      if (!drag) return;
      const pt = toCover(evt);
      const panel = state.panels[state.activePanel];
      const photo = photos[panel.photo];
      if (!photo) return;
      const { w, h } = sizeOf(state);
      const layout = layoutOf(state);
      const r = layout.panels[state.activePanel];
      const pw = r.w * w;
      const ph = r.h * h;
      const scale = Math.max(pw / photo.img.naturalWidth, ph / photo.img.naturalHeight) * panel.zoom;
      const spanX = Math.max(1, photo.img.naturalWidth * scale - pw);
      const spanY = Math.max(1, photo.img.naturalHeight * scale - ph);
      panel.ox = Math.min(1, Math.max(0, drag.ox + (pt.x - drag.x) / spanX));
      panel.oy = Math.min(1, Math.max(0, drag.oy + (pt.y - drag.y) / spanY));
      $("panelX").value = String(panel.ox);
      $("panelY").value = String(panel.oy);
      requestPaint();
    });
    const endDrag = () => {
      drag = null;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener(
      "wheel",
      (evt) => {
        evt.preventDefault();
        const panel = state.panels[state.activePanel];
        if (!panel) return;
        panel.zoom = Math.min(2.8, Math.max(1, panel.zoom * (evt.deltaY < 0 ? 1.07 : 0.94)));
        $("panelZoom").value = String(panel.zoom);
        requestPaint();
      },
      { passive: false },
    );
  }

  // --- shuffle: a one-click remix ------------------------------------------
  function bindShuffle() {
    const pick = (n) => Math.floor(Math.random() * n);
    $("shuffleBtn").addEventListener("click", () => {
      const layout = LAYOUTS[pick(LAYOUTS.length)];
      state.layoutKey = layout.key;
      state.panels = panelsForLayout(layout.key, photos.length).map((panel) => ({
        ...panel,
        photo: pick(photos.length),
        grade: ["sunset", "neon", "noir", "clean"][pick(4)],
        zoom: 1 + Math.random() * 0.5,
        ox: 0.25 + Math.random() * 0.5,
        oy: 0.25 + Math.random() * 0.5,
      }));
      state.activePanel = 0;
      state.accent = pick(ACCENTS.length);
      document.querySelectorAll("#accentSwatches .swatch").forEach((el, j) =>
        el.setAttribute("aria-pressed", j === state.accent ? "true" : "false"),
      );
      buildLayoutSeg();
      buildPanelTabs();
      syncPanelControls();
      requestPaint();
    });
  }

  // --- export ----------------------------------------------------------------
  function bindExport() {
    $("exportBtn").addEventListener("click", async () => {
      const { w, h } = await exportPng(state, photos);
      $("status").textContent = `Saved neon-coast-cover-${w}x${h}.png — ready to post.`;
    });
  }

  buildLayoutSeg();
  buildPanelTabs();
  buildSizeSeg();
  buildPhotoSelect();
  bindPanelControls();
  bindCaptionControls();
  bindPhotoIntake();
  bindCanvasGestures();
  bindShuffle();
  bindExport();
  $("captionText").value = state.caption;
  $("subtitleText").value = state.subtitle;
  $("titleSize").value = String(state.titleSize);
  $("gradeAll").value = String(state.gradeAll);
  syncPanelControls();
  paint();

  return { requestPaint };
}
