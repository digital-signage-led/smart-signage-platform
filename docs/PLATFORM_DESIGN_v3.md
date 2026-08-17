# Smart Signage Platform — 個別アップデート対応 完全設計書

**版：v3.0（個別更新 + 自動化版）**  
**作成日：2026年6月28日**  
**設計原則：すべてが常に動き続ける。全部を一度に止めない。1つずつ更新する。**

> 実装マッピング: `src/core/platformRegistry.ts`（6対象）, `src/core/signageModules.ts`（②）, `src/core/adapters.ts`（③）, `src/core/layoutRegistry.ts`（⑤）, `src/core/rotationPresets.ts`（巡回・rot-1.0）, `src/lib/signageConfig.ts`（⑨自動化）

---

## VII-b. ローテーション標準仕様（⑤解像度とは独立・`rot-1.0`）

**更新単位:** `rotationPresets.ts` のみ修正 → config の `rotation` ブロックが変わる。解像度台帳・エンジン HTML には触れない。

### 3プリセット（状況別自動切替）

| 状況 | preset | 1周 | 意図 |
|------|--------|-----|------|
| 平常時（注意以下） | `standard` | 45秒 | WBGT 2回 + 時計 + 予報 + 多言語 + メッセージ |
| 危険レベル（WBGT≥31） | `danger` | 44秒 | WBGT 3回・長尺化で警告を濃く |
| オフシーズン（12–2月） | `offseason` | 24秒 | WBGT 非表示、時計+予報+お知らせ中心 |

### config.rotation 構造

```json
"rotation": {
  "version": "rot-1.0",
  "preset": "standard",
  "transition_ms": 400,
  "presets": { "standard": [...], "danger": [...], "offseason": [...] },
  "scroll": { "speed_px_per_sec": 100, "until_complete": true },
  "interrupt": ["rain_warn", "jishin"],
  "auto": {
    "enabled": true,
    "danger_wbgt_gte": 31,
    "danger_preset": "danger",
    "offseason_months": [12, 1, 2],
    "offseason_preset": "offseason"
  }
}
```

### 運用ルール

1. **割り込み優先:** `rain_warn` / `jishin` は巡回ループに含めない。発生時は即表示。
2. **スクロール優先:** メッセージ等のスクロールは `sec` 固定より「全文流れ切るまで」優先（`until_complete: true`）。
3. **自動切替優先度:** 割り込み > 危険 WBGT ≥ 31 > オフシーズン月 > 平常 `standard`。
4. **契約フィルタ:** 未契約シーン（例: multilang）は presets から自動除外。
5. **個別更新:** 秒数変更は `rot-1.0` → `rot-1.1` として旧版を並行配置、config の version で現場ごとに固定。

---

## 0. この設計書が解決すること

```
【課題】
・全部を一度にアップデートすると、1つのバグで全現場が止まる
・WBGTエンジン、計測機器連携、気象庁API、管理システム…
  それぞれ更新タイミングが違う
・4面/5面/解像度がバラバラで、どこで何が動いているか分からない
・地点IDを入れるだけで全部自動セットアップしたい

【解決】
・6つのアップデート対象を完全独立させる
・各対象は個別にバージョン管理・更新・ロールバック可能
・地点ID → config → 配信URL を全自動生成
・解像度・面数・ロゴを一元管理する台帳
```

（以下、ユーザー提供の v3.0 全文 — セクション I〜XV は設計書原本と同一）

---

## I. 6つのアップデート対象（すべて個別更新可能）

| ID | 対象 | コード上の参照 |
|----|------|----------------|
| system | ① 全体システム基盤 | `PLATFORM_TARGETS.system` |
| engine | ② WBGT表示エンジン | `SIGNAGE_ENGINE_MODULES` |
| adapter | ③ 外部計測機器連携 | `DATA_ADAPTERS` |
| jma | ④ 気象庁・環境省API | `DATA_ADAPTERS.jma` |
| layout | ⑤ 解像度・面数 | `LAYOUT_REGISTRY` |
| monitor | ⑥ 監視・通知 | `PLATFORM_TARGETS.monitor`（Phase 4） |

---

## XIV. 次のアクション（実装状況）

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | ②モジュール化（GitHub Pages engine/） | 仕様・マニフェストのみ（HTMLは現行固定） |
| 2 | ⑤台帳 + ⑨config/URL自動生成 | **管理アプリ基盤 実装済** |
| 3 | ①管理アプリ 6画面 | 部分実装（localStorage） |
| 4 | ⑥監視 + ③アダプター GAS | 未 |

---

**END OF DOCUMENT**
