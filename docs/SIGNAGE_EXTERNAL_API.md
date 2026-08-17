# 外部API仕様（ベンダー連携の別枠）

**デザイン仕様**（帯・フォント・色）と **コンテンツ政策**（何を出すか）とは別枠です。  
この文書は **外部API／ベンダー連携だけ** を扱います。

| 枠 | 文書 |
|----|------|
| デザイン | [docs 索引 §1](./README.md#1-デザイン見た目) |
| コンテンツ政策 | [SIGNAGE_CONTENT_POLICY.md](./SIGNAGE_CONTENT_POLICY.md) |
| **外部API（本紙）** | 本ファイル |

| 区分 | 内容 | 本紙の扱い |
|------|------|------------|
| **標準データ源** | 気象庁 bosai・環境省 WBGT（GAS）・NICT 時刻など | §1（標準・ベンダーではない） |
| **外部API（ベンダー）** | **環境クラウド（ECS）**・**ウェザーニュース** 等 | §2（本紙の主対象） |
| **補助フィード** | p2pquake など非公式地震フィード | §3 |

---

## 0. 原則

1. **デザイン MD／コンテンツ政策にベンダー固有の取得手順を混ぜない**
2. **エンジン／案件の `source` で切替**する（`edam` / `jma` / `device` など）
3. ベンダーAPIは **契約・機器ID・プロキシ**が前提。未契約案件では呼ばない
4. 失敗時のフォールバックは **案件ごとに明記**（例: ECS失敗 → 環境省 GAS）
5. 新規ベンダーは **必ず本紙に節を追加**してからコード

---

## 1. 標準データ源（外部ベンダーではない）

通常案件（鴻治組・住之江・熊本・久米島など）の主経路。

| 用途 | 提供元 | 実装の入口 | 備考 |
|------|--------|------------|------|
| WBGT・熱中症アラート | 環境省（GAS） | `SignageConfig.moe.gasUrl` / `moe.point` | 地点コード5桁 |
| AMeDAS・予報・警報 | 気象庁 bosai | `SignageConfig.jma.*` | `amedasPoint` / `forecastArea` / `warnCity` |
| 降水ナウキャスト | 気象庁タイル | `jma.go.jp/bosai/jmatile/...` | 座標は `geo` |
| 時刻同期 | NICT 等 | エンジン内タイム同期 | [SIGNAGE_ENGINE_SPEC.md](./SIGNAGE_ENGINE_SPEC.md) |

| シーン | 標準データ |
|--------|------------|
| scene1 時刻 | 時刻同期のみ（WBGT文言は環境省） |
| scene2 観測 | **気象庁 AMeDAS** |
| scene4 WBGT | **環境省** |
| scene5 4日予報 | **気象庁** |
| sceneRainWarn | **気象庁警報** |
| sceneAlert | **環境省アラート** |

---

## 2. 外部API（ベンダー）— 別枠

### 2.1 環境クラウドサービス（ECS Cloud）

| 項目 | 内容 |
|------|------|
| 製品名 | 環境クラウドサービス（ECS Cloud） |
| ホスト | `https://www.ecs-cloud.ne.jp` |
| JSON API | `/Json/WBGTNumData/{dataId}` |
| 公開ページ例 | `/Public/{orgId}/Sokutei/WBGT/RN?LoID=...` |
| 案件フラグ | 管理アプリ `source=device` |
| エンジン | **`wbgt-cube-sasakikensetu-4face.html` のみ**（通常4面とは分離） |
| 設定キー | `SignageConfig.ecs`（`dataId` / `loId` / `baseUrl` / `proxyUrl` / `liveJson`） |
| 出典表記 | `出典：環境クラウドサービス・{現場名}`（例: 老門作業所） |

#### 取得経路（優先順）

1. 現場／ローカルプロキシ ` /api/ecs/wbgt` または `ecs.proxyUrl`
2. 専用 GAS（`gas/gas_ecs_proxy.gs` → `ecs.gasUrl`）
3. 同梱 `assets/ecs-live.json`（静的ホスト・バックアップ）
4. （運用方針により）環境省 GAS へフォールバック — 佐々木案件は **ECS有効時は環境省WBGTを取らない**（`ECS_ONLY_WBGT`）

#### 表示の違い（標準との分離点）

| 項目 | 標準（気象庁・環境省） | ECS（外部API） |
|------|------------------------|----------------|
| scene2 | AMeDAS 天気・気温・雨・風… | **現場計測** WBGT／気温／黒球／湿度 |
| scene4 WBGT | 環境省地点値 | **ECS 現場 WBGT** |
| 段階境界 | 環境省 21/25/28/31 | ECS機器表示に合わせ **22/26/29/32**（エンジン内） |
| 取得不可表示 | 灰・「取得不可」あり | 灰を避け、直前値維持 |

#### 管理アプリ

- データソース＝外部計測器（`device`）→ 佐々木エンジン＋ `ecsDataId`
- シーン一覧に `ecs` 行を挿入（`usesEcsMeasureScene`）— **出す／出さない**は [コンテンツ政策](./SIGNAGE_CONTENT_POLICY.md)
- 通常天候デザインの数値サイズは流用可だが、**データ源ドキュメントは本紙**

詳細のエンジン表は [SIGNAGE_ENGINE_SPEC.md](./SIGNAGE_ENGINE_SPEC.md) §3.5。

---

### 2.2 ウェザーニューズ WxTech®（ベンダー／外部API）

| 項目 | 内容 |
|------|------|
| 製品名 | ウェザーニューズ WxTech®「1kmメッシュ ピンポイント天気予報・体感予報」 |
| エンドポイント | `GET https://wxtech.weathernews.com/api/v1/ss1wx` |
| 認証 | `X-API-Key`（**GAS の Script Properties のみ**。HTML・Git に置かない） |
| キャッシュ | 約15分（`CACHE_SEC=900`） |
| 制限（トライアル） | 1日1,000回 / 秒間10回 |
| 案件フラグ | 管理アプリ `source=wxtech` |
| エンジン | **`wx-cube-4face.html` のみ**（標準 WBGT エンジンとは分離） |
| 設定 | `SignageConfig.wxtech`（`gasUrl` / `site` / `lat` / `lon`） |
| クエリ上書き | `?wxGas=` / `?wxSite=` / `?rainLat=` / `?rainLon=` / `?loc=` |
| 環境変数 | `VITE_WXTECH_GAS_URL` |
| 利用規約 | https://wxtech.weathernews.com/tos.html |
| 使用証明書 | [WXTECH_USAGE_CERTIFICATE.md](./WXTECH_USAGE_CERTIFICATE.md) |

#### 本質（証明書と同一）

- 気象コンテンツは **気象庁・環境省ではない**。WxTech `ss1wx` のみ。
- 画面の「現況」は観測実況ではなく API 応答 **`srf[0]`（短期予報）**。
- **`feeltmp` は WBGT ではない**。画面上も「体感」と明記。
- 背景の気温警戒／危険は表示側しきい値 **31℃／35℃**（`temp`）。WxTech 公式色ではない。
- 未使用: 環境省 WBGT・熱中症アラート・気象庁警報・雨雲・アメダス実況。

#### 利用フィールド

| ブロック | フィールド |
|----------|------------|
| 短期 `srf`（現況） | `date`, `wx`, `temp`, `feeltmp`, `feelidx`, `rhum`, `prec`, `wnddir`, `wndspd`, `arpress` |
| 中期 `mrf`（4日等） | `date`, `wx`, `maxtemp`, `mintemp`, `pop` |

#### 取得経路

```
LED HTML (wx-cube-4face.html)
  → Google Apps Script プロキシ (gas/WxTechProxy.gs)
  → WxTech API /api/v1/ss1wx
```

#### クレジット

気象データ提供：株式会社ウェザーニューズ（WxTech®）

#### 管理アプリ

- データソース＝WxTech → エンジン `wx-cube-4face.html` + site キー（例 `suminoe`）
- クイック作成テンプレ: `face4_wxtech`
- シーン出し分けは [コンテンツ政策](./SIGNAGE_CONTENT_POLICY.md)（警報割り込みは契約しない）

---

### 2.3 その他ベンダー（拡張用）

新規ベンダーを足すときは **必ず本紙に節を追加**し、デザインMD／コンテンツ政策には「データ源は外部API仕様を見よ」とだけ書く。

| ベンダー | 用途 | エンジン／source | 状態 |
|----------|------|------------------|------|
| 環境クラウド | 現場 WBGT・温湿度 | `device` / sasaki エンジン | **配線済** |
| ウェザーニューズ WxTech | ピンポイント予報・体感 | `wxtech` / `wx-cube-4face.html` | **配線済（トライアル）** |
| （例）独自現場センサー | WBGT・温湿度 | `device` 系 | 案件ごと |

---

## 3. 補助フィード（非公式・緊急用）

| 用途 | API | エンジン | 備考 |
|------|-----|----------|------|
| 緊急地震速報／地震情報のデモ・補完 | `api.p2pquake.net` | 熊本・沖縄など `sceneQuake` | 本番公式経路とは別。デザインは [SIGNAGE_DESIGN_QUAKE.md](./SIGNAGE_DESIGN_QUAKE.md) |

---

## 4. 他枠との対応表

| 文書 | 含めるもの | 含めないもの |
|------|------------|--------------|
| デザイン各紙 | **見た目** | ECS／ウェザーニュースの取得手順 |
| [SIGNAGE_CONTENT_POLICY.md](./SIGNAGE_CONTENT_POLICY.md) | シーン出し分け・契約・割り込み | エンドポイント・認証 |
| **本紙** | ECS・ウェザーニュース等の **接続・切替・出典** | フォント・帯の太さ・プレイリスト編集手順 |

---

## 5. 実装ファイル早見

| 種別 | パス |
|------|------|
| ECS エンジン | `public/signage/wbgt-cube-sasakikensetu-4face.html` |
| ECS プロキシ GAS | `gas/gas_ecs_proxy.gs` |
| WxTech エンジン | `public/signage/wx-cube-4face.html` |
| WxTech プロキシ GAS | `gas/WxTechProxy.gs` |
| WxTech 使用証明書 | `docs/WXTECH_USAGE_CERTIFICATE.md` |
| 管理アプリ source 分岐 | `src/lib/deploy.ts`（`source=device` / `source=wxtech`） |
| シーン `ecs` | `src/lib/sceneList.ts`（`usesEcsMeasureScene`） |
| 正本案件フォルダ | `tokushima_sasakikensetu/`（ECS）／`ウェザーニュース_API/`（WxTech 正本） |
| 標準エンジン例 | `wbgt-cube-hiroshima-koujigumi-4face.html` 等（気象庁・環境省） |

---

## 6. 変更時チェック

1. ベンダーAPIを足すとき → **本紙に節を追加**してからコード
2. 標準エンジンに ECS／ウェザーニュース専用分岐を増やしすぎない（別HTML or 明確な `source`）
3. 出典表記をデザイン下帯仕様に合わせるが、**文言は本紙**
4. シーンの出し分けを変える → [コンテンツ政策](./SIGNAGE_CONTENT_POLICY.md) も更新
5. CORS はプロキシ／GAS 経由を基本にする
