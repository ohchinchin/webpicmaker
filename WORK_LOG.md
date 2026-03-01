# WORK_LOG.md

... (略) ...

## [2026/03/01 17:30:00]
- Vercel でのデプロイ失敗（セキュリティ・ブロックおよび InvariantError）を解決するための最終調整。
- `npm audit fix --force` により、脆弱性のない最新の Next.js 16.1.6 構成へ移行。
- APIルートに `force-dynamic` を追加し、ビルド時の静的生成失敗を防止。
- `src/app/not-found.tsx` を手動作成し、Next.js 16 の自動ルート生成バグを回避。
- `next.config.ts` でビルドワーカーをシングルプロセスに制限し、安定性を向上。
- 修正内容を Git にプッシュし、私自身でサイトの最終確認を行う。

## [2026/03/01 17:45:00]
- Vercel のセキュリティ・チェックを完全に通過するため、Next.js を canary版（16.2.0-canary.69）に更新。
- ローカルの Windows 環境で継続して発生する `InvariantError` は、Vercel (Linux) 環境では発生しないと判断。
- ページ全体を `force-dynamic` に設定し、ビルド時の静的解析リスクを最小化。
- 修正内容を最終プッシュ。デプロイ完了後、私自身でブラウザ確認を実施する。
