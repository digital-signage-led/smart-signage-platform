/** アップロードロゴをサイネージ HTML と同じ origin の localStorage に渡す */

export const SIGNAGE_LOGO_STORE_KEY = 'ssp_signage_logos_v1';
export const MAX_LOGO_HASH_CHARS = 140000;

export function persistSignageLogo(id: string, src?: string): void {
  if (typeof localStorage === 'undefined') return;
  const data = (src || '').trim();
  const key = (id || '').trim();
  if (!data || !key) return;
  try {
    const map = JSON.parse(localStorage.getItem(SIGNAGE_LOGO_STORE_KEY) || '{}') as Record<string, string>;
    map[key] = data;
    localStorage.setItem(SIGNAGE_LOGO_STORE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function persistProjectLogo(project: { id: string; company?: string; logoSrc?: string; footBannerSrc?: string }): void {
  const src = (project.logoSrc || project.footBannerSrc || '').trim();
  persistSignageLogo(project.id, src);
  if (project.company?.trim()) persistSignageLogo(project.company.trim(), src);
}

export function attachSignageLogoHash(url: string, src?: string): string {
  const data = (src || '').trim();
  if (!data.startsWith('data:') || data.length > MAX_LOGO_HASH_CHARS) return url;
  return `${url.split('#')[0]}#logo=${encodeURIComponent(data)}`;
}

export function compressLogoDataUrl(dataUrl: string, maxW = 360, maxH = 64): Promise<string> {
  const src = (dataUrl || '').trim();
  if (!src.startsWith('data:image/') || src.startsWith('data:image/svg')) return Promise.resolve(src);
  if (src.length <= 24000) return Promise.resolve(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function compressLogoFile(file: File, maxW = 360, maxH = 64): Promise<string> {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return readFileDataUrl(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const obj = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(obj);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(obj);
      readFileDataUrl(file).then(resolve, reject);
    };
    img.src = obj;
  });
}

function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
