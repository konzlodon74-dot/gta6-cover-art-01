// The photo shelf: the four bundled samples first, then any photos the
// person adds from their own machine. Files are read locally into object
// URLs; nothing is uploaded anywhere, which is the point of the tool.

export const SAMPLE_PHOTOS = [
  { name: "rider", label: "Coast rider", src: "samples/rider.jpg" },
  { name: "marina", label: "Neon marina", src: "samples/marina.jpg" },
  { name: "pier", label: "The pier", src: "samples/pier.jpg" },
  { name: "boulevard", label: "Boulevard", src: "samples/boulevard.jpg" },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

// A photo on the shelf: its display name and the decoded image element the
// renderer draws from.
export async function loadSamples() {
  const photos = [];
  for (const sample of SAMPLE_PHOTOS) {
    const img = await loadImage(sample.src);
    photos.push({ name: sample.name, label: sample.label, img });
  }
  return photos;
}

export async function loadSampleByName(name) {
  const sample = SAMPLE_PHOTOS.find((s) => s.name === name) ?? SAMPLE_PHOTOS[0];
  const img = await loadImage(sample.src);
  return { name: sample.name, label: sample.label, img };
}

// Reads the person's picked files into shelf entries, in pick order.
export async function loadOwnPhotos(fileList) {
  const added = [];
  for (const file of fileList) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const label = file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 24) || "My photo";
      added.push({ name: `own-${added.length}-${label}`, label, img });
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  return added;
}
