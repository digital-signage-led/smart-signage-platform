import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { Equipment, Project, SceneItem } from '../types';
import { signagePreviewPixels } from '../core/layoutRegistry';
import { buildSignagePreviewUrl, enabledEngineLoopKeys, type SignageContentOptions } from '../lib/deploy';
import { projectForScenePreview } from '../lib/externalApiScenes';
import type { AlertLevelNum } from '../lib/alertLevelColumns';
import { isMediaSceneId } from '../lib/sceneMedia';
import type { SceneMediaAsset } from '../lib/sceneMedia';
import { SignageMediaPreview } from './SignageMediaPreview';
import { tokens } from '../tokens';
import { L } from '../i18n/labels';

interface SignagePreviewFrameProps {
  project: Project;
  equip: Equipment[];
  sceneId?: string;
  fullRotation?: boolean;
  /** ON シーンのみ巡回（fullRotation 時に必須に近い） */
  scenes?: SceneItem[];
  level?: number;
  /** 警戒レベル4種（大雨・土砂・氾濫・高潮）のプレビュー段階 2〜5 */
  alertLevel?: AlertLevelNum;
  borderRadius?: number;
  showOpenTab?: boolean;
  demo?: boolean;
  message?: SignageContentOptions;
  /** video / pdf シーン用アップロード済みメディア */
  mediaAsset?: SceneMediaAsset;
  /** true: 親の幅・高さいっぱいに拡大（黒余白なし） */
  shrinkToFit?: boolean;
}

/** iframe 内の固定キャンバスを枠幅いっぱいに拡大し、黒帯を消す */
function applyPreviewFill_(iframe: HTMLIFrameElement, pixelW: number, pixelH: number): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.documentElement || !doc.body) return;
    const canvas = doc.querySelector('.canvas') as HTMLElement | null;
    if (!canvas) return;

    const iw = Math.max(1, iframe.clientWidth);
    const ih = Math.max(1, iframe.clientHeight);
    const scale = Math.min(iw / pixelW, ih / pixelH);

    doc.documentElement.style.setProperty('width', '100%', 'important');
    doc.documentElement.style.setProperty('height', '100%', 'important');
    doc.documentElement.style.setProperty('max-width', 'none', 'important');
    doc.documentElement.style.setProperty('max-height', 'none', 'important');
    doc.documentElement.style.setProperty('overflow', 'hidden', 'important');
    doc.documentElement.style.setProperty('background', '#000', 'important');

    doc.body.style.setProperty('width', '100%', 'important');
    doc.body.style.setProperty('height', '100%', 'important');
    doc.body.style.setProperty('max-width', 'none', 'important');
    doc.body.style.setProperty('max-height', 'none', 'important');
    doc.body.style.setProperty('margin', '0', 'important');
    doc.body.style.setProperty('padding', '0', 'important');
    doc.body.style.setProperty('overflow', 'hidden', 'important');
    doc.body.style.setProperty('background', '#000', 'important');

    canvas.style.setProperty('transform', `scale(${scale})`, 'important');
    canvas.style.setProperty('transform-origin', 'top left', 'important');
    canvas.style.setProperty('position', 'absolute', 'important');
    canvas.style.setProperty('top', '0', 'important');
    canvas.style.setProperty('left', '0', 'important');
    canvas.style.setProperty('margin', '0', 'important');

    const logo = doc.querySelector('.logo-panel') as HTMLElement | null;
    if (logo && doc.body.classList.contains('layout-512')) {
      logo.style.setProperty('display', 'none', 'important');
    }
  } catch {
    /* ignore */
  }
}

/**
 * プレビューはコンテンツのみ・枠いっぱいに拡大。黒バッグは付けない。
 * シーン切替は裏 iframe で先読みし、完了後に前面へ（真っ白待ち・二重読込を防ぐ）。
 */
export function SignagePreviewFrame({
  project,
  equip,
  sceneId,
  fullRotation = false,
  scenes,
  level,
  alertLevel,
  borderRadius = 0,
  showOpenTab = true,
  demo = false,
  message,
  mediaAsset,
  shrinkToFit = false,
}: SignagePreviewFrameProps) {
  const { width: pixelW, height: pixelH } = signagePreviewPixels(project.faces);
  const aspect = pixelW / pixelH;
  const mediaKind = sceneId && isMediaSceneId(sceneId) ? sceneId : null;
  const showMediaPreview = !fullRotation && mediaKind && mediaAsset?.dataUrl;
  const shellRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef<[HTMLIFrameElement | null, HTMLIFrameElement | null]>([null, null]);
  const [fitSize, setFitSize] = useState<{ w: number; h: number } | null>(null);

  const effectiveProject = useMemo(
    () => projectForScenePreview(project, scenes, fullRotation ? undefined : sceneId),
    [project, scenes, fullRotation, sceneId],
  );

  const loopKeys = useMemo(
    () => (scenes ? enabledEngineLoopKeys(scenes, effectiveProject) : undefined),
    [scenes, effectiveProject],
  );

  const previewOpts = useMemo(
    () => ({
      sceneId: fullRotation ? undefined : sceneId,
      fullRotation,
      loopKeys: fullRotation ? loopKeys : undefined,
      level,
      alertLevel,
      demo,
      ...message,
    }),
    [sceneId, fullRotation, loopKeys, level, alertLevel, demo, message],
  );

  const src = useMemo(
    () => buildSignagePreviewUrl(effectiveProject, equip, previewOpts),
    [effectiveProject, equip, previewOpts],
  );

  const openTabHref = useMemo(
    () => buildSignagePreviewUrl(effectiveProject, equip, { ...previewOpts, embed: false }),
    [effectiveProject, equip, previewOpts],
  );

  const [front, setFront] = useState(0);
  const [slotSrc, setSlotSrc] = useState<[string, string]>(() => [src, '']);
  const [slotReady, setSlotReady] = useState<[boolean, boolean]>([false, false]);
  const [loadError, setLoadError] = useState(false);
  const wantSrcRef = useRef(src);
  const frontRef = useRef(front);
  frontRef.current = front;

  useEffect(() => {
    wantSrcRef.current = src;
    const f = frontRef.current;
    if (slotSrc[f] === src) {
      if (slotReady[f]) setLoadError(false);
      return;
    }
    const back = 1 - f;
    if (slotSrc[back] === src) {
      if (slotReady[back]) {
        setFront(back);
        setLoadError(false);
      }
      return;
    }
    setSlotSrc((prev) => {
      const next: [string, string] = [...prev];
      next[back] = src;
      return next;
    });
    setSlotReady((prev) => {
      const next: [boolean, boolean] = [...prev];
      next[back] = false;
      return next;
    });
    setLoadError(false);
  }, [src, slotSrc, slotReady]);

  useEffect(() => {
    if (!shrinkToFit) {
      setFitSize(null);
      return;
    }
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      let w = availW;
      let h = w / aspect;
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }
      setFitSize({ w: Math.floor(w), h: Math.floor(h) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shrinkToFit, aspect]);

  useEffect(() => {
    const iframe = iframeRefs.current[front];
    if (!iframe || !slotReady[front]) return;
    applyPreviewFill_(iframe, pixelW, pixelH);
  }, [fitSize, pixelW, pixelH, front, slotReady]);

  const onSlotLoad = useCallback((slot: 0 | 1) => (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    const loadedUrl = slotSrc[slot];
    try {
      const doc = iframe.contentDocument;
      if (!doc?.querySelector('.canvas')) {
        if (wantSrcRef.current === loadedUrl) setLoadError(true);
        return;
      }
      applyPreviewFill_(iframe, pixelW, pixelH);
      setSlotReady((prev) => {
        const next: [boolean, boolean] = [...prev];
        next[slot] = true;
        return next;
      });
      if (wantSrcRef.current === loadedUrl) {
        setFront(slot);
        setLoadError(false);
      }
      requestAnimationFrame(() => applyPreviewFill_(iframe, pixelW, pixelH));
    } catch {
      if (wantSrcRef.current === loadedUrl) setLoadError(true);
    }
  }, [pixelW, pixelH, slotSrc]);

  const onIframeError = useCallback((slot: 0 | 1) => () => {
    if (wantSrcRef.current === slotSrc[slot]) setLoadError(true);
  }, [slotSrc]);

  const frontReady = slotReady[front] && slotSrc[front] === src;
  const switching = !frontReady && !!src;
  const showLoading = switching || (!slotReady[front] && !loadError);

  if (showMediaPreview) {
    return (
      <div style={shrinkToFit ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : undefined}>
        <div
          ref={shrinkToFit ? shellRef : undefined}
          style={shrinkToFit
            ? { flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'flex-start' }
            : undefined}
        >
          <SignageMediaPreview
            kind={mediaKind}
            asset={mediaAsset}
            pixelW={pixelW}
            pixelH={pixelH}
            borderRadius={borderRadius}
            shrinkToFit={shrinkToFit}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={shrinkToFit ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : undefined}>
      <div
        ref={shrinkToFit ? shellRef : undefined}
        style={shrinkToFit
          ? { flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }
          : undefined}
      >
        <div
          style={{
            display: 'grid',
            width: shrinkToFit && fitSize ? fitSize.w : '100%',
            height: shrinkToFit && fitSize ? fitSize.h : undefined,
            aspectRatio: shrinkToFit && fitSize ? undefined : `${pixelW} / ${pixelH}`,
            background: '#000',
            border: 'none',
            borderRadius: 0,
            overflow: 'hidden',
            boxSizing: 'border-box',
            flexShrink: 0,
            position: 'relative',
          }}
        >
        {showLoading && (
          <div style={{
            gridArea: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11.5,
            color: tokens.text.faint,
            zIndex: 3,
            pointerEvents: 'none',
            background: 'transparent',
          }}>
            {L.scene.previewLoading}
          </div>
        )}
        {loadError && (
          <div style={{
            gridArea: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            fontSize: 11.5,
            color: tokens.text.faint,
            textAlign: 'center',
            lineHeight: 1.5,
            zIndex: 4,
          }}>
            {L.scene.previewLoadError}
          </div>
        )}
        {([0, 1] as const).map((slot) => {
          const url = slotSrc[slot];
          if (!url) return null;
          const isFront = slot === front;
          const ready = slotReady[slot];
          return (
            <iframe
              key={`slot-${slot}-${url}`}
              ref={(el) => { iframeRefs.current[slot] = el; }}
              src={url}
              title={isFront ? 'Signage preview' : 'Signage preview loading'}
              scrolling="no"
              onLoad={onSlotLoad(slot)}
              onError={onIframeError(slot)}
              style={{
                gridArea: '1 / 1',
                width: '100%',
                height: '100%',
                minWidth: 0,
                minHeight: 0,
                margin: 0,
                padding: 0,
                border: 'none',
                display: 'block',
                background: '#000',
                opacity: isFront && ready && !loadError && slotSrc[slot] === src ? 1 : 0,
                zIndex: isFront ? 2 : 1,
                pointerEvents: isFront ? 'auto' : 'none',
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          );
        })}
        </div>
      </div>
      {showOpenTab && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: tokens.text.faint, lineHeight: 1.45, flexShrink: 0 }}>
          {fullRotation ? L.scene.previewLoopHint : L.scene.previewSceneHint}
          {' '}
          <a
            href={openTabHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: tokens.accent, textDecoration: 'none' }}
          >
            {L.scene.previewOpenTab(pixelW, pixelH)}
          </a>
        </p>
      )}
    </div>
  );
}
