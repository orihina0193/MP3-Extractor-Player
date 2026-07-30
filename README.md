# MP3 Extractor Player & Audio Storage

YouTube動画や音声URLから高音質音声（.m4a）を抽出し、プレイリスト管理・再生・GitHubクラウドストレージ同期ができるWebアプリケーションです。

## 主な機能
- **音声抽出**: YouTube動画URLから直接高音質音声データ（.m4a）を抽出
- **Webオーディオプレイヤー**: バックグラウンド再生、プレイリスト管理、リピート・シャッフル対応
- **GitHubクラウド同期**: Personal Access Token (PAT) を使用して、抽出した音楽データやアプリのソースコードをGitHubリポジトリへ直接保存・復元

## 同期リポジトリ構成
1. **アプリソースコード管理**: `MP3-Extractor-Player`
2. **音楽データ保管庫**: `Extractor-Player-storage`
