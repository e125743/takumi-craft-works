# CLAUDE.md — takumi-craft-works (React フロントエンド + Firebase Functions)

## このファイルの責任範囲

React SPA (`src/`)、Firebase Hosting、Firebase Functions (`functions/`) に関する事項を扱います。
横断的なルール (本番直結 / Git ワークフロー / CLAUDE.md 更新ルール / アーキテクチャ全体) は `../docs/CLAUDE.md` を (Git 手順の詳細は `../docs/GIT-WORKFLOW.md`)、Cloud Run (`mlModelCore`) の詳細は `../mlModelCore/CLAUDE.md` を参照してください。

> ℹ️ **横断ルールの読み込み（Claude 向け）**: `takumi-craft-works` をルートで開いた場合のみ、横断ルール本体 `../docs/CLAUDE.md`（Git 管理外）を読む。`my-portfolio` をルートで開いている時はルートスタブ `my-portfolio/CLAUDE.md` 経由で起動時から常駐済みなので読まなくてよい（単体 clone で `../docs/` が無い場合も読めなくて問題ない）。

---

## ランタイム・前提ツール

| 対象 | 要件 |
|---|---|
| Node.js | Vite 8 が要求するため **20.19 以上 または 22.12 以上** |
| `firebase-tools` CLI | `firebase deploy` / `firebase functions:log` 用 |

ローカルで `/showmaciene` の全機能 (Functions 経由のアップロード等) を試したい場合は、**App Check デバッグトークン**を Firebase コンソールに登録する必要があります (詳細は下記セキュリティ既知事項の CORS 項目参照)。

---

## 主要ファイル

| パス | 役割 |
|---|---|
| `index.html` | Vite のエントリ HTML (ルート直下)。`/src/index.jsx` を読み込む |
| `vite.config.js` | Vite 設定。`build.outDir='build'`（Hosting と一致）/ Tailwind plugin / `resolve.alias`（`@` → `src/`。**バンドラ**が shadcn の `@/…` import を解決） |
| `jsconfig.json` | パスエイリアス `@/*` → `src/*`（**エディタ/IDE** が `@/…` を解決。バンドラ側は `vite.config.js` の `resolve.alias`） |
| `components.json` | shadcn/ui 設定（`tsx:true`=`.tsx` で生成 / style `radix-nova` / baseColor neutral / `@/` alias） |
| `tsconfig.json` | TypeScript 設定（`allowJs:true`/`checkJs:false`=既存 JS と共存 / `strict` / `paths @/*`）。型チェック専用（emit は Vite）。実行は `npm run typecheck` |
| `src/vite-env.d.ts` | Vite クライアント型（`vite/client`） |
| `src/index.jsx` | エントリ。`ReactDOM.createRoot` で App をマウント |
| `src/App.jsx` | ルーティング (`/` Home, `/showmaciene` ShowMaciene)。ShowMaciene は `React.lazy` + `Suspense` で遅延読込 |
| `src/firebase.js` | Firebase 初期化 + App Check (reCAPTCHA v3) |
| `src/pages/Home.jsx` | トップページ。`/showmaciene` への画像リンクのみ |
| `src/pages/ShowMaciene.jsx` | メイン機能。画像アップロード + 検出結果のページング表示 |
| `src/pages/index.js` | barrel エクスポート（Home のみ。ShowMaciene は App で直接 lazy import） |
| `src/components/Header.jsx` | グローバルナビ。`pages` 配列でメニュー項目を管理 |
| `src/components/Loading.jsx` | ローディング表示 |
| `src/components/index.js` | barrel エクスポート |
| `src/components/ui/` | shadcn/ui コンポーネント（**`.tsx`**。例: `button.tsx`） |
| `src/lib/utils.js` | shadcn の `cn()` ヘルパ（clsx + tailwind-merge） |
| `functions/index.js` | Callable Functions: `uploadImage` / `updateStore` / `getJson` |
| `firebase.json` | Hosting (SPA rewrite) + Functions 設定 |
| `public/Sample/` | 「Sample 取得」ボタンで ZIP 配布するサンプル画像 |

---

## コーディング規約・注意点

### 言語・フレームワーク
- **JavaScript/JSX ＋ TypeScript/TSX（共存）** / **React 19** / **MUI v7 + Tailwind v4 + shadcn/ui（MUI から shadcn へ段階移行中・共存）** / **Vite 8** / **react-router-dom v7**
- **拡張子の方針**: **新規ファイルは TypeScript で書く**（JSX 有り=`.tsx` / 無し=`.ts`）。既存の `.js`/`.jsx` はそのまま共存（`tsconfig` は `allowJs:true`/`checkJs:false` で既存 JS は型チェックしない）。型のみ import は `import type`。型チェックは **`npm run typecheck`（`tsc --noEmit`）**（`npm run build` は型を見ない）。Vite 8 (Rolldown) は `.js` 内の JSX をパースしないため、JSX を `.js` 拡張子で書かない。
- 開発/ビルド: `npm start` (= `vite`) / `npm run build` (= `vite build`, 出力 `build/`)。古い `react-scripts` は撤去済み。
- スタイリングは現状 **MUI の `sx` prop 中心**。**Tailwind v4 ユーティリティ＋ shadcn/ui を併用可**（MUI → shadcn/ui へ段階移行中）。グローバル CSS は `src/index.css`（shadcn 標準構成: `@import "tailwindcss"` + `tw-animate-css` + デザイントークン `:root`/`.dark`/`@theme`）, `src/App.css`

### 設定・セキュリティ
- **CORS 許可ドメイン**は `functions/index.js` の各 `onCall` 呼び出しに**手書きで列挙**されています。新ドメインを追加する時は全 Function 定義を更新する必要があります。
- **App Check (reCAPTCHA v3)** は全 Callable で `enforceAppCheck: true`。新 Callable を追加する時も同じ設定を入れること。
- **公開キー**: `firebaseConfig` (apiKey 含む) と reCAPTCHA サイトキーはクライアント公開キーなのでハードコード可。

### 既知の挙動 (触らない方が無難)
- `src/firebase.js` と `src/pages/ShowMaciene.jsx` の両方で App Check を初期化している (重複だが動作している)。
- `ShowMaciene.jsx` 内で `window.Buffer = window.Buffer || Buffer` をしている (Canvas 処理に必要)。
- `ShowMaciene.jsx` の `pica` は ESM import (`import Pica from 'pica'; const pica = Pica()`)。CRA 時代の `require('pica')` は Vite では動かないため変換済み。
- **Tailwind の preflight は現在「有効」**（shadcn/ui 導入時に `src/index.css` を shadcn 標準 `@import "tailwindcss"` に切替。当初の preflight 無効構成は撤去済み）。MUI が崩れないのは下記 CSS レイヤ優先順位のおかげ。preflight が直接効くのは **MUI 非管理の生 HTML（数個の `div`）と `body`** のみ。
- CSS レイヤ優先順位: Tailwind ユーティリティは `@layer utilities` 内、MUI(emotion) はレイヤ無しで注入されるため、同一要素・同一プロパティの競合では **MUI が勝つ**。Tailwind で MUI を上書きしたい場合は `StyledEngineProvider enableCssLayer` での MUI レイヤ化が必要。

---

## 改名禁止リスト (本番データ・URL と結合)

以下の識別子は本番 URL・Firestore データ・Storage パスと結合しているため、**リネームすると即座に動作が壊れます**。実体が typo であっても触らないでください。

| 識別子 | 種類 | 結合先 |
|---|---|---|
| `/showmaciene` | ルートパス | 本番 URL / Header のリンク |
| `ShowMaciene` | コンポーネント名 | `src/App.jsx` の `lazy(() => import('./pages/ShowMaciene'))` (default export) |
| `DemoDetection` | Firestore コレクション | `functions/index.js` 全 Callable |
| `origineImages` | Storage プレフィックス | `functions/index.js` ＋ `mlModelCore/main.py` (両方共通) |
| `detectedImages` | Storage プレフィックス | `functions/index.js` ＋ `mlModelCore/main.py` (両方共通) |

Storage プレフィックス (`origineImages` / `detectedImages`) は `mlModelCore` 側でも使用されているため、変更する場合は両リポジトリ同時改修が必要です。

---

## ⚠️ セキュリティ既知事項

このリポジトリは Public のため、**現状のセキュリティ課題・攻撃面・対策案は CLAUDE.md には記載しません**。すべて Git 管理外の `../docs/SECURITY-NOTES.md` に集約しています。

- Claude は改修着手前に `../docs/SECURITY-NOTES.md` を読み、書かれた「Claude が改修する際の最低ライン」を必ず遵守
- セキュリティ課題を新たに発見した場合、CLAUDE.md ではなく **`../docs/SECURITY-NOTES.md` に追記** (このファイルは Public リポジトリにコミットされるため攻撃情報を書かない)
- 課題が解消した時も `../docs/SECURITY-NOTES.md` の「🟢 解消済み」セクションに移動

---

## コンテンツ／文言の指針 → ../docs/CONTENT-GUIDE.md

トップページや実績・自己紹介のコピー作成・文言修正・セクション/ページ追加など
**掲載内容に関わる変更**を行う時は [../docs/CONTENT-GUIDE.md](../docs/CONTENT-GUIDE.md) を読む。
掲載素材の確定情報（経歴・実績・技術スタック・連絡先・論文出典）と、伝えたい印象に沿った
文言指針・載せない表現をまとめてある。

- このファイルは **Git 管理外（Private）** で本リポジトリ外（`my-portfolio/docs/`）にある。
  Public リポジトリには含まれないため、clone 環境ではリンクが解決しないことがある。
- 評価軸の原典は `../docs/CLAUDE.md`「プロダクトの目的・ターゲット」。

---

## ローカル開発コマンド (Claude が自由に実行可能)

```bash
npm start          # 開発サーバ
npm run build      # 本番ビルド (出力: build/)
```

---

## 運用・手順 → docs/OPERATIONS.md

以下を行う時は [docs/OPERATIONS.md](./docs/OPERATIONS.md) を読む（手順本体・コマンドを集約）:

- **デプロイ**（Hosting は `npm run build` 前置 / Functions は build 非依存）
- **ログ・状態確認**
- **ロールバック**（Hosting / Functions / Firestore / Storage）
- **新規ページ追加**
- **新規 Firebase Function 追加**

いずれも `../docs/CLAUDE.md` の Git ワークフロー（要点）と `../docs/GIT-WORKFLOW.md` に沿って実施（deploy / push / merge はユーザー承認制）。
