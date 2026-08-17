import { useEffect, useMemo, useState } from 'react';
import { SCENE_CATALOG } from '../data/mock';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { signageFacesLabelForProject } from '../core/layoutRegistry';
import { canPreviewScene, resolveSignageContentOptions } from '../lib/deploy';
import { MULTILANG_LANG_OPTIONS } from '../lib/multilang';
import {
  partitionScenes,
  partitionRotationScenes,
  sceneLapDisplayMs,
  MIN_SCENE_LAPS,
  MAX_SCENE_LAPS,
  INTERRUPT_SCENE_ORDER,
  INTERRUPT_SCENE_GROUPS,
  INTERRUPT_SCENE_IDS,
} from '../lib/sceneCycle';
import { isContentSceneId } from '../lib/contentScenes';
import { isExternalApiSceneId } from '../lib/externalApiScenes';
import { rotationLoopOrderIndex, rotationLoopDisplayOrder } from '../lib/sceneList';
import { isMediaSceneId, type MediaSceneId } from '../lib/sceneMedia';
import { SignagePreviewFrame } from '../components/SignagePreviewFrame';
import { MediaUploadField } from '../components/MediaUploadField';
import { ResizableSplitPane } from '../components/ResizableSplitPane';
import { Button, LapStepper, Segmented, Toggle } from '../components/ui';
import type { SceneItem } from '../types';

function DragHandle() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="#5a5a5e" style={{ flexShrink: 0 }}>
      <circle cx="2.5" cy="3" r="1.3" /><circle cx="7.5" cy="3" r="1.3" />
      <circle cx="2.5" cy="8" r="1.3" /><circle cx="7.5" cy="8" r="1.3" />
      <circle cx="2.5" cy="13" r="1.3" /><circle cx="7.5" cy="13" r="1.3" />
    </svg>
  );
}

/** カード説明（見ながら選ぶ用） */
const SCENE_BLURB: Record<string, string> = {
  wbgt: '暑さ指数を大きく表示',
  ecs: '外部API・現場計測（アメダスとは別）',
  wxtech: 'ウェザーニューズ WxTech。気象庁・環境省ではなくピンポイント予報・体感を取得',
  amedas: '気象庁アメダスの観測値（気温・雨・風など）',
  forecast: '数日先の天気と気温',
  clock: '時刻と日付',
  message: '現場向けお知らせテロップ',
  multilang: '多言語の注意メッセージ',
  video: 'アップロードした動画',
  pdf: 'アップロードしたPDF',
  rain_warn: '警戒レベル2〜5（大雨注意報〜特別警報）',
  flood_info: '警戒レベル2〜5（氾濫注意情報〜発生情報）',
  landslide_info: '警戒レベル2〜5（土砂災害注意報〜特別警報）',
  surge_info: '警戒レベル2〜5（高潮注意報〜特別警報）',
  weather_warn: '警戒レベルなし（暴風・波浪・大雪など・発表時）',
  evac_info: '避難情報（発表時）',
  jishin: '緊急地震速報（発生時）',
  bousai: '熱中症などの警戒アラート（発表時）',
  nowcast: '雨雲接近（接近時）',
};

const PLAYLIST_ROW_GRID = '44px 24px minmax(0, 1fr) auto';

export function ScenePage() {
  const {
    sceneProject, scenes, dragIndex, setDragIndex, toggleScene, patchSceneProject, setSceneLaps,
    reorderRotationScenes, msgText, setMsgText, msgStyle, setMsgStyle,
    multilangLangs, toggleMultilangLang,
    mediaByScene, setSceneMedia, removeSceneMedia,
    equip, backToStudio, openPreview, saveScenesNow,
  } = useApp();
  const accent = tokens.accent;
  const [previewSceneId, setPreviewSceneId] = useState<string | undefined>(undefined);
  const [fullRotationPreview, setFullRotationPreview] = useState(true);
  const [autoRotateIdx, setAutoRotateIdx] = useState(0);
  const [autoRotateMs, setAutoRotateMs] = useState(0);
  /** プレビュー下タブ: all | alertLevel | weatherOther | other */
  const [interruptFilter, setInterruptFilter] = useState<'all' | 'alertLevel' | 'weatherOther' | 'other'>('all');

  const { rotation: rotationScenes, interrupt: interruptScenes } = useMemo(() => partitionScenes(scenes), [scenes]);
  const { core: coreRotationScenes, content: contentRotationScenes, externalApi: externalApiScenes } = useMemo(
    () => {
      const parts = partitionRotationScenes(scenes);
      const byLoop = (a: SceneItem, b: SceneItem) => {
        const ia = rotationLoopOrderIndex(a.id);
        const ib = rotationLoopOrderIndex(b.id);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return 0;
      };
      return {
        core: [...parts.core].sort(byLoop),
        content: parts.content,
        externalApi: [...parts.externalApi].sort(byLoop),
      };
    },
    [scenes],
  );
  const textContentScenes = useMemo(
    () => contentRotationScenes.filter((s) => !isMediaSceneId(s.id)),
    [contentRotationScenes],
  );
  const mediaRotationScenes = useMemo(
    () => contentRotationScenes.filter((s) => isMediaSceneId(s.id)),
    [contentRotationScenes],
  );
  const interruptScenesOrdered = useMemo(() => {
    const byId = new Map(interruptScenes.map((s) => [s.id, s]));
    return INTERRUPT_SCENE_ORDER.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
  }, [interruptScenes]);
  const enabledRotation = rotationScenes.filter((s) => s.enabled);
  const previewableEnabled = useMemo(
    () => enabledRotation.filter((s) => canPreviewScene(s.id, sceneProject ?? undefined, mediaByScene)),
    [enabledRotation, sceneProject, mediaByScene],
  );
  const enabledInterrupt = interruptScenes.filter((s) => s.enabled);
  const previewableInterrupt = useMemo(
    () => enabledInterrupt.filter((s) => canPreviewScene(s.id, sceneProject ?? undefined, mediaByScene)),
    [enabledInterrupt, sceneProject, mediaByScene],
  );
  const filteredPreviewInterrupt = useMemo(() => {
    if (interruptFilter === 'all') return previewableInterrupt;
    const groupId =
      interruptFilter === 'alertLevel' ? 'alertLevel'
        : interruptFilter === 'weatherOther' ? 'weatherWarn'
          : 'other';
    const group = INTERRUPT_SCENE_GROUPS.find((g) => g.id === groupId);
    const ids = new Set(group?.ids ?? []);
    return previewableInterrupt.filter((s) => ids.has(s.id));
  }, [previewableInterrupt, interruptFilter]);
  const showPreviewRotationChips = interruptFilter === 'all';
  const hasPreviewContent = Boolean(
    previewSceneId
    || enabledRotation.length > 0
    || previewableInterrupt.length > 0,
  );
  const contentPreview = useMemo(
    () => resolveSignageContentOptions(scenes, msgText, msgStyle, multilangLangs),
    [scenes, msgText, msgStyle, multilangLangs],
  );
  const autoRotating = !fullRotationPreview && !previewSceneId && previewableEnabled.length > 1;

  const facesLabel = sceneProject ? signageFacesLabelForProject(sceneProject) : '';

  const activePreviewSceneId = useMemo(() => {
    const pick = (id: string | undefined) => {
      if (!id) return undefined;
      if (previewableEnabled.some((s) => s.id === id)) return id;
      if (previewableInterrupt.some((s) => s.id === id)) return id;
      // OFF でもカードタップで見た目確認できるようにする
      if (canPreviewScene(id, sceneProject ?? undefined, mediaByScene)) return id;
      if (isMediaSceneId(id)) return id;
      return id;
    };
    const fromChip = pick(previewSceneId);
    if (fromChip) return fromChip;
    if (autoRotating && previewableEnabled.length) {
      const i = Math.min(autoRotateIdx, previewableEnabled.length - 1);
      return previewableEnabled[i]?.id;
    }
    return previewableEnabled[0]?.id
      ?? previewableInterrupt[0]?.id
      ?? enabledRotation.find((s) => canPreviewScene(s.id, sceneProject ?? undefined, mediaByScene))?.id
      ?? enabledRotation[0]?.id;
  }, [previewSceneId, autoRotating, autoRotateIdx, previewableEnabled, previewableInterrupt, enabledRotation, sceneProject, mediaByScene]);

  const activeMediaAsset = activePreviewSceneId && isMediaSceneId(activePreviewSceneId)
    ? mediaByScene[activePreviewSceneId]
    : undefined;

  const previewSceneHint = useMemo(() => {
    if (fullRotationPreview || !activePreviewSceneId) return '';
    if (activePreviewSceneId === 'ecs') return L.scene.previewEcsHint;
    if (activePreviewSceneId === 'wxtech') return L.scene.previewWxtechHint;
    if (activePreviewSceneId === 'amedas') return L.scene.previewAmedasHint;
    if (activePreviewSceneId === 'jishin') return L.scene.previewJishinHint;
    if (previewableInterrupt.some((s) => s.id === activePreviewSceneId)) {
      return L.scene.previewInterruptHint;
    }
    if (isMediaSceneId(activePreviewSceneId) && !mediaByScene[activePreviewSceneId]?.dataUrl) {
      return L.scene.mediaNoFileHint;
    }
    return '';
  }, [fullRotationPreview, activePreviewSceneId, mediaByScene, previewableInterrupt]);

  const selectInterruptPreview = (id: string) => {
    /* 割り込みは only= にしない。発表がなければ真っ白になるため、本番巡回のまま見る */
    setFullRotationPreview(true);
    setPreviewSceneId(id);
    setAutoRotateMs(0);
  };

  const focusPreview = (id: string) => {
    setFullRotationPreview(false);
    setPreviewSceneId(id);
    setAutoRotateMs(0);
    const pi = previewableEnabled.findIndex((s) => s.id === id);
    if (pi >= 0) setAutoRotateIdx(pi);
  };

  const setInterruptFilterTab = (next: typeof interruptFilter) => {
    setInterruptFilter(next);
    if (next === 'all') return;
    const groupId =
      next === 'alertLevel' ? 'alertLevel'
        : next === 'weatherOther' ? 'weatherWarn'
          : 'other';
    const group = INTERRUPT_SCENE_GROUPS.find((g) => g.id === groupId);
    const ids = new Set(group?.ids ?? []);
    const list = previewableInterrupt.filter((s) => ids.has(s.id));
    if (!list.length) return;
    if (!previewSceneId || !ids.has(previewSceneId)) {
      selectInterruptPreview(list[0].id);
    }
  };

  const previewIsInterrupt = !!(activePreviewSceneId && INTERRUPT_SCENE_IDS.has(activePreviewSceneId));
  const useLiveLoop = fullRotationPreview || previewIsInterrupt;
  const previewPixel = sceneProject?.pixel || '512x128';
  const previewFilterTabs: { id: typeof interruptFilter; label: string }[] = [
    { id: 'all', label: L.scene.previewFilterAll },
    { id: 'alertLevel', label: L.scene.previewFilterAlertLevel },
    { id: 'weatherOther', label: L.scene.previewFilterWeatherOther },
    { id: 'other', label: L.scene.previewFilterOther },
  ];

  const toggleAndPreview = (id: string) => {
    const scn = scenes.find((s) => s.id === id);
    const turningOn = !(scn?.enabled);
    toggleScene(id);
    if (turningOn) {
      if (INTERRUPT_SCENE_IDS.has(id)) {
        setFullRotationPreview(true);
      } else {
        setFullRotationPreview(false);
      }
      setPreviewSceneId(id);
      setAutoRotateMs(0);
    }
  };

  useEffect(() => {
    setPreviewSceneId(undefined);
    setFullRotationPreview(false);
    setAutoRotateIdx(0);
    setAutoRotateMs(0);
  }, [sceneProject?.id]);

  useEffect(() => {
    setAutoRotateIdx(0);
    setAutoRotateMs(0);
  }, [previewableEnabled.map((s) => `${s.id}:${s.duration}`).join('|')]);

  useEffect(() => {
    if (!autoRotating || previewableEnabled.length === 0) return;
    const idx = Math.min(autoRotateIdx, previewableEnabled.length - 1);
    const durMs = sceneLapDisplayMs(previewableEnabled[idx]?.duration || 1);
    const tick = window.setInterval(() => {
      setAutoRotateMs((ms) => {
        const next = ms + 250;
        if (next >= durMs) {
          setAutoRotateIdx((i) => (i + 1) % previewableEnabled.length);
          return 0;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(tick);
  }, [autoRotating, autoRotateIdx, previewableEnabled]);

  useEffect(() => {
    if (!previewSceneId) return;
    const stillExists = scenes.some((s) => s.id === previewSceneId);
    if (!stillExists) setPreviewSceneId(undefined);
  }, [scenes, previewSceneId]);

  const playlistScenes = useMemo(
    () => rotationScenes.filter((s) => s.enabled),
    [rotationScenes],
  );

  if (!sceneProject || scenes.length === 0) {
    return (
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: tokens.text.faint }}>
        <div>{L.scene.empty}</div>
        <Button onClick={() => backToStudio()}>{L.studio.title}</Button>
      </main>
    );
  }

  const renderMessageMultilangExtras = (scn: SceneItem) => (
    <>
      {scn.id === 'message' && scn.enabled && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', marginLeft: 88 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>{L.scene.msgLabel}</label>
          <input
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder={L.scene.msgPh}
            style={{ width: '100%', height: 40, padding: '0 13px', borderRadius: 9, background: tokens.bg.s3, color: tokens.text.primary, fontFamily: 'inherit', fontSize: 14, border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
          />
          <div style={{ marginTop: 9, maxWidth: 240 }}>
            <Segmented options={[{ value: 'scroll', label: L.scene.scroll }, { value: 'fixed', label: L.scene.fixed }]} value={msgStyle} onChange={(v) => setMsgStyle(v as 'scroll' | 'fixed')} />
          </div>
        </div>
      )}
      {scn.id === 'multilang' && scn.enabled && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', marginLeft: 88 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: tokens.text.tertiary, marginBottom: 7 }}>{L.scene.multilangLangLabel}</label>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: tokens.text.faint, lineHeight: 1.45 }}>{L.scene.multilangLangHint}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MULTILANG_LANG_OPTIONS.map((opt) => {
              const on = multilangLangs.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleMultilangLang(opt.id)}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: `1px solid ${on ? accent : 'rgba(255,255,255,0.12)'}`,
                    background: on ? `${accent}22` : tokens.bg.s3,
                    color: on ? accent : tokens.text.secondary,
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  const renderPickerRows = (
    list: SceneItem[],
    extras?: (scn: SceneItem) => ReturnType<typeof renderMessageMultilangExtras>,
    showLoopOrder = false,
  ) => list.map((scn) => {
    const m = SCENE_CATALOG[scn.id];
    if (!m) return null;
    const previewActive = !fullRotationPreview && scn.id === activePreviewSceneId;
    const blurb = SCENE_BLURB[scn.id] || '';
    const loopIdx = rotationLoopDisplayOrder(scn.id);
    const orderLabel = showLoopOrder && loopIdx >= 0 ? `${loopIdx}` : '';
    return (
      <div
        key={scn.id}
        role="button"
        tabIndex={0}
        onClick={() => focusPreview(scn.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            focusPreview(scn.id);
          }
        }}
        style={{
          borderRadius: 14,
          padding: '14px 14px 12px',
          border: `1px solid ${previewActive ? m.color : 'rgba(255,255,255,0.1)'}`,
          background: previewActive ? `${m.color}18` : tokens.bg.s2,
          cursor: 'pointer',
          boxShadow: previewActive ? `0 0 0 1px ${m.color}55` : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {orderLabel ? (
            <span style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              background: `${m.color}33`,
              color: m.color,
              fontSize: 12,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}>
              {orderLabel}
            </span>
          ) : (
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, flexShrink: 0, marginTop: 4 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: 700,
                fontSize: 15,
                color: scn.enabled ? tokens.text.primary : tokens.text.faint,
              }}>
                {m.label}
              </span>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: previewActive ? m.color : tokens.text.faint,
                letterSpacing: '0.02em',
              }}>
                {previewActive ? L.scene.compositionPreview : L.scene.catalogTapHint}
              </span>
            </div>
            {blurb ? (
              <div style={{ marginTop: 4, fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.45 }}>
                {blurb}
              </div>
            ) : null}
          </div>
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Toggle
              on={scn.enabled}
              onChange={() => toggleAndPreview(scn.id)}
            />
          </span>
        </div>
        {extras?.(scn)}
      </div>
    );
  });

  const renderCoreRows = (list: SceneItem[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {renderPickerRows(list, renderMessageMultilangExtras, true)}
    </div>
  );

  const renderContentRows = (list: SceneItem[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {renderPickerRows(list, renderMessageMultilangExtras)}
    </div>
  );

  const renderExternalApiRows = (list: SceneItem[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map((scn) => {
        const m = SCENE_CATALOG[scn.id];
        if (!m) return null;
        const previewActive = !fullRotationPreview && scn.id === activePreviewSceneId;
        const blurb = SCENE_BLURB[scn.id] || '';
        return (
          <div
            key={scn.id}
            role="button"
            tabIndex={0}
            onClick={() => focusPreview(scn.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                focusPreview(scn.id);
              }
            }}
            style={{
              borderRadius: 14,
              padding: '14px 14px 12px',
              border: `1px solid ${previewActive ? m.color : 'rgba(255,255,255,0.1)'}`,
              background: previewActive ? `${m.color}18` : tokens.bg.s2,
              cursor: 'pointer',
              boxShadow: previewActive ? `0 0 0 1px ${m.color}55` : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{
                height: 22,
                minWidth: 36,
                padding: '0 7px',
                borderRadius: 7,
                background: `${m.color}33`,
                color: m.color,
                fontSize: 11,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                letterSpacing: '0.02em',
              }}
              >
                {L.scene.externalApiBadge}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: scn.enabled ? tokens.text.primary : tokens.text.faint,
                  }}>
                    {m.label}
                  </span>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: previewActive ? m.color : tokens.text.faint,
                  }}>
                    {previewActive ? L.scene.compositionPreview : L.scene.catalogTapHint}
                  </span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.45 }}>
                  {blurb || L.scene.notInRotationTag}
                </div>
                {scn.id === 'ecs' && scn.enabled && sceneProject && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}
                  >
                    <label style={{ display: 'block', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: tokens.text.faint, marginBottom: 4 }}>{L.scene.ecsDataIdLabel}</span>
                      <input
                        value={sceneProject.sourceId ?? ''}
                        onChange={(e) => patchSceneProject({ sourceId: e.target.value })}
                        placeholder="1050"
                        style={{
                          width: '100%', boxSizing: 'border-box', height: 32, borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.12)', background: tokens.bg.s3,
                          color: tokens.text.primary, fontSize: 13, padding: '0 8px', fontFamily: 'inherit',
                        }}
                      />
                    </label>
                    <label style={{ display: 'block', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: tokens.text.faint, marginBottom: 4 }}>{L.scene.ecsLoIdLabel}</span>
                      <input
                        value={sceneProject.ecsLoId ?? ''}
                        onChange={(e) => patchSceneProject({ ecsLoId: e.target.value })}
                        placeholder="019373"
                        style={{
                          width: '100%', boxSizing: 'border-box', height: 32, borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.12)', background: tokens.bg.s3,
                          color: tokens.text.primary, fontSize: 13, padding: '0 8px', fontFamily: 'inherit',
                        }}
                      />
                    </label>
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: tokens.text.faint, lineHeight: 1.45 }}>
                      {L.scene.ecsIdsHint}
                    </div>
                  </div>
                )}
              </div>
              <span
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Toggle
                  on={scn.enabled}
                  onChange={() => toggleAndPreview(scn.id)}
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPlaylistRows = (list: SceneItem[]) => list.map((scn, localIdx) => {
    const m = SCENE_CATALOG[scn.id];
    if (!m) return null;
    const globalIdx = rotationScenes.findIndex((s) => s.id === scn.id);
    const isContent = isContentSceneId(scn.id);
    const isExternalApi = isExternalApiSceneId(scn.id);
    const canDrag = scn.enabled;
    const order = localIdx + 1;
    const previewActive = !fullRotationPreview && scn.id === activePreviewSceneId;
    return (
      <div
        key={scn.id}
        role="button"
        tabIndex={0}
        draggable={canDrag}
        onClick={() => focusPreview(scn.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            focusPreview(scn.id);
          }
        }}
        onDragStart={(e) => { if (canDrag) { e.stopPropagation(); setDragIndex(globalIdx); } }}
        onDragEnter={() => dragIndex != null && reorderRotationScenes(dragIndex, globalIdx)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={() => setDragIndex(null)}
        style={{
          borderTop: localIdx > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
          padding: '11px 12px',
          background: previewActive ? `${m.color}14` : (dragIndex === globalIdx ? `${accent}12` : 'transparent'),
          cursor: canDrag ? 'grab' : 'pointer',
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: PLAYLIST_ROW_GRID,
          gap: 8,
          alignItems: 'center',
          minWidth: 0,
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: accent,
            textAlign: 'center',
          }}>
            {L.scene.sceneOrderLabel(order)}
          </span>
          <DragHandle />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <span
              title={m.label}
              style={{
                fontWeight: 600,
                fontSize: 14,
                minWidth: 0,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: tokens.text.primary,
              }}
            >
              {m.label}
            </span>
            {isContent && (
              <span style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 20,
                padding: '0 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 600,
                background: 'rgba(88,86,214,0.2)', color: '#9d9ae8',
              }}>
                {L.scene.contentBlockTitle}
              </span>
            )}
            {isExternalApi && (
              <span style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 20,
                padding: '0 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 600,
                background: 'rgba(50,173,230,0.2)', color: '#7BC9E8',
              }}>
                {L.scene.externalApiBlockTitle}
              </span>
            )}
          </div>
          <div style={{ justifySelf: 'end', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <LapStepper
              value={scn.duration || 1}
              min={MIN_SCENE_LAPS}
              max={MAX_SCENE_LAPS}
              unit={L.scene.sceneDurationUnit}
              onChange={(v) => setSceneLaps(scn.id, v)}
            />
          </div>
        </div>
      </div>
    );
  });

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '24px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: tokens.text.faint, marginBottom: 9 }}>
          <span onClick={() => backToStudio()} style={{ cursor: 'pointer' }}>{L.scene.breadcrumb}</span>
          <span>/</span>
          <span>{sceneProject.company}</span>
          <span>/</span>
          <span style={{ color: tokens.text.tertiary }}>{L.scene.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>{L.scene.title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: tokens.text.muted }}>
              {sceneProject.company}{'\u3000\u00b7\u3000'}{sceneProject.site}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: tokens.text.faint, lineHeight: 1.5, maxWidth: 560 }}>
              {L.scene.previewMakeHint}
            </p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 13px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: tokens.text.secondary }}>
            {facesLabel}
          </span>
        </div>
      </div>

      <ResizableSplitPane
        storageKey="scene-split-preview-right-width"
        defaultRightWidth={480}
        minRightWidth={340}
        maxRightWidth={720}
        minLeftWidth={360}
        left={(
          <div style={{ padding: '20px 28px 36px', maxWidth: 760 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{L.scene.makeWhileTitle}</div>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: tokens.text.faint, lineHeight: 1.5 }}>
              {L.scene.catalogTapHint} · {L.scene.previewLabel}
            </p>

            {coreRotationScenes.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.coreBlockTitle}</div>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.coreBlockHint}</p>
                {renderCoreRows(coreRotationScenes)}
              </div>
            )}

            {externalApiScenes.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.externalApiBlockTitle}</div>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.externalApiBlockHint}</p>
                {renderExternalApiRows(externalApiScenes)}
              </div>
            )}

            {textContentScenes.length > 0 ? (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.contentBlockTitle}</div>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.contentBlockHint}</p>
                {renderContentRows(textContentScenes)}
              </div>
            ) : mediaRotationScenes.length === 0 ? (
              <p style={{ margin: '0 0 22px', fontSize: 13, color: tokens.text.faint, lineHeight: 1.55 }}>
                {L.scene.contentEmpty}
              </p>
            ) : null}

            {mediaRotationScenes.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.mediaBlockTitle}</div>
                <p style={{ margin: '0 0 12px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.mediaBlockHint}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mediaRotationScenes.map((scn) => {
                    const m = SCENE_CATALOG[scn.id];
                    if (!m) return null;
                    const previewActive = !fullRotationPreview && scn.id === activePreviewSceneId;
                    const blurb = SCENE_BLURB[scn.id] || '';
                    return (
                      <div
                        key={scn.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => focusPreview(scn.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            focusPreview(scn.id);
                          }
                        }}
                        style={{
                          borderRadius: 14,
                          padding: '14px 14px 12px',
                          border: `1px solid ${previewActive ? m.color : 'rgba(255,255,255,0.1)'}`,
                          background: previewActive ? `${m.color}18` : tokens.bg.s2,
                          cursor: 'pointer',
                          boxShadow: previewActive ? `0 0 0 1px ${m.color}55` : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, flexShrink: 0, marginTop: 4 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: scn.enabled ? tokens.text.primary : tokens.text.faint,
                              }}>
                                {m.label}
                              </span>
                              <span style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: previewActive ? m.color : tokens.text.faint,
                              }}>
                                {previewActive ? L.scene.compositionPreview : L.scene.catalogTapHint}
                              </span>
                            </div>
                            {blurb ? (
                              <div style={{ marginTop: 4, fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.45 }}>
                                {blurb}
                              </div>
                            ) : null}
                          </div>
                          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <Toggle on={scn.enabled} onChange={() => toggleAndPreview(scn.id)} />
                          </span>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <MediaUploadField
                            sceneId={scn.id as MediaSceneId}
                            accent={m.color}
                            enabled={scn.enabled}
                            asset={mediaByScene[scn.id]}
                            onUpload={(asset) => setSceneMedia(scn.id, asset)}
                            onRemove={() => removeSceneMedia(scn.id)}
                            onPreview={mediaByScene[scn.id] && scn.enabled ? () => focusPreview(scn.id) : undefined}
                            previewActive={previewActive}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {interruptScenesOrdered.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.interruptBlockTitle}</div>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.interruptBlockHint}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {INTERRUPT_SCENE_GROUPS.map((group) => {
                    const rows = group.ids
                      .map((id) => interruptScenesOrdered.find((s) => s.id === id))
                      .filter((s): s is NonNullable<typeof s> => Boolean(s));
                    if (!rows.length) return null;
                    return (
                      <div key={group.id}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: tokens.text.faint, marginBottom: 8, letterSpacing: '0.02em' }}>
                          {L.scene[group.labelKey]}
                        </div>
                        {group.subLabelKey && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text.muted, margin: '0 0 8px 2px' }}>
                            {L.scene[group.subLabelKey]}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {rows.map((scn) => {
                            const m = SCENE_CATALOG[scn.id];
                            if (!m) return null;
                            const previewActive = !fullRotationPreview && scn.id === activePreviewSceneId;
                            const blurb = SCENE_BLURB[scn.id] || '';
                            return (
                              <div
                                key={scn.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => selectInterruptPreview(scn.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    selectInterruptPreview(scn.id);
                                  }
                                }}
                                style={{
                                  borderRadius: 14,
                                  padding: '14px 14px 12px',
                                  border: `1px solid ${previewActive ? m.color : 'rgba(255,255,255,0.1)'}`,
                                  background: previewActive ? `${m.color}18` : tokens.bg.s2,
                                  cursor: 'pointer',
                                  boxShadow: previewActive ? `0 0 0 1px ${m.color}55` : undefined,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, flexShrink: 0, marginTop: 4 }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <span style={{
                                        fontWeight: 700,
                                        fontSize: 15,
                                        color: scn.enabled ? tokens.text.primary : tokens.text.faint,
                                      }}>
                                        {m.label}
                                      </span>
                                      <span style={{
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        color: previewActive ? m.color : tokens.text.faint,
                                      }}>
                                        {previewActive ? L.scene.compositionPreview : L.scene.catalogTapHint}
                                      </span>
                                    </div>
                                    <div style={{ marginTop: 4, fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.45 }}>
                                      {blurb || L.scene.notInRotationTag}
                                    </div>
                                  </div>
                                  <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                    <Toggle
                                      on={scn.enabled}
                                      onChange={() => {
                                        const turningOn = !scn.enabled;
                                        toggleScene(scn.id);
                                        if (turningOn) selectInterruptPreview(scn.id);
                                      }}
                                    />
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p style={{ margin: '16px 2px 0', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.6 }}>{L.scene.footnote}</p>
          </div>
        )}
        right={(
          <div style={{
            flex: 1,
            minHeight: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#050505',
          }}>
            <div style={{
              flexShrink: 0,
              padding: '14px 18px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#000',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text.secondary, letterSpacing: '0.03em' }}>
                  {L.scene.previewLabel} {previewPixel}（本番{sceneProject?.faces ?? 4}面と同じ幅）／ {L.scene.previewPickHint}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFullRotationPreview((v) => {
                      if (!v) setPreviewSceneId(undefined);
                      return !v;
                    });
                  }}
                  style={{
                    border: 'none',
                    background: fullRotationPreview ? `${accent}33` : 'rgba(255,255,255,0.08)',
                    color: fullRotationPreview ? accent : tokens.text.muted,
                    borderRadius: 8,
                    padding: '5px 9px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {fullRotationPreview ? L.scene.previewSingleBtn : L.scene.previewRotationBtn}
                </button>
              </div>
              {!hasPreviewContent ? (
                <div style={{ padding: 20, textAlign: 'center', color: tokens.text.faint, fontSize: 12.5, background: tokens.bg.s2, borderRadius: 12 }}>
                  {L.scene.previewNoScene}
                </div>
              ) : (
                <>
                  <div style={{ minHeight: 220 }}>
                    <SignagePreviewFrame
                      project={sceneProject}
                      equip={equip}
                      sceneId={useLiveLoop ? undefined : activePreviewSceneId}
                      fullRotation={useLiveLoop}
                      scenes={scenes}
                      message={contentPreview}
                      mediaAsset={activeMediaAsset}
                      shrinkToFit
                      showOpenTab={false}
                    />
                  </div>
                  {autoRotating && activePreviewSceneId && (() => {
                    const idx = Math.min(autoRotateIdx, previewableEnabled.length - 1);
                    const durMs = sceneLapDisplayMs(previewableEnabled[idx]?.duration || 1);
                    const pct = Math.min(100, (autoRotateMs / durMs) * 100);
                    return (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 2, transition: 'width 0.2s linear' }} />
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 11, color: tokens.text.faint, lineHeight: 1.45 }}>
                          {L.scene.previewAutoRotateHint}
                          {previewSceneHint ? ` ${previewSceneHint}` : ''}
                        </p>
                      </div>
                    );
                  })()}
                  {!autoRotating && previewSceneHint && !fullRotationPreview && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: tokens.text.faint, lineHeight: 1.45 }}>
                      {previewSceneHint}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {previewFilterTabs.map((tab) => {
                      const active = interruptFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setInterruptFilterTab(tab.id)}
                          style={{
                            height: 28,
                            padding: '0 10px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            background: active ? 'rgba(242,231,0,0.12)' : 'transparent',
                            color: active ? '#F2E700' : tokens.text.muted,
                            border: `1px solid ${active ? '#F2E700' : 'rgba(255,255,255,0.18)'}`,
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {showPreviewRotationChips && previewableEnabled.map((scn) => {
                      const m = SCENE_CATALOG[scn.id];
                      if (!m) return null;
                      const active = !fullRotationPreview && scn.id === activePreviewSceneId;
                      return (
                        <button
                          key={scn.id}
                          type="button"
                          onClick={() => focusPreview(scn.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 28,
                            padding: '0 9px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            background: active ? `${m.color}33` : `${m.color}18`,
                            color: m.color,
                            border: `1px solid ${active ? m.color : `${m.color}44`}`,
                          }}
                        >
                          {m.label}
                          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.85 }}>
                            {scn.duration || 1}{L.scene.sceneDurationUnit}
                          </span>
                        </button>
                      );
                    })}
                    {filteredPreviewInterrupt.map((scn) => {
                      const m = SCENE_CATALOG[scn.id];
                      if (!m) return null;
                      const active = !fullRotationPreview && scn.id === activePreviewSceneId;
                      return (
                        <button
                          key={scn.id}
                          type="button"
                          onClick={() => selectInterruptPreview(scn.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 28,
                            padding: '0 9px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            background: active ? `${m.color}33` : `${m.color}18`,
                            color: m.color,
                            border: `1px dashed ${active ? m.color : `${m.color}66`}`,
                          }}
                          title={L.scene.previewInterruptHint}
                        >
                          <span style={{ fontSize: 10, opacity: 0.9 }}>{L.scene.previewInterruptChip}</span>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.flowTableTitle}</div>
              <p style={{ margin: '0 0 10px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.playlistBlockHint}</p>
              {playlistScenes.length > 0 ? (
                <div style={{
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  background: tokens.bg.s2,
                  minWidth: 0,
                  marginBottom: 16,
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: PLAYLIST_ROW_GRID,
                    gap: 8,
                    alignItems: 'center',
                    padding: '10px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: tokens.text.faint,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: tokens.bg.s1,
                  }}>
                    <span>{L.scene.colOrder}</span>
                    <span />
                    <span>{L.scene.colScene}</span>
                    <span style={{ textAlign: 'center' }}>{L.scene.sceneDurationLabel}</span>
                  </div>
                  {renderPlaylistRows(playlistScenes)}
                </div>
              ) : enabledInterrupt.length === 0 ? (
                <div style={{
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '20px 14px',
                  fontSize: 12.5,
                  color: tokens.text.faint,
                  textAlign: 'center',
                  lineHeight: 1.55,
                  background: tokens.bg.s2,
                  marginBottom: 16,
                }}>
                  {L.scene.playlistEmpty}
                </div>
              ) : null}

              {enabledInterrupt.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{L.scene.playlistInterruptTitle}</div>
                  <p style={{ margin: '0 0 10px', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>{L.scene.playlistInterruptHint}</p>
                  <div style={{
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    background: tokens.bg.s2,
                    minWidth: 0,
                  }}>
                    {interruptScenesOrdered.filter((s) => s.enabled).map((scn, localIdx) => {
                      const m = SCENE_CATALOG[scn.id];
                      if (!m) return null;
                      const canPreview = canPreviewScene(scn.id, sceneProject ?? undefined, mediaByScene);
                      const previewActive = !fullRotationPreview && scn.id === activePreviewSceneId;
                      return (
                        <div
                          key={scn.id}
                          role={canPreview ? 'button' : undefined}
                          tabIndex={canPreview ? 0 : undefined}
                          onClick={canPreview ? () => selectInterruptPreview(scn.id) : undefined}
                          onKeyDown={canPreview ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectInterruptPreview(scn.id);
                            }
                          } : undefined}
                          style={{
                            borderTop: localIdx > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                            padding: '11px 12px',
                            background: previewActive ? `${m.color}14` : 'transparent',
                            cursor: canPreview ? 'pointer' : 'default',
                          }}
                        >
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: PLAYLIST_ROW_GRID,
                            gap: 8,
                            alignItems: 'center',
                            minWidth: 0,
                          }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: tokens.text.faint,
                              textAlign: 'center',
                            }}>
                              {L.scene.previewInterruptChip}
                            </span>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: tokens.text.primary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {m.label}
                              </div>
                              <div style={{ fontSize: 11, color: tokens.text.faint, marginTop: 2 }}>
                                {L.scene.playlistInterruptOnAir}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: previewActive ? m.color : tokens.text.faint,
                              textAlign: 'center',
                            }}>
                              {L.scene.compositionPreview}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      />

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)' }}>
        <Button variant="secondary" onClick={() => openPreview()}>{L.scene.previewGo}</Button>
        <Button onClick={saveScenesNow}>{L.common.save}</Button>
      </div>
    </main>
  );
}
