# Smart Signage Platform

地点を変えてURLを発行し、Chromeに貼ると本番サイネージが表示されます。

公開サイト（GitHub Pages）に上げると、ローカルではなくネット上のURLで運用できます。

## 公開URL

リポジトリを GitHub に push すると、Actions がサイトを公開します。

- 管理画面: `https://<user-or-org>.github.io/smart-signage-platform/`
- サイネージ: 管理画面の「URL発行」で出るリンクを Chrome に貼る

案件データは開いているブラウザに保存されます。サイネージ本体の表示は、発行したURLだけで動きます。

## ローカルで開く

```bash
cd Smart_Signage_Platform
npm install   # 初回のみ
npm run open  # または npm run dev → http://localhost:5173/
```

| やってよい | やらない |
|------------|----------|
| `npm run open` / `http://localhost:5173/` | `dist/index.html` を直接開く |
| Ctrl+Shift+B（プレビューを開く） | Live Preview で真っ白なまま待つ |
| 制作画面からサイネージをプレビュー | `public/signage/*.html` を単体で探す |

## 画面（いまのナビ）

1. **コンテンツ制作** … 案件を選ぶ → シーン編集 → プレビュー → 配信URL  
2. **プロジェクト管理** … 台帳（一覧・会社・現場・URL）  
3. **URL一覧** … 案件ごとの公開URLをコピー

## ディレクトリ

```
src/                 ← 最新の管理アプリ（ここが正）
public/signage/      ← LEDエンジン（アプリから使う中身）
gas/                 ← 外部APIプロキシ
docs/                ← 仕様
dist/                ← npm run build の出力（古いコピーを開かない）
```

`dist/` はビルド成果物です。中身を直したり、古い `dist` を「本番」だと思わないでください。最新を見るときは必ず `npm run open` です。
