<!-- 全部埋める必要はありませんが，できるだけわかりやすく書いてください -->

# 対応Issue

<!-- 対応したIssue番号を記載 -->

- resolve #0

# 概要

<!-- 開発内容の概要を記載 -->

# 実装詳細

<!-- 具体的な開発内容を記載 -->

# 画面スクリーンショット等

<!-- URLとともに貼る（なければ空欄でよい） -->

# チェックリスト

- [ ] pnpmだけを使用した
- [ ] lockfile変更は意図したものだけである
- [ ] Node/pnpm pinを確認した
- [ ] Cloudflare static build / Worker deploy pathへの影響を確認した
- [ ] Durable Objects / R2 / Access / Turnstile bindingsへの影響を確認した
- [ ] `wrangler.jsonc` / `.dev.vars.example` への影響を確認した
- [ ] Worker変更では`mise run cloudflare:check`を実行した
- [ ] PITR / Worker rollbackへの影響を説明した

# 備考

<!-- 実装していて困った箇所・質問など -->
