// The cover's whole state: which layout, what each panel shows and how it is
// framed, the caption lettering, and the export size. Everything the editor
// changes lives here, and the renderer reads nothing else.

export const EXPORT_SIZES = [
  { key: "square", label: "1080 × 1080", w: 1080, h: 1080 },
  { key: "tall", label: "1080 × 1350", w: 1080, h: 1350 },
  { key: "wide", label: "1920 × 1080", w: 1920, h: 1080 },
];

// Panel rectangles are fractions of the framed area, so a layout works at
// every export size. x/y is the panel's top-left corner, w/h its extent.
export const LAYOUTS = [
  {
    key: "mosaic",
    label: "Mosaic · 6",
    panels: [
      { x: 0.0, y: 0.0, w: 0.55, h: 0.38 },
      { x: 0.55, y: 0.0, w: 0.45, h: 0.38 },
      { x: 0.0, y: 0.38, w: 0.33, h: 0.34 },
      { x: 0.33, y: 0.38, w: 0.34, h: 0.34 },
      { x: 0.67, y: 0.38, w: 0.33, h: 0.34 },
      { x: 0.0, y: 0.72, w: 1.0, h: 0.28 },
    ],
  },
  {
    key: "triptych",
    label: "Triptych · 3",
    panels: [
      { x: 0.0, y: 0.0, w: 0.34, h: 1.0 },
      { x: 0.34, y: 0.0, w: 0.33, h: 1.0 },
      { x: 0.67, y: 0.0, w: 0.33, h: 1.0 },
    ],
  },
  {
    key: "duo",
    label: "Duo · 2",
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.55 },
      { x: 0.0, y: 0.55, w: 1.0, h: 0.45 },
    ],
  },
  {
    key: "hero",
    label: "Hero · 1",
    panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 1.0 }],
  },
];

// Lettering colourways: the title gradient runs pale at the top through
// `hi` into `lo`, and `bar` paints the kicker strip behind the subtitle.
export const ACCENTS = [
  { key: "sunset", hi: "#ffd166", lo: "#ff5d3a", bar: "#ff4ecd" },
  { key: "neon", hi: "#7bf1ff", lo: "#ff4ecd", bar: "#2dd4bf" },
  { key: "gold", hi: "#fff3b0", lo: "#f4842b", bar: "#c2255c" },
  { key: "ice", hi: "#ffffff", lo: "#7cc4ff", bar: "#ff5d3a" },
];

export const GRADE_NAMES = ["sunset", "neon", "noir", "clean"];

function freshPanel(photoIndex, grade) {
  return { photo: photoIndex, grade, zoom: 1, ox: 0.5, oy: 0.5, flip: false };
}

// Panels are rebuilt whenever the layout changes; the first panels take the
// bundled photos in turn so a fresh cover already looks finished.
export function panelsForLayout(layoutKey, photoCount) {
  const layout = LAYOUTS.find((l) => l.key === layoutKey) ?? LAYOUTS[0];
  return layout.panels.map((_, i) =>
    freshPanel(photoCount > 0 ? i % photoCount : 0, i % 3 === 1 ? "neon" : "sunset"),
  );
}

export function createState(photoCount) {
  return {
    layoutKey: "mosaic",
    panels: panelsForLayout("mosaic", photoCount),
    activePanel: 0,
    caption: "Neon Run",
    subtitle: "One night on the coast",
    titleSize: 1,
    titlePos: "bottom",
    accent: 0,
    gradeAll: 0.55,
    grain: true,
    frame: true,
    sizeKey: "square",
  };
}

export function sizeOf(state) {
  return EXPORT_SIZES.find((s) => s.key === state.sizeKey) ?? EXPORT_SIZES[0];
}

export function layoutOf(state) {
  return LAYOUTS.find((l) => l.key === state.layoutKey) ?? LAYOUTS[0];
}
