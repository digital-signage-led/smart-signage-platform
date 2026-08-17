import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  /** 右ペイン初期幅（px） */
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  minLeftWidth?: number;
  /** localStorage キー（省略時は保存しない） */
  storageKey?: string;
  /** 左右ペインのスクロール量（大きい方） */
  onPaneScroll?: (maxScrollTop: number) => void;
}

function readStoredWidth(key: string | undefined, fallback: number): number {
  if (!key || typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function ResizableSplitPane({
  left,
  right,
  defaultRightWidth = 380,
  minRightWidth = 280,
  maxRightWidth = 720,
  minLeftWidth = 360,
  storageKey,
  onPaneScroll,
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState(() => readStoredWidth(storageKey, defaultRightWidth));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const reportPaneScroll = useCallback(() => {
    if (!onPaneScroll) return;
    const max = Math.max(
      leftScrollRef.current?.scrollTop ?? 0,
      rightScrollRef.current?.scrollTop ?? 0,
    );
    onPaneScroll(max);
  }, [onPaneScroll]);

  const clampWidth = useCallback((w: number) => {
    const el = containerRef.current;
    const maxByLeft = el ? Math.max(minRightWidth, el.clientWidth - minLeftWidth - 8) : maxRightWidth;
    return Math.min(maxRightWidth, maxByLeft, Math.max(minRightWidth, w));
  }, [maxRightWidth, minLeftWidth, minRightWidth]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, String(Math.round(rightWidth)));
  }, [rightWidth, storageKey]);

  useEffect(() => {
    const onResize = () => setRightWidth((w) => clampWidth(w));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampWidth]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: rightWidth };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startX - e.clientX;
    setRightWidth(clampWidth(dragRef.current.startWidth + delta));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        userSelect: dragging ? 'none' : undefined,
        cursor: dragging ? 'col-resize' : undefined,
      }}
    >
      <div ref={leftScrollRef} onScroll={reportPaneScroll} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(rightWidth)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          flexShrink: 0,
          width: 7,
          margin: '0 -3px',
          cursor: 'col-resize',
          position: 'relative',
          zIndex: 2,
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 3px',
            background: dragging ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
            transition: dragging ? 'none' : 'background 0.15s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 4,
            height: 32,
            borderRadius: 4,
            background: dragging ? '#fff' : 'rgba(255,255,255,0.35)',
            boxShadow: dragging ? '0 0 0 1px rgba(255,255,255,0.2)' : 'none',
            transition: dragging ? 'none' : 'background 0.15s',
          }}
        />
      </div>

      <div
        ref={rightScrollRef}
        onScroll={reportPaneScroll}
        style={{
          flexShrink: 0,
          width: rightWidth,
          minWidth: minRightWidth,
          minHeight: 0,
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0c',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {right}
      </div>
    </div>
  );
}

interface ResizableVerticalSplitPaneProps {
  top: ReactNode;
  bottom: ReactNode;
  /** 上ペイン初期高さ（px）— プレビュー帯など */
  defaultTopHeight?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
  storageKey?: string;
  /** 下ペインのスクロール量 — 上ペインを縮小 */
  collapseScrollPx?: number;
  collapseRange?: number;
  minCollapsedTopHeight?: number;
}

function readStoredHeight(key: string | undefined, fallback: number): number {
  if (!key || typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (raw === '0') return 0;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** 上下2分割 — 上: 固定高さ（プレビュー）、下: 残り（左右2画面） */
export function ResizableVerticalSplitPane({
  top,
  bottom,
  defaultTopHeight = 240,
  minTopHeight = 140,
  minBottomHeight = 200,
  storageKey,
  collapseScrollPx = 0,
  collapseRange = 220,
  minCollapsedTopHeight = 84,
}: ResizableVerticalSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const topContentRef = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState(() => readStoredHeight(storageKey, defaultTopHeight));
  const [contentMinHeight, setContentMinHeight] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const clampHeight = useCallback((h: number, floor = minTopHeight) => {
    const el = containerRef.current;
    const maxTop = el ? Math.max(floor, el.clientHeight - minBottomHeight - 8) : defaultTopHeight * 2;
    return Math.min(maxTop, Math.max(floor, h));
  }, [defaultTopHeight, minBottomHeight, minTopHeight]);

  const requiredTopHeight = Math.max(minTopHeight, contentMinHeight);
  const collapseT = Math.min(1, Math.max(0, collapseScrollPx) / collapseRange);
  const expandedTopHeight = clampHeight(topHeight, minTopHeight);
  const collapsedTopHeight = requiredTopHeight - (requiredTopHeight - minCollapsedTopHeight) * collapseT;
  const effectiveTopHeight = collapseT > 0 ? collapsedTopHeight : expandedTopHeight;

  useEffect(() => {
    const el = topContentRef.current;
    if (!el) return;
    const measure = () => setContentMinHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [top]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, String(Math.round(topHeight)));
  }, [topHeight, storageKey]);

  useEffect(() => {
    const onResize = () => {
      setTopHeight((h) => clampHeight(h, minTopHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampHeight, minTopHeight]);

  const prevContentMinRef = useRef(0);
  const initialMeasureDoneRef = useRef(false);

  useEffect(() => {
    const prev = prevContentMinRef.current;
    prevContentMinRef.current = contentMinHeight;
    if (contentMinHeight <= 0) return;

    if (!initialMeasureDoneRef.current) {
      initialMeasureDoneRef.current = true;
      setTopHeight((h) => clampHeight(h, minTopHeight));
      return;
    }

    if (contentMinHeight > prev) {
      setTopHeight((h) => {
        const nextRequired = Math.max(minTopHeight, contentMinHeight);
        return h < nextRequired ? nextRequired : h;
      });
    }
  }, [contentMinHeight, minTopHeight, clampHeight]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: effectiveTopHeight };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = e.clientY - dragRef.current.startY;
    setTopHeight(clampHeight(dragRef.current.startHeight + delta, minTopHeight));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: dragging ? 'none' : undefined,
        cursor: dragging ? 'row-resize' : undefined,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          height: effectiveTopHeight,
          minHeight: 0,
          overflow: 'hidden',
          minWidth: 0,
          borderBottom: effectiveTopHeight > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          background: '#0a0a0c',
          position: 'relative',
          zIndex: 1,
          transition: dragging ? 'none' : 'height 0.12s ease-out',
        }}
      >
        <div ref={topContentRef} style={{ height: effectiveTopHeight > 0 ? '100%' : undefined }}>
          {top}
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(effectiveTopHeight)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          flexShrink: 0,
          height: 7,
          cursor: 'row-resize',
          position: 'relative',
          zIndex: 2,
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '3px 0',
            background: dragging ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
            transition: dragging ? 'none' : 'background 0.15s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 32,
            height: 4,
            borderRadius: 4,
            background: dragging ? '#fff' : 'rgba(255,255,255,0.35)',
            boxShadow: dragging ? '0 0 0 1px rgba(255,255,255,0.2)' : 'none',
            transition: dragging ? 'none' : 'background 0.15s',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: minBottomHeight,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#08080a',
        }}
      >
        {bottom}
      </div>
    </div>
  );
}
