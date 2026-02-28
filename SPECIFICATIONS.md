# TRPG Web Application 仕様書

## 1. システムアーキテクチャ
- **フロントエンド UI**: HTML, CSS, JavaScript (React/Next.js 等のフレームワーク利用を推奨。APIルート構築を含むため)
- **バックエンド API**: Vercel Serverless Functions (Next.js の API Routes を活用)
- **インフラ/ホスティング**: Vercel
- **リポジトリ管理**: GitHub

## 2. 画面構成とUI/UX
### 2.1 オープニング画面 (タイトル画面)
- アプリケーションのタイトル表示。
- **難易度選択UI**: 「厳しめ」「普通」「易しめ」の3つのオプションを選択できるラジオボタンやセレクトボックス。
- **「ゲームスタート」ボタン**: クリックにより、選択された難易度情報を保持してプレイ画面へ遷移し、初期の状況生成リクエストをバックエンド経由で呼び出す。

### 2.2 プレイ画面
- **メインテキストエリア (出力ログ)**: 
  - LLM（GM）が生成したテキストを時系列で表示。
  - 新しいメッセージが追加されるたびに自動で最下部へスクロールされる。
- **ビジュアルエリア (画像)**: 
  - 現在の場面を表す画像を表示。Pollinations.ai から取得した画像URLを `<img>` タグで表示する。
- **ユーザー入力エリア**: 
  - 自由に行動を記述できるテキストエリア（またはテキストボックス）。
  - 送信ボタン（Enterキーでの送信にも対応）。
  - ※送信中（APIレスポンス待ち）は入力を無効化し、ローディング状態（スピナー等）を表示する。

## 3. 外部API連携とプロンプト設計
### 3.1 OpenRouter (LLM) 連携
- **通信フロー**: フロントエンド -> `/api/chat` (Vercel API) -> OpenRouter API
- **利用モデル**: `google/gemini-2.5-flash:free` または `deepseek/deepseek-r1:free` などの利用可能なFreeモデル。
- **システムプロンプトの設計 (システム指示)**:
  - 役割指示: 「あなたはプロのゲームマスターです...」
  - 難易度指示: オープニングで選択された難易度に基づく判定基準のロード。
    - （例：厳しめの場合は「プレイヤーの甘い行動に対しては容赦なく死の結末を与えること」といった指示を含める）
  - 出力フォーマット: JSON形式を要求するか、一定のフォーマット（テキストと画像要約）を必須にする。
    - レスポンス例（方針）: 
      ```json
      {
        "story": "暗い森の奥から、無数の赤い目があなたを見つめている。どうする？",
        "image_prompt": "dark gothic forest, glowing red eyes in the shadows"
      }
      ```

### 3.2 Pollinations.ai 連携
- LLMから抽出された `image_prompt` (英語の状況説明キーワード) を受け取る。
- URLを動的に生成: `https://image.pollinations.ai/prompt/{エンコードしたプロンプト}`
- 生成したURLをブラウザ側の画像描画部分に設定し、リアルタイムで画像をロードさせる。

## 4. セキュリティとGit運用
### 4.1 Git運用 (`.gitignore`)
```gitignore
# 秘匿情報
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
# モジュール類
node_modules/
```
以上の設定を確実に行い、開発者のローカル環境以外にパスワードやAPIキーを流出させない。

### 4.2 本番デプロイフロー
1. GitHubの main (または master) ブランチにコードをプッシュ。
2. Vercel と GitHubリポジトリを連携させ、自動デプロイを構成する。
3. Vercelの Dashoabrd 上で、`Settings > Environment Variables` から以下を設定する。
   - `OPENROUTER_API_KEY`: 取得したAPIキーの値
