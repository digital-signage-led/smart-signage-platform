# サイネージアセット

本番 HTML が参照するロゴ・下帯をここに配置します。

**会社ロゴ（案件ごとではなく会社単位）**
- ファイル名は一意に（例: `sasakikensetu_logo.png` / `morishita_foot.png`）
- 4面下帯: `会社名_foot`　／　5面右列: `会社名_logo`

**森下組（4面・田原本など）**
- `morishita_foot.png` — 時刻下帯バナー（Cube4面）
- `morishita_logo.png` — 5面右列マーク
- 制作アプリの「会社マスタ」で社名 ↔ ロゴファイル名を紐づけます
- 案件フォルダに HTML を複製しない。エンジン HTML は共有、差し替えは地点・ロゴキー・コンテンツのみ

**4面基本（鴻治組・庄原）**
- `kohji_logo.png` — 時刻下帯バナー
- 正本: `wbgt-cube-hiroshima-koujigumi-4face.html`（既定4面）
- AMeDAS / WBGT: `67116`（庄原）

**沖縄・久米島（4面）**
- 正本: `wbgt-cube-okinawa-kumejima-4face.html`（色付き3段警報・r8・通常気象＋防災割り込み）
- 仕様: `docs/OKINAWA_KUMEJIMA_SIGNAGE_SPEC.md`

**熊本（地震・避難割り込み）**
- `wbgt-cube-kumamoto-4face.html` — 避難・地震シーン用（既定4面ではない）

**5面基本（住之江）**
- `greencross_logo.png` — 右端 128×128 ロゴ
- `greencross_foot_name.svg` — 時刻下帯バナー

**佐々木建設 ECS**
- `sasakikensetu_logo.png`
- `sasakikensetu_foot_name.svg`
- `ecs-live.json`（ECS 静的フォールバック・任意）

管理アプリから「現場用 HTML をダウンロード」すると、案件の SignageConfig のみ差し替えた HTML が生成されます（デザインは変更しません）。

配信:

```bash
npm run signage
# → http://localhost:8765/wbgt-cube-osaka-suminoe-5face.html   （5面基本）
# → http://localhost:8765/wbgt-cube-hiroshima-koujigumi-4face.html （4面基本・鴻治組）
# → http://localhost:8765/wbgt-cube-okinawa-kumejima-4face.html （沖縄・久米島）
# → http://localhost:8765/wbgt-cube-sasakikensetu-4face.html  （ECS）
```

Vite dev 利用時は `public/signage/` がそのまま `/signage/` で配信されます。
