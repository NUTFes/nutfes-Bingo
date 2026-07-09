---
name: maintenance issue
about: Track dependency, Docker, Supabase, or annual deployment maintenance
title: ""
labels: maintenance
assignees: ""
---

# 概要

<!-- dependency / Docker / Supabase / annual deploy のどれに関係するかを記載 -->

# 対象領域

- [ ] Dependencies / pnpm lockfile
- [ ] Docker image / digest / build path
- [ ] Supabase migration / Auth / Storage / PostgREST
- [ ] Cloudflared / production deploy / preflight
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
- [ ] `prod:config` / `prod:preflight` / smoke の要否を確認した
- [ ] backup/restore/rollbackへの影響を確認した

# 備考

<!-- 参考URL、upstream changelog、operator actionなど -->
