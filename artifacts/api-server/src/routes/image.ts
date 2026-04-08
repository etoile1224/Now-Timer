import { Router } from "express";
import type { Request, Response } from "express";
import sharp from "sharp";

const router = Router();

const GRID_SIZE = 32;

const PALETTE = [
  '#000000', '#3A3A3A', '#666666', '#8C8C8C', '#B5B5B5', '#D9D9D9', '#F0F0F0', '#FFFFFF',
  '#8B1A1A', '#DC2626', '#E8573A', '#F97316', '#FB923C', '#FBBF24', '#FACC15', '#FDE047',
  '#0E5F3B', '#0E7B5F', '#059669', '#14B8A6', '#0EA5E9', '#3B82F6', '#1D4ED8', '#1E3A5F',
  '#581C87', '#7C3AED', '#8B5CF6', '#A855F7', '#C026D3', '#DB2777', '#EC4899', '#F472B6',
  '#2D1B0E', '#6B3410', '#92400E', '#B45309', '#D4A574', '#FFB88C', '#FDDCB5', '#FDE8D0',
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const PALETTE_RGB = PALETTE.map(hexToRgb);

/** Perceptual color distance — weighted for human vision */
function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
}

/** K-means clustering to extract dominant colors */
function kMeans(pixels: [number, number, number][], k: number, maxIter = 20): [number, number, number][] {
  if (pixels.length <= k) return pixels;

  // Init centroids by picking evenly spaced pixels
  const step = Math.floor(pixels.length / k);
  const centroids: [number, number, number][] = [];
  for (let i = 0; i < k; i++) {
    centroids.push([...pixels[i * step]]);
  }

  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // Assign each pixel to nearest centroid
    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = pixels[i];
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const [cr, cg, cb] = centroids[c];
        const d = colorDist(r, g, b, cr, cg, cb);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }

    if (!changed) break;

    // Recompute centroids
    const sums = centroids.map(() => [0, 0, 0, 0] as [number, number, number, number]); // r, g, b, count
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      sums[c][3] += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          Math.round(sums[c][0] / sums[c][3]),
          Math.round(sums[c][1] / sums[c][3]),
          Math.round(sums[c][2] / sums[c][3]),
        ];
      }
    }
  }

  return centroids;
}

/** Find closest palette color using perceptual distance */
function closestPaletteColor(r: number, g: number, b: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const [pr, pg, pb] = PALETTE_RGB[i];
    const d = colorDist(r, g, b, pr, pg, pb);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

router.post("/convert-photo", async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image?: string };
    if (!image) {
      res.status(400).json({ error: "image (base64) is required" });
      return;
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Resize to 32x32, get raw RGBA pixels
    const { data, info } = await sharp(buffer)
      .resize(GRID_SIZE, GRID_SIZE, { fit: "cover", position: "centre" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Collect all opaque pixels
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < info.width * info.height; i++) {
      const idx = i * 4;
      if (data[idx + 3] >= 128) {
        pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    // Extract 16 dominant colors via k-means
    const dominantColors = kMeans(pixels, 16);

    // Map each dominant color → best palette match
    const dominantToPalette = dominantColors.map(
      ([r, g, b]) => closestPaletteColor(r, g, b)
    );

    // For each pixel: find nearest dominant color → use its palette mapping
    const grid: (string | null)[][] = [];
    for (let y = 0; y < info.height; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 128) {
          row.push(null);
        } else {
          // Find nearest dominant color
          let bestDom = 0;
          let bestD = Infinity;
          for (let d = 0; d < dominantColors.length; d++) {
            const [dr, dg, db] = dominantColors[d];
            const dist = colorDist(r, g, b, dr, dg, db);
            if (dist < bestD) { bestD = dist; bestDom = d; }
          }
          row.push(PALETTE[dominantToPalette[bestDom]]);
        }
      }
      grid.push(row);
    }

    res.json({ grid });
  } catch (err) {
    res.status(500).json({ error: "Failed to process image" });
  }
});

export default router;
