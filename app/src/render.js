// The cover renderer. drawCover paints the whole poster onto any 2d context
// at the requested pixel size: graded photo panels inside a poster frame,
// then the caption lettering, then the finishing grain and vignette. The
// editor preview and the PNG export run this same code, so what you see is
// exactly what you share.

import { ACCENTS, layoutOf } from "./state.js";

const DISPLAY_FONT = '"Anton", "Archivo", sans-serif';
const KICKER_FONT = '"Archivo", sans-serif';

// Per-look canvas filter strings, applied while a panel's photo is drawn.
const GRADE_FILTERS = {
  sunset: "saturate(1.29) contrast(1.11) brightness(1.03)",
  neon: "saturate(1.65) contrast(1.16) brightness(1.02) hue-rotate(-6deg)",
  noir: "grayscale(0.88) contrast(1.28) brightness(1.04)",
  clean: "saturate(1.08) contrast(1.04)",
};

// Loads the two bundled display fonts (SIL Open Font License, files under
// app/fonts/) and waits until the browser can actually draw with them.
export async function ensureFonts() {
  const anton = new FontFace("Anton", "url(fonts/Anton-Regular.ttf)");
  const archivo = new FontFace("Archivo", "url(fonts/Archivo-Variable.ttf)", {
    weight: "100 900",
  });
  await Promise.all([anton.load(), archivo.load()]);
  document.fonts.add(anton);
  document.fonts.add(archivo);
  await Promise.all([
    document.fonts.load('64px "Anton"'),
    document.fonts.load('700 24px "Archivo"'),
  ]);
}

// Draws one photo into a panel-sized scratch canvas: cover-fit with the
// panel's zoom and position, mirrored if asked, then its colour grade.
function paintPanel(panel, photo, w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const g = c.getContext("2d");
  const img = photo.img;
  const scale = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (c.width - dw) * panel.ox;
  const dy = (c.height - dh) * panel.oy;
  g.fillStyle = "#0b0906";
  g.fillRect(0, 0, c.width, c.height);
  g.filter = GRADE_FILTERS[panel.grade] ?? GRADE_FILTERS.clean;
  if (panel.flip) {
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(img, c.width - dx - dw, dy, dw, dh);
  } else {
    g.drawImage(img, dx, dy, dw, dh);
  }
  g.filter = "none";
  gradeWash(g, c.width, c.height, panel.grade);
  return c;
}

// The split-tone wash that sells each look: warm light from above, coloured
// shadow below, laid over the photo with blend modes.
function gradeWash(g, w, h, grade) {
  if (grade === "sunset") {
    const top = g.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, "rgba(255,106,44,0.24)");
    top.addColorStop(0.38, "rgba(255,166,66,0.07)");
    top.addColorStop(0.62, "rgba(30,0,54,0.05)");
    top.addColorStop(1, "rgba(43,0,84,0.36)");
    g.globalCompositeOperation = "overlay";
    g.fillStyle = top;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "soft-light";
    g.fillStyle = "rgba(255,46,136,0.35)";
    g.fillRect(0, h * 0.55, w, h * 0.45);
  } else if (grade === "neon") {
    const top = g.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, "rgba(0,229,255,0.22)");
    top.addColorStop(0.5, "rgba(0,0,0,0)");
    top.addColorStop(1, "rgba(255,0,140,0.30)");
    g.globalCompositeOperation = "soft-light";
    g.fillStyle = top;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.8);
    glow.addColorStop(0, "rgba(0,255,204,0.16)");
    glow.addColorStop(1, "rgba(0,255,204,0)");
    g.globalCompositeOperation = "screen";
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
  } else if (grade === "noir") {
    const shade = g.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(255,255,255,0.07)");
    shade.addColorStop(0.55, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.42)");
    g.globalCompositeOperation = "source-over";
    g.fillStyle = shade;
    g.fillRect(0, 0, w, h);
  }
  g.globalCompositeOperation = "source-over";
}

// A tile of film grain, generated once and reused at every size.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const data = g.createImageData(256, 256);
  let seed = 20261119;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 96 + (seed % 128);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = c;
  return c;
}

// Width of a string drawn letter by letter with `tracking` px between glyphs.
function trackedWidth(g, text, tracking) {
  let total = 0;
  for (const ch of text) total += g.measureText(ch).width + tracking;
  return text.length ? total - tracking : 0;
}

// Draws text centred on cx with per-glyph tracking; fill and stroke follow
// whatever the caller set on the context.
function drawTracked(g, text, cx, y, tracking, mode) {
  let x = cx - trackedWidth(g, text, tracking) / 2;
  for (const ch of text) {
    if (mode !== "fill") g.strokeText(ch, x, y);
    if (mode !== "stroke") g.fillText(ch, x, y);
    x += g.measureText(ch).width + tracking;
  }
}

// Splits the title into one or two lines that each fit `maxWidth`, trying
// every word gap and keeping the most balanced split.
function titleLines(g, rawTitle, maxWidth, tracking) {
  const title = (rawTitle || "UNTITLED").toUpperCase();
  if (trackedWidth(g, title, tracking) <= maxWidth) return [title];
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [title];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const score = Math.max(trackedWidth(g, a, tracking), trackedWidth(g, b, tracking));
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  return best.lines;
}

// The caption block: kicker strip with the subtitle, then the big title.
function paintCaption(g, W, H, inner, state) {
  const accent = ACCENTS[state.accent] ?? ACCENTS[0];
  const title = (state.caption || "").trim();
  const subtitle = (state.subtitle || "").trim();
  let size = Math.min(W, H) * 0.148 * state.titleSize;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  let lines = [];
  let tracking = 0;
  // Shrink the title until its widest line fits the framed width.
  for (let tries = 0; tries < 24; tries++) {
    g.font = `${size}px ${DISPLAY_FONT}`;
    tracking = size * 0.012;
    lines = titleLines(g, title, inner.w * 0.94, tracking);
    const widest = Math.max(...lines.map((l) => trackedWidth(g, l, tracking)));
    if (widest <= inner.w * 0.94) break;
    size *= (inner.w * 0.94) / widest;
  }
  const lineHeight = size * 0.96;
  const kickerH = subtitle ? size * 0.34 : 0;
  const blockH = lines.length * lineHeight + (subtitle ? kickerH + size * 0.22 : 0);
  const cx = inner.x + inner.w / 2;
  const atTop = state.titlePos === "top";
  const blockTop = atTop ? inner.y + H * 0.035 : inner.y + inner.h - H * 0.035 - blockH;

  // A soft scrim so the lettering reads over any photo.
  const scrim = g.createLinearGradient(0, atTop ? inner.y : blockTop - size * 0.5, 0, atTop ? blockTop + blockH + size * 0.5 : inner.y + inner.h);
  if (atTop) {
    scrim.addColorStop(0, "rgba(8,2,12,0.62)");
    scrim.addColorStop(1, "rgba(8,2,12,0)");
  } else {
    scrim.addColorStop(0, "rgba(8,2,12,0)");
    scrim.addColorStop(1, "rgba(8,2,12,0.62)");
  }
  g.fillStyle = scrim;
  g.fillRect(inner.x, atTop ? inner.y : blockTop - size * 0.5, inner.w, blockH + size);

  let y = blockTop;
  if (subtitle) {
    // The kicker: subtitle on a slanted accent strip, letterspaced caps.
    g.font = `700 ${kickerH * 0.62}px ${KICKER_FONT}`;
    const kw = trackedWidth(g, subtitle.toUpperCase(), kickerH * 0.16) + kickerH * 1.1;
    const kx = cx - kw / 2;
    const slant = kickerH * 0.32;
    g.beginPath();
    g.moveTo(kx + slant, y);
    g.lineTo(kx + kw, y);
    g.lineTo(kx + kw - slant, y + kickerH);
    g.lineTo(kx, y + kickerH);
    g.closePath();
    g.fillStyle = accent.bar;
    g.fill();
    g.fillStyle = "#ffffff";
    drawTracked(g, subtitle.toUpperCase(), cx, y + kickerH * 0.72, kickerH * 0.16, "fill");
    y += kickerH + size * 0.22;
  }

  // The title itself: gradient-filled display lettering, black keyline,
  // soft drop shadow, a whisper of forward shear like a poster masthead.
  g.save();
  g.transform(1, 0, -0.045, 1, 0, 0);
  const shiftX = (atTop ? blockTop : blockTop) * 0.045;
  for (let i = 0; i < lines.length; i++) {
    const baseline = y + size * 0.92 + i * lineHeight;
    const grad = g.createLinearGradient(0, baseline - size, 0, baseline);
    grad.addColorStop(0, "#fffaf0");
    grad.addColorStop(0.52, accent.hi);
    grad.addColorStop(1, accent.lo);
    g.font = `${size}px ${DISPLAY_FONT}`;
    g.lineJoin = "round";
    g.strokeStyle = "#12060a";
    g.lineWidth = size * 0.15;
    g.shadowColor = "rgba(10,0,16,0.55)";
    g.shadowBlur = size * 0.07;
    g.shadowOffsetY = size * 0.045;
    drawTracked(g, lines[i], cx + shiftX, baseline, tracking, "stroke");
    g.shadowColor = "transparent";
    g.fillStyle = grad;
    drawTracked(g, lines[i], cx + shiftX, baseline, tracking, "fill");
  }
  g.restore();
}

// Paints the full cover. `photos` is the shelf from photos.js; each panel
// names its photo by index into it.
export function drawCover(g, W, H, state, photos) {
  g.fillStyle = "#000000";
  g.fillRect(0, 0, W, H);

  // The poster frame: a warm white border with a black keyline inside it.
  const frameW = state.frame ? Math.round(Math.min(W, H) * 0.026) : 0;
  const inner = { x: frameW, y: frameW, w: W - frameW * 2, h: H - frameW * 2 };
  if (state.frame) {
    g.fillStyle = "#f7f1e3";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#0a0a0a";
    g.fillRect(inner.x, inner.y, inner.w, inner.h);
  }

  // Panels: white gutters between them, a hairline keyline around each.
  const gutter = Math.max(3, Math.round(Math.min(W, H) * 0.007));
  const layout = layoutOf(state);
  state.panels.forEach((panel, i) => {
    const rect = layout.panels[i];
    if (!rect) return;
    const px = inner.x + rect.x * inner.w + gutter / 2;
    const py = inner.y + rect.y * inner.h + gutter / 2;
    const pw = rect.w * inner.w - gutter;
    const ph = rect.h * inner.h - gutter;
    const photo = photos[panel.photo] ?? photos[0];
    if (!photo) return;
    const painted = paintPanel(panel, photo, pw, ph);
    g.drawImage(painted, px, py);
    if (i === state.activePanel && state.highlightActive) {
      g.strokeStyle = "#ffb347";
      g.lineWidth = Math.max(3, W * 0.004);
      g.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    } else {
      g.strokeStyle = "rgba(0,0,0,0.5)";
      g.lineWidth = Math.max(1, W * 0.0012);
      g.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    }
  });

  // One unifying wash over the whole collage, strength set by the editor.
  if (state.gradeAll > 0) {
    const wash = g.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
    wash.addColorStop(0, `rgba(255,110,64,${0.16 * state.gradeAll})`);
    wash.addColorStop(0.5, "rgba(0,0,0,0)");
    wash.addColorStop(1, `rgba(64,0,110,${0.22 * state.gradeAll})`);
    g.globalCompositeOperation = "soft-light";
    g.fillStyle = wash;
    g.fillRect(inner.x, inner.y, inner.w, inner.h);
    g.globalCompositeOperation = "source-over";
  }

  paintCaption(g, W, H, inner, state);

  // Finishing: vignette, then grain over everything including the frame.
  const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, "rgba(12,0,20,0)");
  vig.addColorStop(1, "rgba(12,0,20,0.30)");
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
  if (state.grain) {
    g.save();
    g.globalAlpha = 0.055;
    g.globalCompositeOperation = "overlay";
    const pattern = g.createPattern(getGrainTile(), "repeat");
    g.fillStyle = pattern;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
}
