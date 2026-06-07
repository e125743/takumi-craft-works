# CLAUDE.md — takumi-craft-works (React フロントエンド + Firebase Functions)

## このファイルの責任範囲

React SPA (`src/`)、Firebase Hosting、Firebase Functions (`functions/`) に関する事項を扱います。
横断的なルール (本番直結 / Git ワークフロー / CLAUDE.md 更新ルール / アーキテクチャ全体) は `../CLAUDE.md` を (Git 手順の詳細は `../docs/GIT-WORKFLOW.md`)、Cloud Run (`mlModelCore`) の詳細は `../mlModelCore/CLAUDE.md` を参照してください。

---

## ランタイム・前提ツール

| 対象 | 要件 |
|---|---|
| Node.js | CRA 5 が要求するため **16 以上 (18 推奨)** |
| `firebase-tools` CLI | `firebase deploy` / `firebase functions:log` 用 |

ローカルで `/showmaciene` の全機能 (Functions 経由のアップロード等) を試したい場合は、**App Check デバッグトークン**を Firebase コンソールに登録する必要があります (詳細は下記セキュリティ既知事項の CORS 項目参照)。

---

## 主要ファイル

| パス | 役割 |
|---|---|
| `src/App.js` | ルーティング (`/` Home, `/showmaciene` ShowMaciene) |
| `src/firebase.js` | Firebase 初期化 + App Check (reCAPTCHA v3) |
| `src/pages/Home.js` | トップページ。`/showmaciene` への画像リンクのみ |
| `src/pages/ShowMaciene.js` | メイン機能。画像アップロード + 検出結果のページング表示 |
| `src/pages/index.js` | barrel エクスポート |
| `src/components/Header.js` | グローバルナビ。`pages` 配列でメニュー項目を管理 |
| `src/components/Loading.js` | ローディング表示 |
| `src/components/index.js` | barrel エクスポート |
| `functions/index.js` | Callable Functions: `uploadImage` / `updateStore` / `getJson` |
| `firebase.json` | Hosting (SPA rewrite) + Functions 設定 |
| `public/Sample/` | 「Sample 取得」ボタンで ZIP 配布するサンプル画像 |

---

## コーディング規約・注意点

### 言語・フレームワーク
- **JavaScript** (TypeScript 未使用) / **React 19** / **MUI v7** / **CRA 5** / **react-router-dom v7**
- スタイリングは MUI の `sx` prop 中心。グローバル CSS は `src/App.css`, `src/index.css`

### 設定・セキュリティ
- **CORS 許可ドメイン**は `functions/index.js` の各 `onCall` 呼び出しに**手書きで列挙**されています。新ドメインを追加する時は全 Function 定義を更新する必要があります。
- **App Check (reCAPTCHA v3)** は全 Callable で `enforceAppCheck: true`。新 Callable を追加する時も同じ設定を入れること。
- **公開キー**: `firebaseConfig` (apiKey 含む) と reCAPTCHA サイトキーはクライアント公開キーなのでハードコード可。

### 既知の挙動 (触らない方が無難)
- `src/firebase.js` と `src/pages/ShowMaciene.js` の両方で App Check を初期化している (重複だが動作している)。
- `ShowMaciene.js` 内で `window.Buffer = window.Buffer || Buffer` をしている (Canvas 処理に必要)。

---

## 改名禁止リスト (本番データ・URL と結合)

以下の識別子は本番 URL・Firestore データ・Storage パスと結合しているため、**リネームすると即座に動作が壊れます**。実体が typo であっても触らないでください。

| 識別子 | 種類 | 結合先 |
|---|---|---|
| `/showmaciene` | ルートパス | 本番 URL / Header のリンク |
| `ShowMaciene` | コンポーネント名 | `src/pages/index.js` の export |
| `DemoDetection` | Firestore コレクション | `functions/index.js` 全 Callable |
| `origineImages` | Storage プレフィックス | `functions/index.js` ＋ `mlModelCore/main.py` (両方共通) |
| `detectedImages` | Storage プレフィックス | `functions/index.js` ＋ `mlModelCore/main.py` (両方共通) |

Storage プレフィックス (`origineImages` / `detectedImages`) は `mlModelCore` 側でも使用されているため、変更する場合は両リポジトリ同時改修が必要です。

---

## ⚠️ セキュリティ既知事項

このリポジトリは Public のため、**現状のセキュリティ課題・攻撃面・対策案は CLAUDE.md には記載しません**。すべて Git 管理外の `../SECURITY-NOTES.md` に集約しています。

- Claude は改修着手前に `../SECURITY-NOTES.md` を読み、書かれた「Claude が改修する際の最低ライン」を必ず遵守
- セキュリティ課題を新たに発見した場合、CLAUDE.md ではなく **`../SECURITY-NOTES.md` に追記** (このファイルは Public リポジトリにコミットされるため攻撃情報を書かない)
- 課題が解消した時も `../SECURITY-NOTES.md` の「🟢 解消済み」セクションに移動

---

## コンテンツ／文言の指針 → ../docs/CONTENT-GUIDE.md

トップページや実績・自己紹介のコピー作成・文言修正・セクション/ページ追加など
**掲載内容に関わる変更**を行う時は [../docs/CONTENT-GUIDE.md](../docs/CONTENT-GUIDE.md) を読む。
掲載素材の確定情報（経歴・実績・技術スタック・連絡先・論文出典）と、伝えたい印象に沿った
文言指針・載せない表現をまとめてある。

- このファイルは **Git 管理外（Private）** で本リポジトリ外（`my-portfolio/docs/`）にある。
  Public リポジトリには含まれないため、clone 環境ではリンクが解決しないことがある。
- 評価軸の原典は `../CLAUDE.md`「プロダクトの目的・ターゲット」。

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

いずれも `../CLAUDE.md` の Git ワークフロー（要点）と `../docs/GIT-WORKFLOW.md` に沿って実施（deploy / push / merge はユーザー承認制）。
