import { useMemo } from 'react';
import { SCENE_CATALOG } from '../data/mock';
import { canPreviewScene, resolveSignageContentOptions } from '../lib/deploy';
import {
  enabledPreviewPlaybackScenes,
  isRotationLoopScene,
  sceneLapDisplayMs,
} from '../lib/sceneCycle';
import { tokens } from '../tokens';
import { useApp } from '../context/AppContext';
import { L } from '../i18n/labels';
import { SignagePreviewFrame } from '../components/SignagePreviewFrame';
import { Button, Segmented } from '../components/ui';

export function PreviewPage() {
  const {
    sceneProject, scenes, equip, pvIdx, pvProgress, pvPlaying, setPvPlaying, pvSpeed, setPvSpeed,
    jumpPreview, pvPrev, pvNext, openScene, openDeploy, msgText, msgStyle, multilangLangs, mediaByScene,
  } = useApp();
  const accent = tokens.accent;

  const previewQueue = useMemo(() => {
    const all = enabledPreviewPlaybackScenes(scenes).filter((s) =>
      canPreviewScene(s.id, sceneProject ?? undefined, mediaByScene),
    );
    const rotation = all.filter((s) => isRotationLoopScene(s.id));
    const interrupt = all.filter((s) => !isRotationLoopScene(s.id));
    return { rotation, interrupt, all };
  }, [scenes, sceneProject, mediaByScene]);

  const en = previewQueue.all;
  const idx = en.length ? Math.min(pvIdx, en.length - 1) : 0;
  const cur = en[idx];
  const durMs = cur ? sceneLapDisplayMs(cur.duration || 1) : 1;
  const pct = cur ? Math.min(100, (pvProgress / durMs) * 100) : 0;
  const contentPreview = resolveSignageContentOptions(scenes, msgText, msgStyle, multilangLangs);
  const isInterruptCur = cur ? !isRotationLoopScene(cur.id) : false;

  return (
    <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '30px 40px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 25, fontWeight: 700 }}>{L.preview.title}</h1>
      <p style={{ margin: '0 0 24px', color: tokens.text.muted }}>{sceneProject?.company} / {sceneProject?.site}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(220px,280px)', gap: 24 }}>
        <div>
          {sceneProject ? (
            <SignagePreviewFrame
              project={sceneProject}
              equip={equip}
              sceneId={isInterruptCur ? undefined : cur?.id}
              fullRotation={isInterruptCur || !cur}
              scenes={scenes}
              borderRadius={0}
              message={contentPreview}
              mediaAsset={cur?.id ? mediaByScene[cur.id] : undefined}
            />
          ) : (
            <div style={{ background: '#000', borderRadius: 0, aspectRatio: '512/128', border: '2px solid rgba(255,255,255,0.1)' }} />
          )}
          {isInterruptCur && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: tokens.text.faint, lineHeight: 1.45 }}>
              {L.scene.previewInterruptHint}
            </p>
          )}
          <div style={{ marginTop: 16, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: accent }} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={pvPrev}>{L.preview.prev}</Button>
            <Button onClick={() => setPvPlaying(!pvPlaying)}>{pvPlaying ? L.preview.pause : L.preview.play}</Button>
            <Button variant="secondary" onClick={pvNext}>{L.preview.next}</Button>
            <Segmented options={[0.5, 1, 2].map((v) => ({ value: String(v), label: `${v}x` }))} value={String(pvSpeed)} onChange={(v) => setPvSpeed(Number(v))} />
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => openScene()}>{L.preview.toScene}</Button>
            <Button onClick={() => openDeploy()}>{L.preview.toDeploy}</Button>
          </div>
        </div>
        <div>
          {previewQueue.rotation.length > 0 && (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: tokens.text.faint, marginBottom: 8 }}>
              {L.preview.rotationSection}
            </div>
          )}
          {previewQueue.rotation.map((s) => {
            const m = SCENE_CATALOG[s.id];
            const i = en.findIndex((x) => x.id === s.id);
            return (
              <div
                key={s.id}
                onClick={() => jumpPreview(i)}
                style={{
                  padding: '10px 11px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  marginBottom: 4,
                  border: `1px solid ${i === idx ? accent : 'transparent'}`,
                  background: i === idx ? `${accent}1f` : 'transparent',
                }}
              >
                {m?.label ?? s.id}{'\u00b7'}{s.duration || 1}{L.scene.sceneDurationUnit}
              </div>
            );
          })}
          {previewQueue.interrupt.length > 0 && (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: tokens.text.faint, margin: '16px 0 8px' }}>
                {L.preview.interruptSection}
              </div>
              {previewQueue.interrupt.map((s) => {
                const m = SCENE_CATALOG[s.id];
                const globalIdx = en.findIndex((x) => x.id === s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => jumpPreview(globalIdx)}
                    style={{
                      padding: '10px 11px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      marginBottom: 4,
                      border: `1px dashed ${globalIdx === idx ? (m?.color ?? accent) : 'rgba(255,255,255,0.12)'}`,
                      background: globalIdx === idx ? `${m?.color ?? accent}1f` : 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{m?.label ?? s.id}</div>
                    <div style={{ fontSize: 11, color: tokens.text.faint, marginTop: 2 }}>
                      {L.scene.playlistInterruptOnAir}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
