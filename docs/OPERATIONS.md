# OPERATIONS.md — takumi-craft-works 運用・手順

> `takumi-craft-works/CLAUDE.md` から参照される手順本体。
> デプロイ / ログ確認 / ロールバック / 新規ページ追加 / 新規 Function 追加 のいずれかを行う時に読む。
> 承認制コマンド (deploy / push / merge) と全体フローは `../../CLAUDE.md`（要点）+ `../../docs/GIT-WORKFLOW.md`（詳細）に従う。

## デプロイ (必ずユーザーの事前承認が必要)

```bash
# Hosting デプロイ (predeploy フック無し → 先に build/ を最新化)
npm run build
firebase deploy --only hosting

# Functions デプロイ (build/ 非依存 → ビルド不要)
firebase deploy --only functions
# 特定の関数のみ
firebase deploy --only functions:uploadImage
```

## ログ・状態確認

```bash
# Functions のログ (関数名で絞り込み可)
firebase functions:log --only uploadImage
firebase functions:log --only updateStore
firebase functions:log --only getJson
```

Firestore データ・Storage オブジェクトの確認は **Firebase コンソール**から行うのが速い。

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

## 新規ページ追加の手順

### コード変更
1. `src/pages/NewPage.js` を作成 (既存ページのスタイルを踏襲)
2. `src/pages/index.js` に `export {default as NewPage} from './NewPage';` を追加
3. `src/App.js` の `<Routes>` に `<Route path="/newpage" element={<NewPage/>} />` を追加
4. `src/components/Header.js` の `pages` 配列に `{name:'NewPage', path:'/newpage'}` を追加
5. 共通コンポーネントが必要なら `src/components/` に追加し `components/index.js` の export に追記
6. 新ドメインを使う場合: `functions/index.js` の各 Function の `cors` 配列にも追記

### この変更で更新すべき CLAUDE.md
- `takumi-craft-works/CLAUDE.md` の「主要ファイル」、必要なら「改名禁止リスト」

### このタスクで使うデプロイコマンド
- `npm run build` → `firebase deploy --only hosting` (Hosting は predeploy フック無し。build/ を最新化してから配信)

→ 以降は `../../CLAUDE.md` の **Git ワークフロー（要点）** と詳細手順 `../../docs/GIT-WORKFLOW.md` に沿って進めます:
   `npm start` ローカル確認 → commit → **`npm run build`** → 上記デプロイ → 本番動作確認 → push → main へ merge → feature ブランチ削除。
   CLAUDE.md 更新分はコード変更とは別 commit で同じく main へ反映。

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
- `takumi-craft-works/CLAUDE.md` の「主要ファイル」

### このタスクで使うデプロイコマンド
- `firebase deploy --only functions:関数名`

→ 以降は `../../CLAUDE.md` の **Git ワークフロー（要点）** と詳細手順 `../../docs/GIT-WORKFLOW.md` に沿って進めます:
   ローカル確認 (Functions エミュレータ or `npm start` + App Check デバッグトークン) → commit → 上記デプロイ (Functions は build 非依存) → 本番動作確認 → push → main へ merge → feature ブランチ削除。
   CLAUDE.md 更新分はコード変更とは別 commit で同じく main へ反映。
