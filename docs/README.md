# Smart Signage — 仕様の枠（索引）

仕様は次の **3枠** に分けます。混ぜないでください。

| # | 枠 | 文書 | 扱うこと |
|---|-----|------|----------|
| 1 | **デザイン** | 下表 §1 | 帯・フォント・色・レイアウト（見た目） |
| 2 | **コンテンツ政策** | [SIGNAGE_CONTENT_POLICY.md](./SIGNAGE_CONTENT_POLICY.md) | 何を出すか・契約・ON/OFF・通常／割り込み |
| 3 | **外部API** | [SIGNAGE_EXTERNAL_API.md](./SIGNAGE_EXTERNAL_API.md) | 環境クラウド・ウェザーニュース等の接続 |

その他: エンジン実装表 [SIGNAGE_ENGINE_SPEC.md](./SIGNAGE_ENGINE_SPEC.md) ／ 平台設計 [PLATFORM_DESIGN_v3.md](./PLATFORM_DESIGN_v3.md)

---

## 1. デザイン（見た目）

| 文書 | 内容 |
|------|------|
| [SIGNAGE_DESIGN_USAGE.md](./SIGNAGE_DESIGN_USAGE.md) | 用法・共通パレット・割り込みの位置づけ |
| [SIGNAGE_DESIGN_NORMAL.md](./SIGNAGE_DESIGN_NORMAL.md) | 通常天候（時刻・観測・予報・多言語） |
| [SIGNAGE_DESIGN_RAIN_HERO.md](./SIGNAGE_DESIGN_RAIN_HERO.md) | 警報・注意報情報（色帯 40/48/40） |
| [SIGNAGE_DESIGN_RAIN_WHITE.md](./SIGNAGE_DESIGN_RAIN_WHITE.md) | 白ベース警報一覧（別デザイン） |
| [SIGNAGE_DESIGN_QUAKE.md](./SIGNAGE_DESIGN_QUAKE.md) | 緊急地震速報 |
| [SIGNAGE_DESIGN_SUMINOE.md](./SIGNAGE_DESIGN_SUMINOE.md) | 住之江（四面／五面） |

---

## 2. コンテンツ政策

→ **[SIGNAGE_CONTENT_POLICY.md](./SIGNAGE_CONTENT_POLICY.md)**

- コア／追加／割り込みの分類  
- 契約連動・廃止コンテンツ  
- コンテンツ制作画面で触ってよい範囲  

---

## 3. 外部API（ベンダー）

→ **[SIGNAGE_EXTERNAL_API.md](./SIGNAGE_EXTERNAL_API.md)**

| ベンダー | 状態 |
|----------|------|
| 環境クラウドサービス（ECS） | 配線済（佐々木・`source=device`） |
| ウェザーニューズ WxTech | 配線済（トライアル）· `wx-cube-4face.html` |

標準の気象庁・環境省は「標準データ源」（ベンダーではない）として同紙 §1。
