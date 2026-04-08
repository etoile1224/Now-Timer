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

/** Parse hex to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const PALETTE_RGB = PALETTE.map(hexToRgb);

/** Find closest palette color using squared Euclidean distance */
function closestColor(r: number, g: number, b: number): string | null {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const [pr, pg, pb] = PALETTE_RGB[i];
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
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

    // Strip data URI prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Resize to 32x32 with sharp, get raw RGBA pixel data
    const { data, info } = await sharp(buffer)
      .resize(GRID_SIZE, GRID_SIZE, { fit: "cover", position: "centre" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Build 32x32 grid mapping each pixel to closest palette color
    const grid: (string | null)[][] = [];
    for (let y = 0; y < info.height; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        // Transparent pixels become null
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
