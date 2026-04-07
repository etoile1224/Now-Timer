import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Path } from 'react-native-svg';
import { colors } from '@/lib/colors';
import { TEMPLATES } from './pixelTemplates';

const GRID_SIZE = 32;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 32;

/* ── 40-color palette (5 rows × 8) ── */

const PALETTE: string[] = [
  // Grayscale
  '#000000', '#3A3A3A', '#666666', '#8C8C8C', '#B5B5B5', '#D9D9D9', '#F0F0F0', '#FFFFFF',
  // Warm — reds, oranges, yellows
  '#8B1A1A', '#DC2626', '#E8573A', '#F97316', '#FB923C', '#FBBF24', '#FACC15', '#FDE047',
  // Cool — greens, teals, blues
  '#0E5F3B', '#0E7B5F', '#059669', '#14B8A6', '#0EA5E9', '#3B82F6', '#1D4ED8', '#1E3A5F',
  // Purples & pinks
  '#581C87', '#7C3AED', '#8B5CF6', '#A855F7', '#C026D3', '#DB2777', '#EC4899', '#F472B6',
  // Skin & earth tones
  '#2D1B0E', '#6B3410', '#92400E', '#B45309', '#D4A574', '#FFB88C', '#FDDCB5', '#FDE8D0',
];

/* ── 16→32 upscale (for legacy avatar data migration) ── */

function upscale(grid: (string | null)[][]): (string | null)[][] {
  const out: (string | null)[][] = [];
  for (const row of grid) {
    const r1: (string | null)[] = [];
    for (const cell of row) { r1.push(cell, cell); }
    out.push([...r1], [...r1]);
  }
  return out;
}

/* ── Public API ── */

export function createEmptyGrid(size: number = GRID_SIZE): (string | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

/** Ensure grid is 32×32 — upscales legacy 16×16 data */
export function ensureGrid32(grid: (string | null)[][]): (string | null)[][] {
  if (!grid || grid.length === 0) return createEmptyGrid();
  if (grid.length === 16 && grid[0]?.length === 16) return upscale(grid);
  if (grid.length === GRID_SIZE) return grid;
  return createEmptyGrid();
}

/* ── Types ── */

type Tool = 'pen' | 'eraser' | 'picker';

interface PixelEditorModalProps {
  visible: boolean;
  value: (string | null)[][];
  onSave: (grid: (string | null)[][]) => void;
  onCancel: () => void;
}

/* ── SVG Grid lines path (memoised once) ── */

const gridLinePath = (() => {
  let d = '';
  for (let i = 0; i <= GRID_SIZE; i++) {
    d += `M${i} 0V${GRID_SIZE}`;
    d += `M0 ${i}H${GRID_SIZE}`;
  }
  return d;
})();

/* ── Main component ── */

export function PixelEditorModal({ visible, value, onSave, onCancel }: PixelEditorModalProps) {
  const insets = useSafeAreaInsets();
  const [grid, setGrid] = useState<(string | null)[][]>(() => value.map(r => [...r]));
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0]);
  const [tool, setTool] = useState<Tool>('pen');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setGrid(value.map(r => [...r]));
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setTool('pen');
    }
  }, [visible]);

  // Refs for touch handling (avoid stale closures)
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const colorRef = useRef(selectedColor);
  colorRef.current = selectedColor;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panXRef = useRef(panX);
  panXRef.current = panX;
  const panYRef = useRef(panY);
  panYRef.current = panY;

  const gestureRef = useRef<'idle' | 'drawing' | 'zooming'>('idle');
  const lastPinchDistRef = useRef(0);
  const lastMidRef = useRef({ x: 0, y: 0 });

  /* ── Drawing ── */

  const drawAtPoint = useCallback((locX: number, locY: number) => {
    const z = zoomRef.current;
    const px = panXRef.current;
    const py = panYRef.current;
    const cellDisplay = (CANVAS_SIZE * z) / GRID_SIZE;
    const col = Math.floor((locX - px) / cellDisplay);
    const row = Math.floor((locY - py) / cellDisplay);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

    const cur = gridRef.current;
    const curTool = toolRef.current;

    if (curTool === 'picker') {
      const c = cur[row][col];
      if (c) { colorRef.current = c; setSelectedColor(c); setTool('pen'); }
      return;
    }

    const newColor = curTool === 'eraser' ? null : colorRef.current;
    if (cur[row][col] === newColor) return;

    const next = cur.map(r => [...r]);
    next[row][col] = newColor;
    gridRef.current = next;
    setGrid(next);
  }, []);

  /* ── Touch handling (1-finger draw, 2-finger zoom/pan) ── */

  const handleResponderGrant = useCallback((e: GestureResponderEvent) => {
    const touches = (e.nativeEvent as any).touches;
    const count = touches?.length ?? 1;

    if (count >= 2) {
      gestureRef.current = 'zooming';
      const [t1, t2] = touches;
      lastPinchDistRef.current = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
      lastMidRef.current = { x: (t1.pageX + t2.pageX) / 2, y: (t1.pageY + t2.pageY) / 2 };
    } else {
      gestureRef.current = 'drawing';
      drawAtPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
    }
  }, [drawAtPoint]);

  const handleResponderMove = useCallback((e: GestureResponderEvent) => {
    const touches = (e.nativeEvent as any).touches;
    const count = touches?.length ?? 1;

    if (count >= 2 && touches) {
      gestureRef.current = 'zooming';
      const [t1, t2] = touches;
      const newDist = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
      const newMid = { x: (t1.pageX + t2.pageX) / 2, y: (t1.pageY + t2.pageY) / 2 };

      if (lastPinchDistRef.current > 0) {
        const factor = newDist / lastPinchDistRef.current;
        setZoom(z => {
          const next = Math.max(1, Math.min(6, z * factor));
          zoomRef.current = next;
          return next;
        });
      }

      const dx = newMid.x - lastMidRef.current.x;
      const dy = newMid.y - lastMidRef.current.y;
      setPanX(p => { const n = p + dx; panXRef.current = n; return n; });
      setPanY(p => { const n = p + dy; panYRef.current = n; return n; });

      lastPinchDistRef.current = newDist;
      lastMidRef.current = newMid;
    } else if (gestureRef.current === 'drawing') {
      drawAtPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
    }
  }, [drawAtPoint]);

  const handleResponderRelease = useCallback(() => {
    gestureRef.current = 'idle';
    lastPinchDistRef.current = 0;
  }, []);

  /* ── Zoom buttons ── */

  const zoomIn = useCallback(() => {
    setZoom(z => { const n = Math.min(6, z + 0.5); zoomRef.current = n; return n; });
  }, []);
  const zoomOut = useCallback(() => {
    setZoom(z => {
      const n = Math.max(1, z - 0.5);
      zoomRef.current = n;
      if (n === 1) { setPanX(0); setPanY(0); panXRef.current = 0; panYRef.current = 0; }
      return n;
    });
  }, []);
  const resetZoom = useCallback(() => {
    setZoom(1); setPanX(0); setPanY(0);
    zoomRef.current = 1; panXRef.current = 0; panYRef.current = 0;
  }, []);

  /* ── Rendered cells (memo) ── */

  const cellRects = useMemo(() => {
    const rects: React.ReactNode[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const clr = grid[r]?.[c];
        if (clr) rects.push(<Rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={clr} />);
      }
    }
    return rects;
  }, [grid]);

  const gridDisplaySize = CANVAS_SIZE * zoom;

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <View style={[es.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* ── Header ── */}
        <View style={es.header}>
          <TouchableOpacity onPress={onCancel} style={es.headerBtn}>
            <Text style={es.headerBtnText}>{'취소'}</Text>
          </TouchableOpacity>
          <Text style={es.headerTitle}>{'아바타 편집'}</Text>
          <TouchableOpacity onPress={() => onSave(grid)} style={[es.headerBtn, es.headerSaveBtn]}>
            <Text style={[es.headerBtnText, { color: '#fff' }]}>{'저장'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Canvas area ── */}
        <View style={es.canvasContainer}>
          <View
            style={[es.canvas, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleResponderGrant}
            onResponderMove={handleResponderMove}
            onResponderRelease={handleResponderRelease}
            onResponderTerminate={handleResponderRelease}
          >
            <View
              style={{
                position: 'absolute',
                left: panX,
                top: panY,
                width: gridDisplaySize,
                height: gridDisplaySize,
              }}
              pointerEvents="none"
            >
              <Svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} width={gridDisplaySize} height={gridDisplaySize}>
                {/* Grid lines */}
                <Path d={gridLinePath} stroke="rgba(0,0,0,0.08)" strokeWidth={0.04} />
                {/* Cells */}
                {cellRects}
              </Svg>
            </View>
          </View>

          {/* Zoom controls */}
          <View style={es.zoomRow}>
            <TouchableOpacity onPress={zoomOut} style={es.zoomBtn}>
              <Text style={es.zoomBtnText}>{'-'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetZoom}>
              <Text style={es.zoomLabel}>{Math.round(zoom * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={zoomIn} style={es.zoomBtn}>
              <Text style={es.zoomBtnText}>{'+'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Bottom panel (scrollable) ── */}
        <ScrollView style={es.bottomPanel} contentContainerStyle={es.bottomContent} bounces={false}>
          {/* Templates */}
          <TouchableOpacity onPress={() => setShowTemplates(v => !v)}>
            <Text style={es.templateToggle}>
              {showTemplates ? '템플릿 닫기 ▲' : '템플릿으로 시작하기 ▼'}
            </Text>
          </TouchableOpacity>
          {showTemplates && (
            <View style={es.templateRow}>
              {TEMPLATES.map(t => (
                <TouchableOpacity
                  key={t.name}
                  onPress={() => {
                    const g = t.grid.map(r => [...r]);
                    setGrid(g);
                    gridRef.current = g;
                    setShowTemplates(false);
                  }}
                  style={es.templateBtn}
                >
                  <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                  <Text style={es.templateName}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tool bar */}
          <View style={es.toolRow}>
            {([
              { key: 'pen' as Tool, label: '펜', icon: '✏️' },
              { key: 'eraser' as Tool, label: '지우개', icon: '🧹' },
              { key: 'picker' as Tool, label: '스포이드', icon: '💧' },
            ]).map(t => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTool(t.key)}
                style={[es.toolBtn, tool === t.key && es.toolBtnActive]}
              >
                <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                <Text style={[es.toolLabel, tool === t.key && es.toolLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => { setGrid(createEmptyGrid()); gridRef.current = createEmptyGrid(); }} style={es.toolBtn}>
              <Text style={{ fontSize: 16 }}>{'🗑️'}</Text>
              <Text style={es.toolLabel}>{'전체삭제'}</Text>
            </TouchableOpacity>
          </View>

          {/* Current color indicator */}
          <View style={es.currentColorRow}>
            <View style={[es.currentColorSwatch, { backgroundColor: selectedColor }]} />
            <Text style={es.currentColorText}>{selectedColor.toUpperCase()}</Text>
          </View>

          {/* Palette — 5 rows × 8 */}
          <View style={es.palette}>
            {PALETTE.map((clr, i) => (
              <TouchableOpacity
                key={clr}
                onPress={() => { setSelectedColor(clr); colorRef.current = clr; setTool('pen'); }}
                style={[
                  es.colorBtn,
                  { backgroundColor: clr },
                  selectedColor === clr && tool === 'pen' && es.colorBtnActive,
                  clr === '#FFFFFF' && { borderWidth: 1, borderColor: '#ddd' },
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── Styles ── */

const es = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerSaveBtn: {
    backgroundColor: colors.tomato,
    borderRadius: 10,
  },
  headerBtnText: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.mutedForeground,
  },

  canvasContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  canvas: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomBtnText: {
    fontSize: 18,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  zoomLabel: {
    fontSize: 12,
    fontFamily: 'Komputa-Regular',
    color: colors.mutedForeground,
    minWidth: 50,
    textAlign: 'center',
  },

  bottomPanel: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bottomContent: {
    padding: 16,
    gap: 12,
  },

  toolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnActive: {
    backgroundColor: colors.cream,
    borderColor: colors.tomato,
  },
  toolLabel: {
    fontSize: 10,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  toolLabelActive: {
    color: colors.tomato,
    fontFamily: 'KotraBold',
  },

  currentColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentColorText: {
    fontSize: 11,
    fontFamily: 'Komputa-Regular',
    color: colors.mutedForeground,
  },

  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorBtn: {
    width: (SCREEN_WIDTH - 32 - 6 * 7) / 8,
    height: 32,
    borderRadius: 6,
  },
  colorBtnActive: {
    borderWidth: 2.5,
    borderColor: colors.foreground,
    transform: [{ scale: 1.08 }],
  },

  templateToggle: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.primary,
    textAlign: 'center',
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  templateBtn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.muted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateName: {
    fontSize: 10,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
});
