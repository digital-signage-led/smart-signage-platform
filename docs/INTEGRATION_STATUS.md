# Smart Signage Platform — 統合ステータス (v3.0)

v3.0 個別アップデート設計書に対する **このリポジトリ（管理アプリ ①）** の実装状況。

## 6つのアップデート対象

| 対象 | リポジトリ内 | 状態 |
|------|-------------|------|
| ① 全体システム | 本アプリ (React + localStorage) | 部分実装 |
| ② WBGTエンジン | `wbgt-cube-*-*.html`（本番固定）+ `src/core/signageModules.ts` | 仕様固定・マニフェストのみ |
| ③ 計測機器連携 | `src/core/adapters.ts` | 型・定義のみ（GAS未連携） |
| ④ 気象庁API | `src/lib/signageConfig.ts`（credit 強制） | config 生成のみ |
| ⑤ 解像度管理 | `src/core/layoutRegistry.ts` | 台帳サンプル + デプロイ前検証 |
| 巡回ローテーション | `src/core/rotationPresets.ts` (`rot-1.0`) | 3プリセット + config 出力 + シーン UI |
| ⑥ 監視 | 監視画面 UI | モックのみ |

## Phase 1–2 チェックリスト

| 項目 | 状態 | 備考 |
|------|------|------|
| モジュール版マニフェスト | 済 | `signageModules.ts` |
| 6対象バージョン台帳表示 | 済 | `platformRegistry.ts` + Deploy 画面 |
| 地点ID → config.json 自動生成 | 済 | `buildSignageConfig()` |
| 配信 URL 自動生成 | 部分 | 面数+ソースで HTML 選択、ECS クエリ対応 |
| 解像度ミスマッチ検証 | 済 | `validatePixel()` + deploy チェック |
| 5面ロゴ必須 | 済 | Form 保存 + deploy チェック |
| 巡回プリセット（standard/danger/offseason） | 済 | `rotationPresets.ts` + config + シーン画面 |
| config → GAS 登録 | 未 | JSON プレビュー・コピーのみ |
| WBGT 取得テスト（ライブ） | 未 | バリデーションのみ |
| SQLite + Express API | 未 | localStorage |
| GitHub Pages モジュール分割 | 未 | 設計のみ |

## 独立更新単位（本リポジトリ）

```
src/core/platformRegistry.ts  … 6対象バージョン
src/core/signageModules.ts    … エンジンモジュール版
src/core/adapters.ts          … アダプター定義
src/core/layoutRegistry.ts    … 解像度台帳
src/core/rotationPresets.ts   … 巡回標準仕様 rot-1.0
src/lib/signageConfig.ts      … config.json ビルダー
src/lib/deploy.ts             … URL・チェック
docs/PLATFORM_DESIGN_v3.md    … v3.0 設計参照
```

## 次アクション

1. **Phase 2** — GAS config 登録 + WBGT 取得テスト API
2. **Phase 3** — Express + SQLite バックエンド
3. **Phase 4** — 監視 GAS + アダプター実装

## 安全ルール（必須）

- WBGT 取得失敗時 **フォールバック値禁止** → 「取得不可」のみ
- 気象業務法：**「データ提供：気象庁」** を config に強制
- 手動 WBGT は自動更新なし（UI で警告済み）
