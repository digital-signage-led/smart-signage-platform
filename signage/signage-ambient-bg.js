/**
 * サイネージ環境背景 — 季節 / 月 / 空（リアルタイム）
 * WBGT 5段階色は col-bg-wbgt-overlay で上に重ね、段階ごとに不透明度を変えて切り替える。
 */
(function (global) {
    'use strict';

    let skyTimer_ = null;
    let lastSkyKey_ = null;

    const SEASON_MONTHS = {
        spring: [4, 5, 6],
        summer: [7, 8, 9],
        autumn: [10, 11],
        winter: [12, 1, 2, 3],
    };

    const SEASON_GRADIENTS = {
        spring: 'linear-gradient(165deg, #b8f0d8 0%, #ffe8f0 38%, #fff5c8 72%, #c8f5e4 100%)',
        summer: 'linear-gradient(165deg, #1a8fd4 0%, #4ecdc4 35%, #7ee8fa 68%, #f9f871 100%)',
        autumn: 'linear-gradient(165deg, #c45c26 0%, #e88d4f 32%, #f4c77b 58%, #8b5a3c 100%)',
        winter: 'linear-gradient(165deg, #6b8fa8 0%, #b8d4e8 38%, #e8f4fc 68%, #9eb6c9 100%)',
    };

    /** 月ごとの背景（1–12） */
    const MONTH_GRADIENTS = {
        1: 'linear-gradient(160deg, #dce9f5 0%, #a8c4dc 55%, #6e8fa8 100%)',
        2: 'linear-gradient(160deg, #f0e6f5 0%, #d4b8e0 50%, #9a7ab0 100%)',
        3: 'linear-gradient(160deg, #ffd6e8 0%, #ffb8d0 45%, #ff8cb0 100%)',
        4: 'linear-gradient(160deg, #d4f5e4 0%, #a8e6cf 50%, #7ed4a8 100%)',
        5: 'linear-gradient(160deg, #c8f0d8 0%, #90d8b0 50%, #5cb888 100%)',
        6: 'linear-gradient(160deg, #b8e8f8 0%, #78c8e8 50%, #48a8d8 100%)',
        7: 'linear-gradient(160deg, #1e90d8 0%, #38b8e8 45%, #7ee0ff 100%)',
        8: 'linear-gradient(160deg, #00a8d8 0%, #40c8f0 50%, #90e8ff 100%)',
        9: 'linear-gradient(160deg, #f0c878 0%, #e8a848 50%, #c87830 100%)',
        10: 'linear-gradient(160deg, #e87830 0%, #d85828 45%, #a83820 100%)',
        11: 'linear-gradient(160deg, #c85820 0%, #a84018 50%, #783010 100%)',
        12: 'linear-gradient(160deg, #c0d8e8 0%, #88a8c8 50%, #587898 100%)',
    };

    const SEASON_LABELS = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

    /** SignageBg.LEVELS と同色（ほぼ安全〜危険） */
    const WBGT_LEVEL_COLORS = [
        { levelIdx: 0, bgColor: '#308DD8' },
        { levelIdx: 1, bgColor: '#FFD92D' },
        { levelIdx: 2, bgColor: '#FFBE2D' },
        { levelIdx: 3, bgColor: '#FF7E00' },
        { levelIdx: 4, bgColor: '#D61914' },
    ];

    /**
     * WBGT 表示時は 5 段階色を主役にする（ほぼ安全〜危険）。
     * 季節・空はわずかに残し、段階色がはっきり見えるようにする。
     */
    const WBGT_LEVEL_BLEND = [
        { levelIdx: 0, overlayOpacity: 0.94, ambientScale: 0.12 }, /* ほぼ安全 #308DD8 */
        { levelIdx: 1, overlayOpacity: 0.95, ambientScale: 0.10 }, /* 注意 #FFD92D */
        { levelIdx: 2, overlayOpacity: 0.95, ambientScale: 0.10 }, /* 警戒 #FFBE2D */
        { levelIdx: 3, overlayOpacity: 0.96, ambientScale: 0.08 }, /* 厳重警戒 #FF7E00 */
        { levelIdx: 4, overlayOpacity: 0.97, ambientScale: 0.06 }, /* 危険 #D61914 */
    ];

    function normalizeHex_(color) {
        if (!color) return '';
        const s = String(color).trim().toLowerCase();
        if (!s.startsWith('#')) return s;
        if (s.length === 4) {
            return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
        }
        return s;
    }

    function levelIdxFromWbgtColor(bgColor) {
        const c = normalizeHex_(bgColor);
        const row = WBGT_LEVEL_COLORS.find(function (l) {
            return normalizeHex_(l.bgColor) === c;
        });
        return row ? row.levelIdx : -1;
    }

    function blendForLevel_(levelIdx) {
        const idx = Math.max(0, Math.min(4, levelIdx | 0));
        return WBGT_LEVEL_BLEND.find(function (b) { return b.levelIdx === idx; }) || WBGT_LEVEL_BLEND[0];
    }

    function skyPeriodLabel(hour) {
        const h = hour | 0;
        if (h >= 5 && h < 8) return '朝';
        if (h >= 8 && h < 17) return '昼';
        if (h >= 17 && h < 20) return '夕';
        return '夜';
    }

    function isBrightAmbient_(parts) {
        return isEnabled_('sky') && parts.hour >= 8 && parts.hour < 17;
    }

    function ambientBadgeText_(date) {
        const parts = resolveDate_(date);
        const chips = [];
        if (isEnabled_('season')) chips.push(SEASON_LABELS[seasonFromMonth(parts.month)] || '');
        if (isEnabled_('month')) chips.push(parts.month + '月');
        if (isEnabled_('sky')) chips.push(skyPeriodLabel(parts.hour));
        return chips.filter(Boolean).join(' · ');
    }

    function clamp01(v) {
        return Math.max(0, Math.min(1, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpColor(c1, c2, t) {
        const p = (hex) => {
            const h = hex.replace('#', '');
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        };
        const a = p(c1);
        const b = p(c2);
        const m = t.map ? t : [t, t, t];
        const r = Math.round(lerp(a[0], b[0], m[0]));
        const g = Math.round(lerp(a[1], b[1], m[1]));
        const bl = Math.round(lerp(a[2], b[2], m[2]));
        return `rgb(${r},${g},${bl})`;
    }

    function seasonFromMonth(month) {
        const m = month | 0;
        if (SEASON_MONTHS.spring.indexOf(m) >= 0) return 'spring';
        if (SEASON_MONTHS.summer.indexOf(m) >= 0) return 'summer';
        if (SEASON_MONTHS.autumn.indexOf(m) >= 0) return 'autumn';
        return 'winter';
    }

    /** 0–24 時の空グラデーション（明るさ・色が時間で変化） */
    function skyGradientFromHour(hour, minute) {
        const t = hour + (minute || 0) / 60;
        const stops = [
            { at: 0, top: '#020818', bottom: '#0a1830' },
            { at: 4.5, top: '#0a1838', bottom: '#1a2848' },
            { at: 5.5, top: '#1a2848', bottom: '#ff8860' },
            { at: 6.5, top: '#ff9868', bottom: '#88c8f0' },
            { at: 8, top: '#58b0f0', bottom: '#a8e0ff' },
            { at: 11, top: '#48a8f0', bottom: '#c8ecff' },
            { at: 14, top: '#38a0e8', bottom: '#b8e4ff' },
            { at: 17, top: '#5098d8', bottom: '#f0c878' },
            { at: 18.5, top: '#f07848', bottom: '#e85830' },
            { at: 19.5, top: '#c04828', bottom: '#382838' },
            { at: 21, top: '#281838', bottom: '#101828' },
            { at: 24, top: '#020818', bottom: '#0a1830' },
        ];
        let i = 0;
        while (i < stops.length - 1 && t >= stops[i + 1].at) i++;
        const a = stops[i];
        const b = stops[Math.min(i + 1, stops.length - 1)];
        const span = b.at - a.at || 1;
        const f = clamp01((t - a.at) / span);
        const top = lerpColor(a.top, b.top, f);
        const bottom = lerpColor(a.bottom, b.bottom, f);
        return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
    }

    function resolveDate_(date) {
        const qMonth = typeof URLSearchParams !== 'undefined'
            ? new URLSearchParams(global.location.search).get('bgMonth')
            : null;
        const qHour = typeof URLSearchParams !== 'undefined'
            ? new URLSearchParams(global.location.search).get('bgHour')
            : null;
        if (date && typeof date === 'object' && date.month != null && date.hour != null) {
            const month = qMonth ? Math.max(1, Math.min(12, Number(qMonth) | 0)) : (date.month | 0);
            let hour = date.hour | 0;
            const minute = date.minute != null ? (date.minute | 0) : 0;
            if (qHour != null && qHour !== '') hour = Math.max(0, Math.min(23, Number(qHour) | 0));
            return { month, hour, minute };
        }
        const d = date instanceof Date ? date : new Date(date || Date.now());
        const month = qMonth ? Math.max(1, Math.min(12, Number(qMonth) | 0)) : (d.getMonth() + 1);
        let hour = d.getHours();
        let minute = d.getMinutes();
        if (qHour != null && qHour !== '') {
            hour = Math.max(0, Math.min(23, Number(qHour) | 0));
        }
        return { month, hour, minute };
    }

    function isEnabled_(key) {
        const cfg = (global.SignageConfig && global.SignageConfig.ambient) || {};
        if (cfg.enabled === false) return false;
        if (cfg[key] === false) return false;
        const q = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(global.location.search) : null;
        if (q) {
            const all = q.get('bgAmbient');
            if (all === '0') return false;
            const one = q.get('bg' + key.charAt(0).toUpperCase() + key.slice(1));
            if (one === '0') return false;
            if (one === '1') return true;
        }
        return cfg[key] !== false;
    }

    function ensureAmbientStack_(body) {
        if (!body || body.querySelector('.col-bg-ambient-stack')) return;
        body.style.position = 'relative';
        body.style.overflow = 'hidden';
        const stack = document.createElement('div');
        stack.className = 'col-bg-ambient-stack';
        stack.setAttribute('aria-hidden', 'true');
        stack.innerHTML =
            '<div class="amb-layer amb-sky"></div>' +
            '<div class="amb-layer amb-month"></div>' +
            '<div class="amb-layer amb-season"></div>' +
            '<div class="col-bg-wbgt-overlay"></div>';
        body.insertBefore(stack, body.firstChild);
    }

    function paintBodyAmbient_(body, wbgtColors, displayMode, date, opts) {
        if (!body) return;
        const o = opts || {};
        const contentMode = displayMode === 'content';
        ensureAmbientStack_(body);
        const stack = body.querySelector('.col-bg-ambient-stack');
        if (!stack) return;
        const skyEl = stack.querySelector('.amb-sky');
        const monthEl = stack.querySelector('.amb-month');
        const seasonEl = stack.querySelector('.amb-season');
        const overlay = stack.querySelector('.col-bg-wbgt-overlay');
        const parts = resolveDate_(date);
        const season = seasonFromMonth(parts.month);

        const skyOp = contentMode ? 1 : 0.95;
        const monthOp = contentMode ? 0.72 : 0.62;
        const seasonOp = contentMode ? 0.78 : 0.7;
        const solid = displayMode === 'offseason' || displayMode === 'unavailable';
        const levelIdx = solid
            ? -1
            : (o.levelIdx != null && o.levelIdx >= 0
                ? (o.levelIdx | 0)
                : levelIdxFromWbgtColor(wbgtColors && wbgtColors.bgColor));
        const blend = levelIdx >= 0 ? blendForLevel_(levelIdx) : null;
        const ambScale = solid ? 0 : (blend ? blend.ambientScale : 1);

        if (skyEl) {
            skyEl.style.background = isEnabled_('sky')
                ? skyGradientFromHour(parts.hour, parts.minute)
                : 'transparent';
            skyEl.style.opacity = isEnabled_('sky') && !solid ? String(skyOp * ambScale) : '0';
        }
        if (monthEl) {
            monthEl.style.background = isEnabled_('month')
                ? (MONTH_GRADIENTS[parts.month] || MONTH_GRADIENTS[1])
                : 'transparent';
            monthEl.style.opacity = isEnabled_('month') && !solid ? String(monthOp * ambScale) : '0';
            monthEl.style.mixBlendMode = contentMode ? 'normal' : 'soft-light';
        }
        if (seasonEl) {
            seasonEl.style.background = isEnabled_('season')
                ? (SEASON_GRADIENTS[season] || SEASON_GRADIENTS.spring)
                : 'transparent';
            seasonEl.style.opacity = isEnabled_('season') && !solid ? String(seasonOp * ambScale) : '0';
            seasonEl.style.mixBlendMode = contentMode ? 'normal' : 'overlay';
        }
        if (overlay && wbgtColors) {
            overlay.style.backgroundColor = wbgtColors.bgColor || '#308DD8';
            overlay.style.mixBlendMode = 'normal';
            if (solid) overlay.style.opacity = '0.92';
            else if (contentMode) overlay.style.opacity = o.tintOpacity != null ? String(o.tintOpacity) : '0.12';
            else if (blend) overlay.style.opacity = String(blend.overlayOpacity);
            else overlay.style.opacity = '0.48';
        }
        body.classList.remove('wbgt-bg-lv-0', 'wbgt-bg-lv-1', 'wbgt-bg-lv-2', 'wbgt-bg-lv-3', 'wbgt-bg-lv-4');
        if (levelIdx >= 0 && !solid) {
            body.classList.add('wbgt-bg-lv-' + levelIdx);
            body.setAttribute('data-wbgt-level', String(levelIdx));
        } else {
            body.removeAttribute('data-wbgt-level');
        }
        body.classList.toggle('cnt-bright-text', contentMode && isBrightAmbient_(parts));
        const badge = body.querySelector('.cnt-ambient-badge');
        if (badge) {
            const txt = ambientBadgeText_(parts);
            badge.textContent = txt;
            badge.hidden = !txt;
        }
    }

    function refreshAll(date) {
        const parts = resolveDate_(date);
        document.querySelectorAll('.col-bg-body').forEach(function (body) {
            const layer = body.closest('.col-bg-layer');
            const host = body.closest('.col-bg-host, .content-area');
            let wbgt = { bgColor: '#308DD8', barColor: '#55A5E6' };
            let mode = 'normal';
            if (layer) {
                const top = layer.querySelector('.col-bg-top');
                if (top && top.style.backgroundColor) wbgt.barColor = top.style.backgroundColor;
            }
            if (host) {
                if (host.classList.contains('wbgt-off-season')) mode = 'offseason';
                if (host.classList.contains('wbgt-unavailable')) mode = 'unavailable';
            }
            const overlay = body.querySelector('.col-bg-wbgt-overlay');
            if (overlay && overlay.style.backgroundColor) wbgt.bgColor = overlay.style.backgroundColor;
            const storedLv = body.getAttribute('data-wbgt-level');
            const levelIdx = storedLv != null && storedLv !== ''
                ? Number(storedLv)
                : levelIdxFromWbgtColor(wbgt.bgColor);
            paintBodyAmbient_(body, wbgt, mode, date, { levelIdx: levelIdx });
        });
        const stripBodies = document.querySelectorAll('.scene-strip-bg .col-bg-body');
        stripBodies.forEach(function (body) {
            const host = body.closest('.content-area');
            let mode = 'normal';
            if (host) {
                if (host.classList.contains('wbgt-off-season')) mode = 'offseason';
                if (host.classList.contains('wbgt-unavailable')) mode = 'unavailable';
            }
            const overlayEl = body.querySelector('.col-bg-wbgt-overlay');
            const storedLv = body.getAttribute('data-wbgt-level');
            const fallbackBg = (overlayEl && overlayEl.style.backgroundColor)
                || (host && host.style.backgroundColor)
                || '#308DD8';
            const levelIdx = storedLv != null && storedLv !== ''
                ? Number(storedLv)
                : levelIdxFromWbgtColor(fallbackBg);
            paintBodyAmbient_(body, { bgColor: fallbackBg, barColor: '' }, mode, date, { levelIdx: levelIdx });
        });
        document.querySelectorAll('.cnt-body').forEach(function (body) {
            const shell = body.closest('.cnt-shell');
            const bar = shell && shell.querySelector('.cnt-top-bar');
            const accent = (bar && bar.style.backgroundColor) || '#308DD8';
            paintBodyAmbient_(body, { bgColor: accent, barColor: accent }, 'content', date);
        });
    }

    function applyToContentBody(body, accentColor, date) {
        paintBodyAmbient_(body, { bgColor: accentColor || '#308DD8', barColor: accentColor }, 'content', date);
    }

    function applyToBody(body, colors, displayMode, date, opts) {
        paintBodyAmbient_(body, colors, displayMode || 'normal', date, opts);
    }

    function startSkyClock_(getParts) {
        if (skyTimer_) return;
        const tick = function () {
            if (!isEnabled_('sky')) return;
            const parts = typeof getParts === 'function'
                ? getParts()
                : resolveDate_(new Date());
            const key = parts.hour + ':' + parts.minute;
            if (key === lastSkyKey_) return;
            lastSkyKey_ = key;
            refreshAll(parts);
        };
        skyTimer_ = global.setInterval(tick, 30000);
        tick();
    }

    function stopSkyClock_() {
        if (skyTimer_) {
            global.clearInterval(skyTimer_);
            skyTimer_ = null;
        }
    }

    global.SignageAmbientBg = {
        SEASON_MONTHS,
        SEASON_GRADIENTS,
        MONTH_GRADIENTS,
        WBGT_LEVEL_COLORS,
        WBGT_LEVEL_BLEND,
        seasonFromMonth,
        skyGradientFromHour,
        levelIdxFromWbgtColor,
        blendForLevel_,
        ensureAmbientStack_,
        applyToBody,
        applyToContentBody,
        ambientBadgeText_,
        refreshAll,
        startSkyClock_,
        stopSkyClock_,
        isEnabled_,
    };
})(typeof window !== 'undefined' ? window : global);
