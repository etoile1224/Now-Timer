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

/** Convert RGB to HSL for better perceptual matching */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

const PALETTE_RGB = PALETTE.map(hexToRgb);
const PALETTE_HSL = PALETTE_RGB.map(([r, g, b]) => rgbToHsl(r, g, b));

/** Perceptual distance combining RGB + HSL for color accuracy */
function colorDist(r: number, g: number, b: number, pi: number): number {
  const [pr, pg, pb] = PALETTE_RGB[pi];
  const [ph, ps, pl] = PALETTE_HSL[pi];
  const [h, s, l] = rgbToHsl(r, g, b);

  // RGB component (weighted for human vision)
  const dr = r - pr, dg = g - pg, db = b - pb;
  const rgbDist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;

  // Hue distance (circular, 0-1 range)
  let dh = Math.abs(h - ph);
  if (dh > 0.5) dh = 1 - dh;

  // Saturation and lightness distance
  const ds = s - ps;
  const dl = l - pl;

  // Penalize grayscale palette matches when pixel has color
  const minSat = Math.min(s, ps);
  const hueWeight = minSat > 0.05 ? 10000 : 0;

  // If pixel has saturation but palette color is grayscale, add penalty
  const grayPenalty = (s > 0.08 && ps < 0.05) ? 5000 : 0;

  return rgbDist + hueWeight * dh * dh + 3000 * ds * ds + 2000 * dl * dl + grayPenalty;
}

/** Find closest palette color */
function closestColor(r: number, g: number, b: number): string {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const d = colorDist(r, g, b, i);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return PALETTE[best];
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

    // Boost saturation and contrast before resizing for better color preservation
    const { data, info } = await sharp(buffer)
      .resize(GRID_SIZE, GRID_SIZE, { fit: "cover", position: "centre" })
      .modulate({ saturation: 1.8 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const grid: (string | null)[][] = [];
    for (let y = 0; y < info.height; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        row.push(a < 128 ? null : closestColor(r, g, b));
      }
      grid.push(row);
    }

    res.json({ grid });
  } catch (err) {
    res.status(500).json({ error: "Failed to process image" });
  }
});

export default router;
