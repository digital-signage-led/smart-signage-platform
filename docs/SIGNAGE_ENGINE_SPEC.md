# サイネージエンジン仕様 — STEP 0（本番固定）

本番 HTML は **案件タイプごとに固定**。デザイン・DOM・CSS・表示ロジックは変更不可。

**仕様の3枠:** [デザイン／コンテンツ政策／外部API](./README.md)。  
**データ源:** 気象庁・環境省＝標準。環境クラウド（ECS）・ウェザーニュース等＝[外部API](./SIGNAGE_EXTERNAL_API.md)。  
**何を出すか:** [コンテンツ政策](./SIGNAGE_CONTENT_POLICY.md)。

| バリアント | 正本 HTML | 面数 | 主な用途 |
|-----------|-----------|------|----------|
| **A** 5面基本（住之江） | `wbgt-cube-osaka-suminoe-5face.html` | 5面 640×128（右端ロゴあり） | **既定5面** · 環境省 GAS / 気象庁 |
| **B** 4面基本（鴻治組・庄原） | `wbgt-cube-hiroshima-koujigumi-4face.html` | 4面 512×128（ロゴなし） | **既定4面** · MOE/JMA · layout-512 · AMeDAS 67116 |
| **B′** 沖縄・久米島 | `wbgt-cube-okinawa-kumejima-4face.html` | 4面 512×128 | 久米島 · 通常気象＋防災割り込み · 色付き3段警報 · r8 |
| **B″** 熊本（地震・避難） | `wbgt-cube-kumamoto-4face.html` | 4面 512×128 | 避難・地震割り込みプレビュー用 |
| **C** 佐々木建設 ECS（外部API） | `wbgt-cube-sasakikensetu-4face.html` | 4面 512×128（ロゴなし） | `source=device` 時のみ · **環境クラウド** + MOE/JMA |
| **D** WxTech（ウェザーニューズ） | `wx-cube-4face.html` | 4面 512×128 | `source=wxtech` · ピンポイント予報・体感（≠WBGT）· 警報未使用 |
| （確認用） | `bousai-telop-demo.html` / `wbgt-cube-okinawa-kumejima-demo.html` | 512×128 | テロップ・沖縄確認メニュー |

> **デザイン・DOM構造・CSS・表示ロジックは変更不可。**  
> 管理アプリ [B] はエンジンを「設定して URL で配信する」側。見た目の改修は行わない。

---

## バリアント A — 5面基本（住之江）

**正本**: `wbgt-cube-osaka-suminoe-5face.html`  
（互換: `wbgt-cube-cspi2026-5face-greencross.html` は同内容のコピー）

---

## 1. 目的

建設現場 LED サイネージ（A35 / 640×128 ネイティブ）上で、以下を **自動取得・自動切替** して表示する。

| 区分 | 内容 |
|------|------|
| 時刻 | NICT 等と同期した JST 時:分 + 日付 |
| WBGT | 環境省 GAS 経由（地点コード 5 桁） |
| 気象 | 気象庁 AMeDAS・天気予報・降水ナウキャスト |
| 警報 | 熱中症アラート（環境省）、大雨警報（気象庁・本番 CSPI は `NO_JMA_WARN=true` で非表示） |
| 多言語 | WBGT レベル別メッセージ（日英インドネシア語フィリピン語ベトナム語） |

背景色・ロゴ列・列背景は **現在 WBGT レベル** に連動（`SignageBg.refreshAll`）。

---

## 2. 主要 UI（物理レイアウト）

```
┌────────────────────────────────────── 640 × 128 ──────────────────────────────────────┐
│  content-area 512×128                          │  logo-panel 128×128                  │
│  （シーン切替・横スライド 512px）               │  ロゴ + 上バー色 = WBGT barColor      │
└────────────────────────────────────────────────┴──────────────────────────────────────┘
```

- **5面（本番 A）**: 512 + 128 = 640。`native640=1` で拡大なし。
- **4面（本番 B）**: 専用 HTML（512×128）· `layout-512` · ロゴ列なし。
- **4面 ECS（本番 C）**: 佐々木建設バリアント（`source=device`）。

### シーン ID と DOM

| 管理アプリ上の概念 | DOM | 表示内容 |
|-------------------|-----|----------|
| wbgt / clock | `#scene1` | 4 列時刻 + 下帯（地点名・WBGT 文言・雨ナウキャスト） |
| forecast（AMeDAS） | `#scene2` | 天気・気温・降水… 9 項目横スクロール |
| forecast（4日） | `#scene5` | 今日〜明々後日 天気/最高気温 |
| multilang | `#scene3` | 多言語 WBGT ガイダンス + レベル上帯 |
| wbgt 予報 | `#scene4` | 暑さ指数/WBGT 4 スロット横スクロール |
| 熱中症アラート | `#sceneAlert` | 環境省発表時のみループに挿入 |
| 大雨警報 | `#sceneRainWarn` | 気象庁発表時（CSPI 本番は無効） |

### 本番ループ順（コード固定・変更不可）

```
scene1 → scene2 → scene5 → scene3 → scene4 → [alert] → [rainwarn] → scene1 …
```

- WBGT **提供期間外** (`offseason`): scene4 / scene3 / 下帯 WBGT をスキップまたは非表示。
- WBGT **取得不可** (`unavailable`): 連続 60 秒失敗後。フォールバック値は出さない（「取得不可」のみ）。
- WBGT 異常時は熱中症・大雨警報シーンも出さない（`wbgtNormalDisplay_()`）。

---

## 3. 必要データ項目（管理アプリ → サイネージ）

### 3.1 `SignageConfig`（案件ごと・HTML 内または GAS `config.json` 相当）

```javascript
{
  site: {
    customer: string,   // 顧客名
    rental: string,     // レンタル会社（下帯表示）
    label: string,      // 地点ラベル（scene5 フッター等）
    address: string
  },
  moe: {
    gasUrl: string,     // 環境省 WBGT GAS エンドポイント（必須）
    point: string,      // WBGT 5 桁地点コード（必須）例: 82182
    fallbackPoint: '',  // 本番 CSPI は空（欠測時フォールバック禁止）
    pointName: string,
    alertArea: string,  // 熱中症アラート府県名
    region: string,
    prefecture: string
  },
  jma: {
    amedasPoint: string,    // AMeDAS 地点 例: 82182
    forecastArea: string     // 予報区域 例: 400000
  },
  geo: { lat: number, lon: number },
  timeZone: 'Asia/Tokyo',
  refreshMs: 60000,
  footSource: string
}
```

### 3.2 `SIGNAGE_CONFIG`（ロゴ・下帯）

```javascript
{
  logoSrc: string,        // 右端 128×128 ロゴ
  logoAlt: string,
  logoPanelBg: string,
  footLogoSrc: string,
  footBannerSrc: string     // 下帯バナー（優先）
}
```

### 3.3 URL クエリで上書き可能な項目（本番 HTML が実装）

| パラメータ | 用途 |
|-----------|------|
| `native640=1` | 640×128 ネイティブ（本番必須・未指定時自動付与） |
| `embed=1` | iframe 用・デモバッジ非表示 |
| `moePoint` | WBGT 地点 |
| `moeApi` | GAS URL 上書き |
| `alertArea` | 熱中症アラート区域 |
| `jmaPoint` | AMeDAS 地点 |
| `jmaArea` | 予報区域 |
| `rainLat` / `rainLon` | 雨ナウキャスト座標 |

### 3.4 バリアント B — 4面基本（鴻治組・庄原）

**正本**: `wbgt-cube-hiroshima-koujigumi-4face.html`（管理アプリ 3/4 面の既定）  
**会場例**: 広島県庄原市 / WBGT・AMeDAS `67116` / 警報 `3421000`  
**レイアウト**: 512×128 · `layout-512` · ロゴ列なし · WBGT 段階色ソリッド · 白下帯  
**下帯バナー**: `./assets/kohji_logo.png`  
**割り込み**: 気象警報・熱中症アラート（発表時のみ）。避難・地震は `wbgt-cube-kumamoto-4face.html` でプレビュー

#### `SignageConfig`（地点切替）

- `moe.point` / `jma.amedasPoint` / `jma.warnCity` 等で現場切替
- 下帯バナー: `SIGNAGE_CONFIG.footBannerSrc` → `./assets/kohji_logo.png`

> 旧 4面（住之江）`wbgt-cube-osaka-suminoe-4face.html` はアーカイブ。熊本版は避難・地震用に残置。

### 3.5 バリアント C — 4面 ECS Cloud（佐々木建設）

**正本**: `wbgt-cube-sasakikensetu-4face.html`（`source=device` のときのみ）  
**会場例**: 徳島県板野郡北島町 / WBGT・AMeDAS `71106`

#### WBGT 取得優先順位

1. **ECS Cloud** — `SignageConfig.ecs` + URL `ecsDataId`
2. 失敗時 **環境省 GAS** — `moe.point` / URL `moePoint`
3. 取得不可は 60 秒後「取得不可」（フォールバック値は出さない）

#### `SignageConfig.ecs`（HTML 内・GAS config 相当）

```javascript
ecs: {
  enabled: true,
  dataId: '1050',           // ECS 計測データ ID
  loId: '019373',           // ロケーション ID（HTML 内固定・URL 未対応）
  locationLabel: '老門作業所',
  baseUrl: 'https://www.ecs-cloud.ne.jp',
  proxyUrl: 'http://127.0.0.1:3014/api/ecs/wbgt',  // CORS 回避プロキシ
  liveJson: './assets/ecs-live.json',
  refreshMs: 60000
}
```

ECS 有効時は **シーン2** が現場計測パネル（WBGT・気温・黒球温度・湿度）に切替。

#### URL クエリ（バリアント B 追加）

| パラメータ | 用途 |
|-----------|------|
| `layout512=1` | 4面レイアウト（未指定時 HTML が自動付与） |
| `ecsDataId` | ECS Cloud データ ID（必須） |
| `ecs=0` | ECS 無効化 |
| `ecsProxy` | WBGT プロキシ URL 上書き |
| `ecsRefreshMs` | ECS ポーリング間隔 |
| `moePoint` | 環境省 WBGT 地点（ECS 失敗時フォールバック・必須） |
| `jmaPoint` | AMeDAS 地点 |
| `jmaArea` | 予報区域 例: `360000` |
| `warnArea` / `warnCity` | 大雨警報区域（本番佐々木は `NO_JMA_WARN=true`） |

#### 管理アプリでの自動 URL 生成

```
データソース = 外部計測器（device）
面数 = 4
→ wbgt-cube-sasakikensetu-4face.html
→ ?native640=1&embed=1&layout512=1&ecsDataId=1050&moePoint=71106&jmaPoint=71106&...
```

環境変数 `VITE_ECS_PROXY_URL` でプロキシを全案件共通指定可能。

### 3.6 将来 Phase 2 で追加予定（設計書）

| パラメータ | 用途 | 本番 HTML 現状 |
|-----------|------|----------------|
| `d` | デバイストークン → GAS config 取得 | **未実装**（deploy 用に予約） |
| `v` | 設定バージョン | **未実装** |
| `faces` | 面数 | **未実装**（5 面 HTML 固定） |

---

## 4. WBGT レベルと表示

| levelIdx | 名称 | WBGT 閾値 | 背景色（例） |
|----------|------|-----------|-------------|
| 0 | ほぼ安全 | &lt; 21 | 青 `#308DD8` |
| 1 | 注意 | 21–24 | 黄 `#FFD92D`（黒文字） |
| 2 | 警戒 | 25–27 | 橙黄 `#FFBE2D`（黒文字） |
| 3 | 厳重警戒 | 28–30 | 橙 `#FF7E00` + パトランプ |
| 4 | 危険 | ≥ 31 | 赤 `#D61914` + パトランプ |

`displayMode`: `normal` | `unavailable`（濃灰 `#2a2a2a`）| `offseason`（中灰 `#484848`）

---

## 5. 管理アプリ [B] との接続方針

1. **デザインは触らない** — プレビューは本番 HTML を iframe（`embed=1&native640=1`）で表示。
2. **案件データ → SignageConfig 生成** — Express + GAS で HTML 直書きを置き換え（Phase 2）。
3. **配信 URL** — 案件の面数・データソースから HTML とクエリを自動選択（`src/lib/deploy.ts`）。`d`/`v` は GAS 連携後に有効化。
4. **シーン編集 UI** — 本番エンジンはループ順・秒数が **コード内固定**。管理アプリの `SceneItem.duration` は Phase 2 までエンジンに未反映（UI は契約・将来 config 用）。
5. **安全ルール** — 取得失敗フォールバック禁止・手動 WBGT 警告（管理アプリ側で実装済み）。

---

## 6. 参照

- 統合ステータス: `docs/INTEGRATION_STATUS.md`
- 配信 URL 生成: `src/lib/deploy.ts`
- 環境変数: `VITE_SIGNAGE_URL` → 本番 HTML の公開 URL
