# コンテンツ政策（何を出すか／いつ出すか）

**デザイン**（見た目）・**外部API**（どこから取るか）とは別枠です。  
この文書は **コンテンツ政策** — シーンの分類・契約・ON/OFF・通常ループと割り込み・廃止ルール — を扱います。

| 枠 | 文書 | 扱うこと |
|----|------|----------|
| デザイン | [SIGNAGE_DESIGN_*.md](./README.md#1-デザイン見た目) | 帯・フォント・色 |
| **コンテンツ政策（本紙）** | 本ファイル | 何を出すか・契約・回転／割り込み |
| 外部API | [SIGNAGE_EXTERNAL_API.md](./SIGNAGE_EXTERNAL_API.md) | 環境クラウド・ウェザーニュース等 |

管理画面の「コンテンツ制作」はこの政策に沿ってシーンを編集する場所です。

---

## 0. 原則

1. **未契約は出さない** — `contracted` / `options` に無いシーンはプレイリストに載せない  
2. **割り込みはループに混ぜない** — 警報・地震等は発生時のみ  
3. **見た目はデザインMD、データ源は外部API／標準API** — 本紙は「出す／出さない」のみ  
4. **廃止コンテンツは復帰させない** — `RETIRED_CONTENT_SCENE_IDS` から除去  
5. **地点は住所ではなく地点ID** — 天気・WBGT位置は `moePoint` / `jmaPoint` / ECS `dataId`

---

## 1. シーンの3分類

| 分類 | 意味 | 例 |
|------|------|-----|
| **コア（通常ループ）** | 平常時に巡回 | `wbgt` / `amedas` or `ecs` / `forecast` / `clock` / `message` / `multilang` |
| **追加コンテンツ** | 契約オプションの巡回枠 | `slogan` / `wind_meter` / `video` / `pdf` |
| **割り込み** | 発表・発生時のみ | `rain_warn` / `flood_info` / `landslide_info` / `surge_info` / `weather_warn` / `nowcast` / `evac_info` / `jishin` / `bousai` |

コード: `src/lib/sceneCycle.ts`（`INTERRUPT_SCENE_IDS` / `partitionScenes`）  
カタログ: `src/data/mock.ts`（`SCENE_CATALOG`）

---

## 2. 通常ループ（コア）の並び方針

HTML エンジンの標準ループ（概略）:

| 順 | シーン | 標準データ | 外部API案件（`source=device`） |
|----|--------|------------|--------------------------------|
| 1 | 時刻（clock 相当） | NICT 等 | 同左 |
| 2 | 観測 | 気象庁 AMeDAS（`amedas`） | **環境クラウド現場計測（`ecs`）** |
| 3 | 多言語 | 契約時 | ECS フローでは原則あり |
| 4 | WBGT | 環境省 | **ECS 現場 WBGT** |
| 5 | 4日予報 | 気象庁 | 気象庁（標準） |

管理アプリの既定 ID 組立: `defaultSceneIds`（`src/lib/sceneList.ts`）

- `device` → `ecs` 行を挿入（`usesEcsMeasureScene`）  
- 5桁地点あり → `amedas`  
- `multilang` は契約または ECS フローで付与  

秒数・プリセット切替の詳細は [PLATFORM_DESIGN_v3.md](./PLATFORM_DESIGN_v3.md) の `rot-1.0` を参照。

---

## 3. 割り込み政策

### 3.1 表示順（固定）

`INTERRUPT_SCENE_ORDER`:

1. 大雨浸水（警戒レベル）`rain_warn`  
2. 河川氾濫 `flood_info`  
3. 土砂災害 `landslide_info`  
4. 高潮 `surge_info`  
5. その他気象警報・注意報 `weather_warn`  
6. ナウキャスト `nowcast`  
7. 避難情報 `evac_info`  
8. 地震速報 `jishin`  
9. 警戒アラート（熱中症等）`bousai`  

### 3.2 UI グループ（コンテンツ制作）

| グループ | ID |
|----------|-----|
| 警戒レベル4種 | `rain_warn` / `flood_info` / `landslide_info` / `surge_info` |
| その他気象警報 | `weather_warn` |
| その他 | `nowcast` / `evac_info` / `jishin` / `bousai` |

### 3.3 契約の連動ルール

`normalizeProjectContracted`:

| 条件 | 自動で契約に含める |
|------|-------------------|
| `rain_warn` あり | `flood_info` / `landslide_info` / `surge_info` / `evac_info` |
| 警戒レベル4種のいずれか | `weather_warn` |
| `jishin` オプション、または standard＋`rain_warn`/`bousai` | `jishin` |

割り込みは **発表時のみ**。平常時はプレビュー用にサンプル確認できるが、本番ループには入らない。

デザイン別紙:

| 割り込み | 見た目の正 |
|----------|------------|
| 警報・注意報情報（色帯） | [SIGNAGE_DESIGN_RAIN_HERO.md](./SIGNAGE_DESIGN_RAIN_HERO.md) |
| 白ベース警報一覧 | [SIGNAGE_DESIGN_RAIN_WHITE.md](./SIGNAGE_DESIGN_RAIN_WHITE.md) |
| 緊急地震速報 | [SIGNAGE_DESIGN_QUAKE.md](./SIGNAGE_DESIGN_QUAKE.md) |

---

## 4. 追加コンテンツ政策

### 4.1 現行（出してよい）

| ID | 表示名 | 備考 |
|----|--------|------|
| `slogan` | 標語 | 巡回 |
| `wind_meter` | 風速計 | 巡回 |
| `video` | 動画（MP4） | メディア |
| `pdf` | PDF資料 | メディア |

定義: `CONTENT_SCENE_IDS`（`src/lib/contentScenes.ts`）

### 4.2 廃止（出さない・保存から除去）

| ID | 旧名称 |
|----|--------|
| `rigging` | 玉掛けワイヤー |
| `safe_days` | 無災害カウント |
| `noon_bell` | 昼の時報 |
| `sdgs` | SDGs |
| `elevation` | 海抜 |
| `safety_logo` | 安全ロゴ |
| `news` | ニュース |

`stripRetiredContentIds` で `contracted` / `options` / シーン一覧から除去。

---

## 5. データ源との切り分け（政策上）

| コンテンツ | 標準 | 外部API枠 |
|------------|------|-----------|
| 観測・現場計測 | AMeDAS | **環境クラウド**（`ecs` / `source=device`） |
| WBGT | 環境省 | **環境クラウド**（同上） |
| 予報・警報・ナウキャスト | 気象庁 | **WxTech**（`source=wxtech`）は予報・体感のみ。警報・雨雲は未使用（[外部API](./SIGNAGE_EXTERNAL_API.md)） |
| 地震 | 公式経路＋補助 p2pquake | ベンダー地震APIは外部API紙 |

**コンテンツ政策は「ecs 行を出すか」まで。接続手順は外部API紙。**

---

## 6. コンテンツ制作での操作範囲

| 操作 | 可／不可 |
|------|----------|
| シーン ON/OFF・順序・表示時間 | 可（契約内） |
| メッセージ・多言語文言 | 可 |
| 未契約シーンの追加 | 不可（案件のオプション／契約を先に） |
| 帯の太さ・フォント既定の変更 | 不可（デザインMDの正） |
| ベンダーAPIの直埋め | 不可（外部API紙＋エンジン分離） |

---

## 7. 公開URLとの関係

1. 案件テンプレで面数・エンジン・契約の9割を決める  
2. **地点ID＋会社名・現場名**を必須入力  
3. コンテンツ制作で必要なときだけ ON/OFF・メッセージ  
4. デプロイで公開URL発行（ホストは配信設定）  

詳細の運用思想は [PLATFORM_DESIGN_v3.md](./PLATFORM_DESIGN_v3.md)。

---

## 8. 変更時チェック

1. 新シーンを足す → 本紙の分類（コア／追加／割り込み）を決めてからコード  
2. 廃止 → `RETIRED_CONTENT_SCENE_IDS` と本紙 §4.2 を同時更新  
3. ベンダー由来の新シーン → [SIGNAGE_EXTERNAL_API.md](./SIGNAGE_EXTERNAL_API.md) にも節を追加  
4. 見た目だけ変える → デザインMDのみ（本紙は触らない）
