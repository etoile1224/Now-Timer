interface PixelAvatarProps {
  data: (string | null)[][] | null;
  size?: number;
  fallbackLetter?: string;
}

export function PixelAvatar({ data, size = 36, fallbackLetter }: PixelAvatarProps) {
  if (!data || data.every(row => row.every(c => c === null))) {
    // Fallback to letter avatar
    return (
      <div
        className="rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0"
        style={{ width: size, height: size }}
      >
        {fallbackLetter?.slice(0, 1).toUpperCase() ?? '?'}
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      className="rounded-lg shrink-0"
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    >
      {data.map((row, r) =>
        row.map((color, c) =>
          color ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} />
          ) : null,
        ),
      )}
    </svg>
  );
}
