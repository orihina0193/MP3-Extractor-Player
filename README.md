# SoundBox (SoundBox Audio Engine & Player)

YouTube動画からの音声抽出・オフライン再生・IndexedDBキャッシュ管理・GitHub APIクラウド同期機能を備えたウェブ音楽プレイヤーアプリです。

---

## 🌟 主な特徴

1. **ハイブリッド抽出 & 高音質再生**
   - YouTube動画URLからM4A音声ファイルを高速抽出
   - 最高音質（M4A / 256kbps）でブラウザ内（IndexedDB）に安全にキャッシュ保存
   - パケットを消費しない完全オフライン再生＆バックグラウンド再生対応

2. **1曲単位の GitHub API クラウド同期 (iPhoneクラッシュ対策)**
   - iPhone (Safari) 等で大量の曲を一括ZIPダウンロードしようとした際のメモリ制限クラッシュを解決
   - GitHub APIと Personal Access Token (PAT) を使用し、1曲ごとに指定フォルダ（例: `audio/`）へ直接コミット保存＆メタデータ管理 (`metadata.json`)
   - 他の端末や別ブラウザからでもいつでも1曲ずつ・全曲スムーズに復元・取り込み可能

3. **完全レスポンシブ & 洗練されたダークUI**
   - オランジュアクセント（`#FF5F1F`）のモダンなハイコントラスト・ダークデザイン
   - アルバムアート、波形アニメーション、プログレスバー、タグ分類機能

---

## 🚀 使い方 & セットアップ

### 1. このリポジトリをGitHubに作成・プッシュする手順

1. GitHubで新規リポジトリ（例: `soundbox`）を **Private (推奨)** または Public で作成します。
2. このフォルダのコード一式をコミットしてプッシュします：
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SoundBox"
   git branch -M main
   git remote add origin https://github.com/あなたのユーザー名/soundbox.git
   git push -u origin main
   ```

### 2. ローカルでの開発・起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動 (ポート 3000)
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

---

## 🔑 GitHub API 同期機能の設定手順

1. **Personal Access Token (PAT) の取得**
   - GitHubの 右上アイコン &gt; **Settings** &gt; **Developer Settings** &gt; **Personal access tokens (Tokens classic)** へアクセス。
   - **Generate new token (classic)** を選択。
   - Noteに `SoundBox Sync` と入力し、**`repo`** (全リポジトリアクセス権限) にチェックを入れて作成。
   - 発行された `ghp_xxxxxxxxxxxx` トークンをコピーします。

2. **SoundBoxアプリ内での設定**
   - アプリ右上の **データベースアイコン (バックアップ管理)** をクリック。
   - 「GitHub クラウド同期」タブで以下を入力します：
     - **ユーザー名 (Owner)**: あなたのGitHubユーザー名
     - **リポジトリ名 (Repository)**: 例 `soundbox`
     - **ブランチ名 (Branch)**: 例 `main`
     - **保存フォルダ名 (Folder Path)**: 例 `audio`
     - **Personal Access Token (PAT)**: コピーした `ghp_...` トークン
   - 「**接続テスト**」をクリックして成功したら「**設定を保存**」します。

3. **1曲ずつの同期**
   - 「**ライブラリ全曲を1曲ずつGitHubへ同期**」をクリックすると、指定フォルダ（`audio/`）内に1曲ごとにファイルが安全にコミットされます。
   - 個別トラック一覧から特定の曲だけピンポイントで同期することも可能です。

---

## 🛠 テクノロジー

- **フロントエンド**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion
- **バックエンド/抽出**: Express, `@distube/ytdl-core`, `play-dl`
- **ストレージ**: IndexedDB (idb), LocalStorage
- **API連携**: GitHub REST API v3
