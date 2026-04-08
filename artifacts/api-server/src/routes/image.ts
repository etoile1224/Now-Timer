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

/** Convert RGB to CIE Lab for perceptually uniform color matching */
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear
  let rl = r / 255, gl = g / 255, bl = b / 255;
  rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92;
  gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92;
  bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92;

  // linear RGB → XYZ (D65)
  let x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047;
  let y = (0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl) / 1.00000;
  let z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / 1.08883;

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const PALETTE_RGB = PALETTE.map(hexToRgb);
const PALETTE_LAB = PALETTE_RGB.map(([r, g, b]) => rgbToLab(r, g, b));

/** CIEDE2000-simplified distance in Lab space */
function colorDistLab(L: number, a: number, b: number, pi: number): number {
  const [pL, pa, pb] = PALETTE_LAB[pi];
  const dL = L - pL;
  const da = a - pa;
  const db = b - pb;
  // Weighted Lab distance — give extra weight to chroma (a,b) to preserve color
  return dL * dL + 1.5 * da * da + 1.5 * db * db;
}

/** Find closest palette color using Lab space */
function closestColor(r: number, g: number, b: number): string {
  const [L, a, bVal] = rgbToLab(r, g, b);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_LAB.length; i++) {
    const d = colorDistLab(L, a, bVal, i);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return PALETTE[best];
}

/** Floyd-Steinberg dithering for smoother gradients */
function ditherGrid(
  pixels: Float64Array, w: number, h: number
): (string | null)[][] {
  // pixels: RGBA float array (0-255 range), length = w*h*4
  const grid: (string | null)[][] = [];

  for (let y = 0; y < h; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = Math.max(0, Math.min(255, pixels[idx]));
      const g = Math.max(0, Math.min(255, pixels[idx + 1]));
      const b = Math.max(0, Math.min(255, pixels[idx + 2]));
      const a = pixels[idx + 3];

      if (a < 128) {
        row.push(null);
        continue;
      }

      // Find closest palette color
      const color = closestColor(Math.round(r), Math.round(g), Math.round(b));
      row.push(color);

      // Compute quantization error
      const [pr, pg, pb] = hexToRgb(color);
      const er = r - pr, eg = g - pg, eb = b - pb;

      // Distribute error to neighbors (Floyd-Steinberg)
      const spread = (dx: number, dy: number, factor: number) => {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny < h) {
          const ni = (ny * w + nx) * 4;
          pixels[ni] += er * factor;
          pixels[ni + 1] += eg * factor;
          pixels[ni + 2] += eb * factor;
        }
      };
      spread(1, 0, 7 / 16);
      spread(-1, 1, 3 / 16);
      spread(0, 1, 5 / 16);
      spread(1, 1, 1 / 16);
    }
    grid.push(row);
  }
  return grid;
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

    // Process at 2x then downscale for better detail, boost saturation + contrast
    const intermediate = await sharp(buffer)
      .resize(GRID_SIZE * 2, GRID_SIZE * 2, { fit: "cover", position: "centre" })
      .modulate({ saturation: 2.0, brightness: 1.05 })
      .linear(1.2, -25) // contrast boost
      .sharpen({ sigma: 1.5 })
      .toBuffer();

    const { data, info } = await sharp(intermediate)
      .resize(GRID_SIZE, GRID_SIZE, { fit: "cover", kernel: "lanczos3" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Copy to float array for dithering
    const pixels = new Float64Array(info.width * info.height * 4);
    for (let i = 0; i < data.length; i++) {
      pixels[i] = data[i];
    }

    const grid = ditherGrid(pixels, info.width, info.height);

    res.json({ grid });
  } catch (err) {
    res.status(500).json({ error: "Failed to process image" });
  }
});

export default router;
