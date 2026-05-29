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

## 開発・ビルド・デプロイコマンド

### ローカル開発 (Claude が自由に実行可能)
```bash
# 開発サーバ
npm start

# 本番ビルド (出力: build/)
npm run build
```

### デプロイ (必ずユーザーの事前承認が必要)
```bash
# Hosting デプロイ (predeploy フック無し → 先に build/ を最新化)
npm run build
firebase deploy --only hosting

# Functions デプロイ (build/ 非依存 → ビルド不要)
firebase deploy --only functions
# 特定の関数のみ
firebase deploy --only functions:uploadImage
```

---

## ログ・状態確認

```bash
# Functions のログ (関数名で絞り込み可)
firebase functions:log --only uploadImage
firebase functions:log --only updateStore
firebase functions:log --only getJson
```

Firestore データ・Storage オブジェクトの確認は **Firebase コンソール**から行うのが速い。

---

## ロールバック手順

### Hosting (フロントエンド)
- Firebase コンソール → Hosting → 「リリース履歴」 → 戻したいバージョンの右端メニューから **「ロールバック」**

### Functions
- Firebase コンソール上の直接ロールバック機能はないため、**1つ前のコミットに `git checkout` してから再デプロイ**:
  ```bash
  git checkout <previous-sha> -- functions/
  firebase deploy --only functions  # ユーザー承認後
  ```

### Firestore データ
- **ロールバック不可**。破壊的操作の前に必ずバックアップを取る:
  ```bash
  gcloud firestore export gs://<backup-bucket>/<path>
  ```

### Storage データ
- **ロールバック不可**。`functions/index.js` の `uploadImage` (書き込み) / `getJson` (読み込み) は Storage を直接操作するため、Functions 改修も影響範囲。破壊的操作の前に必ずバックアップを取る:
  ```bash
  gsutil -m cp -r gs://<bucket>/<prefix> gs://<backup-bucket>/
  ```

---

## 新規ページ追加の手順

### コード変更
1. `src/pages/NewPage.js` を作成 (既存ページのスタイルを踏襲)
2. `src/pages/index.js` に `export {default as NewPage} from './NewPage';` を追加
3. `src/App.js` の `<Routes>` に `<Route path="/newpage" element={<NewPage/>} />` を追加
4. `src/components/Header.js` の `pages` 配列に `{name:'NewPage', path:'/newpage'}` を追加
5. 共通コンポーネントが必要なら `src/components/` に追加し `components/index.js` の export に追記
6. 新ドメインを使う場合: `functions/index.js` の各 Function の `cors` 配列にも追記

### この変更で更新すべき CLAUDE.md
- このファイル (`takumi-craft-works/CLAUDE.md`) の「主要ファイル」、必要なら「改名禁止リスト」

### このタスクで使うデプロイコマンド
- `npm run build` → `firebase deploy --only hosting` (Hosting は predeploy フック無し。build/ を最新化してから配信)

→ 以降は `../CLAUDE.md` の **Git ワークフロー（要点）** と詳細手順 `../docs/GIT-WORKFLOW.md` に沿って進めます:
   `npm start` ローカル確認 → commit → **`npm run build`** → 上記デプロイ → 本番動作確認 → push → main へ merge → feature ブランチ削除。
   CLAUDE.md 更新分はコード変更とは別 commit で同じく main へ反映。

---

## 新規 Firebase Function 追加の手順

### コード変更
1. `functions/index.js` に `onCall` で関数を追加
2. 必ず以下を含める:
   ```js
   {
     cors: ["https://myproducts-488109.web.app", "https://myproducts-488109.firebaseapp.com", "http://localhost:3000"],
     enforceAppCheck: true
   }
   ```
3. **入力スキーマ検証を必ず入れる** (セキュリティ既知事項 #2 参照)

### この変更で更新すべき CLAUDE.md
- このファイル (`takumi-craft-works/CLAUDE.md`) の「主要ファイル」

### このタスクで使うデプロイコマンド
- `firebase deploy --only functions:関数名`

→ 以降は `../CLAUDE.md` の **Git ワークフロー（要点）** と詳細手順 `../docs/GIT-WORKFLOW.md` に沿って進めます:
   ローカル確認 (Functions エミュレータ or `npm start` + App Check デバッグトークン) → commit → 上記デプロイ (Functions は build 非依存) → 本番動作確認 → push → main へ merge → feature ブランチ削除。
   CLAUDE.md 更新分はコード変更とは別 commit で同じく main へ反映。
