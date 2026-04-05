import { useState, useCallback, useRef } from 'react';

const COLORS = [
  '#1a1a1a', '#ffffff', '#E8652D', '#F59E0B', '#FACC15',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#92400E',
];

// _ = null, 0-9 = COLORS index
const T = (template: string[]): (string | null)[][] => {
  return template.map(row =>
    row.split('').map(c => c === '_' ? null : COLORS[parseInt(c)] ?? null)
  );
};

const TEMPLATES: { name: string; emoji: string; grid: (string | null)[][] }[] = [
  {
    name: '사람', emoji: '🧑',
    grid: T([
      '____44444444____',
      '___4444444444___',
      '__444444444444__',
      '__449449944944__',
      '__444444444444__',
      '__444444444444__',
      '__444442244444__',
      '__444422224444__',
      '___4444444444___',
      '____44444444____',
      '___2222222222___',
      '__22222222222___',
      '__22222222222___',
      '__22222222222___',
      '___222____222___',
      '___222____222___',
    ]),
  },
  {
    name: '고양이', emoji: '🐱',
    grid: T([
      '__3___________3_',
      '_33___________33',
      '_333_________333',
      '_3333_______3333',
      '_33333333333333_',
      '_33333333333333_',
      '_33303333303333_',
      '_33333333333333_',
      '_33333333333333_',
      '_33333322333333_',
      '__3333333333333_',
      '___33333333333__',
      '____333333333___',
      '_____3333333____',
      '______33333_____',
      '________________',
    ]),
  },
  {
    name: '하트', emoji: '❤️',
    grid: T([
      '________________',
      '___222____222___',
      '__22222__22222__',
      '_2222222222222__',
      '_22222222222222_',
      '_22222222222222_',
      '_22222222222222_',
      '__222222222222__',
      '__222222222222__',
      '___2222222222___',
      '____22222222____',
      '_____222222_____',
      '______2222______',
      '_______22_______',
      '________________',
      '________________',
    ]),
  },
  {
    name: '토마토', emoji: '🍅',
    grid: T([
      '______55________',
      '_____555________',
      '____5555________',
      '___22222222_____',
      '__2222222222____',
      '_222222222222___',
      '_222222222222___',
      '_222212222222___',
      '_222222222222___',
      '_222222222222___',
      '_222222222222___',
      '__2222222222____',
      '___22222222_____',
      '____222222______',
      '________________',
      '________________',
    ]),
  },
  {
    name: '별', emoji: '⭐',
    grid: T([
      '________________',
      '_______33_______',
      '_______33_______',
      '______3333______',
      '______3333______',
      '_33333333333333_',
      '__333333333333__',
      '___3333333333___',
      '____33333333____',
      '___3333333333___',
      '___333____333___',
      '__333______333__',
      '__33________33__',
      '________________',
      '________________',
      '________________',
    ]),
  },
  {
    name: '유령', emoji: '👻',
    grid: T([
      '____11111111____',
      '___1111111111___',
      '__111111111111__',
      '__111111111111__',
      '__110110011011__',
      '__110110011011__',
      '__111111111111__',
      '__111100001111__',
      '__111111111111__',
      '__111111111111__',
      '__111111111111__',
      '__111111111111__',
      '__111111111111__',
      '__11_1111_1111__',
      '__1___111__111__',
      '______11___11___',
    ]),
  },
];

interface PixelEditorProps {
  value: (string | null)[][];
  onChange: (grid: (string | null)[][]) => void;
  size?: number;
}

function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => null));
}

export { createEmptyGrid };

export function PixelEditor({ value, onChange, size = 256 }: PixelEditorProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(COLORS[0]);
  const [isEraser, setIsEraser] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const paintingRef = useRef(false);
  const cellSize = size / 16;

  const paint = useCallback((row: number, col: number) => {
    const next = value.map(r => [...r]);
    next[row][col] = isEraser ? null : selectedColor;
    onChange(next);
  }, [value, onChange, selectedColor, isEraser]);

  return (
    <div className="flex flex-col gap-3">
      {/* Template picker */}
      <div>
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-2"
        >
          {showTemplates ? '템플릿 닫기 ▲' : '기본 템플릿으로 시작하기 ▼'}
        </button>
        {showTemplates && (
          <div className="flex gap-2 flex-wrap mb-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => { onChange(t.grid.map(r => [...r])); setShowTemplates(false); }}
                className="flex flex-col items-center gap-1 px-3 py-2 bg-muted rounded-xl border border-border hover:border-primary/50 transition-colors active:scale-95"
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        className="border border-border rounded-lg overflow-hidden mx-auto"
        style={{ width: size, height: size }}
        onMouseLeave={() => { paintingRef.current = false; }}
      >
        {value.map((row, r) => (
          <div key={r} className="flex">
            {row.map((color, c) => (
              <div
                key={c}
                className="border-r border-b border-border/30 cursor-crosshair"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: color ?? 'transparent',
                }}
                onMouseDown={() => { paintingRef.current = true; paint(r, c); }}
                onMouseEnter={() => { if (paintingRef.current) paint(r, c); }}
                onMouseUp={() => { paintingRef.current = false; }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Color palette */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => { setSelectedColor(color); setIsEraser(false); }}
            className={`w-7 h-7 rounded-lg border-2 transition-transform ${
              selectedColor === color && !isEraser ? 'border-foreground scale-110' : 'border-border'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        {/* Eraser */}
        <button
          onClick={() => setIsEraser(true)}
          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs transition-transform ${
            isEraser ? 'border-foreground scale-110 bg-muted' : 'border-border bg-card'
          }`}
          title="지우개"
        >
          ✕
        </button>
      </div>

      {/* Clear button */}
      <button
        onClick={() => onChange(createEmptyGrid())}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        전체 지우기
      </button>
    </div>
  );
}
