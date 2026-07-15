---
name: maintenance issue
about: Track dependency, Cloudflare, or annual event maintenance
title: ""
labels: maintenance
assignees: ""
---

# 概要

<!-- dependency / Cloudflare / annual event operations のどれに関係するかを記載 -->

# 対象領域

- [ ] Dependencies / pnpm lockfile
- [ ] Docker static-build toolchain / image digest
- [ ] Workers / Durable Objects / Static Assets
- [ ] Access / Turnstile / WAF
- [ ] R2 image / snapshot
- [ ] Backup / restore / rollback
- [ ] Documentation / ADR / templates

# 現在の状態

<!-- 現在のversion、digest、設定、失敗しているcommandなど -->

# 期待する状態

<!-- 更新後に満たすべき状態、検証command、rollback条件など -->

# 影響確認

- [ ] `pnpm audit` / `pnpm outdated` を確認した
- [ ] `mise run check` の影響を確認した
- [ ] `pnpm doctor` / `pnpm knip` の要否を確認した
- [ ] `mise run cloudflare:check` / remote smoke の要否を確認した
- [ ] backup/restore/rollbackへの影響を確認した

# 備考

<!-- 参考URL、upstream changelog、operator actionなど -->
