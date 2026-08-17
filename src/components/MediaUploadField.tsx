import { useRef, useState, type CSSProperties } from 'react';
import { tokens } from '../tokens';
import { L } from '../i18n/labels';
import {
  MEDIA_ACCEPT,
  MEDIA_MAX_BYTES,
  formatMediaSize,
  readFileAsDataUrl,
  validateMediaFile,
  type MediaSceneId,
  type SceneMediaAsset,
} from '../lib/sceneMedia';

interface MediaUploadFieldProps {
  sceneId: MediaSceneId;
  label?: string;
  accent: string;
  enabled: boolean;
  asset?: SceneMediaAsset;
  onUpload: (asset: SceneMediaAsset) => void;
  onRemove: () => void;
  onPreview?: () => void;
  previewActive?: boolean;
}

export function MediaUploadField({
  sceneId,
  label,
  accent,
  enabled,
  asset,
  onUpload,
  onRemove,
  onPreview,
  previewActive,
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file || !enabled) return;
    const err = validateMediaFile(file, sceneId);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onUpload({
        fileName: file.name,
        mimeType: file.type || (sceneId === 'pdf' ? 'application/pdf' : 'video/mp4'),
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
    } catch {
      setError(L.scene.mediaUploadError);
    } finally {
      setLoading(false);
    }
  };

  const maxLabel = formatMediaSize(MEDIA_MAX_BYTES[sceneId]);

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${previewActive ? accent : 'rgba(255,255,255,0.1)'}`,
        background: previewActive ? `${accent}12` : tokens.bg.s2,
        padding: '14px 16px',
        opacity: enabled ? 1 : 0.55,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: asset ? 12 : 0 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${accent}22`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
        }}>
          {sceneId === 'video' ? 'MP4' : 'PDF'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {label && <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>}
          <div style={{ fontSize: 11, color: tokens.text.faint, marginTop: label ? 3 : 0, lineHeight: 1.45 }}>
            {sceneId === 'video' ? L.scene.mediaVideoHint : L.scene.mediaPdfHint}
            {' '}
            ({L.scene.mediaMaxSize(maxLabel)})
          </div>
        </div>
        {onPreview && asset && enabled && (
          <button
            type="button"
            onClick={onPreview}
            style={{
              flexShrink: 0,
              border: `1px solid ${previewActive ? accent : 'rgba(255,255,255,0.14)'}`,
              background: previewActive ? `${accent}28` : 'rgba(255,255,255,0.06)',
              color: previewActive ? accent : tokens.text.secondary,
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {L.scene.mediaPreviewBtn}
          </button>
        )}
      </div>

      {asset ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 9,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.fileName}
            </div>
            <div style={{ fontSize: 11, color: tokens.text.faint, marginTop: 2 }}>
              {L.scene.mediaUploaded}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              disabled={!enabled || loading}
              onClick={() => inputRef.current?.click()}
              style={miniBtnStyle}
            >
              {L.scene.mediaReplace}
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={onRemove}
              style={{ ...miniBtnStyle, color: tokens.status.down }}
            >
              {L.scene.mediaRemove}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!enabled || loading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void pick(e.dataTransfer.files?.[0]);
          }}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '18px 14px',
            borderRadius: 10,
            border: `1px dashed ${enabled ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
            background: 'rgba(255,255,255,0.02)',
            color: tokens.text.muted,
            fontFamily: 'inherit',
            fontSize: 12.5,
            cursor: enabled ? 'pointer' : 'not-allowed',
            lineHeight: 1.5,
          }}
        >
          {loading ? L.scene.mediaUploading : L.scene.mediaDropHint}
        </button>
      )}

      {error && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: tokens.status.down, lineHeight: 1.45 }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT[sceneId]}
        style={{ display: 'none' }}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

const miniBtnStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: tokens.text.secondary,
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
