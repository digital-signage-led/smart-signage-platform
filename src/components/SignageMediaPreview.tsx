import type { SceneMediaAsset } from '../lib/sceneMedia';
import { tokens } from '../tokens';
import { L } from '../i18n/labels';

interface SignageMediaPreviewProps {
  kind: 'video' | 'pdf';
  asset: SceneMediaAsset;
  pixelW: number;
  pixelH: number;
  borderRadius?: number;
  shrinkToFit?: boolean;
}

export function SignageMediaPreview({
  kind,
  asset,
  pixelW,
  pixelH,
  borderRadius = 0,
  shrinkToFit = false,
}: SignageMediaPreviewProps) {
  const boxStyle: React.CSSProperties = {
    display: 'grid',
    width: '100%',
    maxWidth: '100%',
    aspectRatio: `${pixelW} / ${pixelH}`,
    background: '#000',
    border: 'none',
    borderRadius,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  return (
    <div style={shrinkToFit ? { width: '100%', height: '100%', minHeight: 0, display: 'flex', alignItems: 'flex-start' } : undefined}>
      <div style={boxStyle}>
        {kind === 'video' ? (
          <video
            key={asset.dataUrl}
            src={asset.dataUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{ gridArea: '1/1', width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        ) : (
          <iframe
            key={asset.dataUrl}
            src={asset.dataUrl}
            title={asset.fileName}
            style={{ gridArea: '1/1', width: '100%', height: '100%', border: 'none', background: '#fff' }}
          />
        )}
        <div style={{
          gridArea: '1/1',
          alignSelf: 'end',
          justifySelf: 'start',
          margin: 8,
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          background: 'rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }}>
          {kind === 'video' ? 'MP4' : 'PDF'}
        </div>
      </div>
      {!shrinkToFit && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: tokens.text.faint, lineHeight: 1.5 }}>
          {L.scene.mediaPreviewNote(asset.fileName)}
        </p>
      )}
    </div>
  );
}
