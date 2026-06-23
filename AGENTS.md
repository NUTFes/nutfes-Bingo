# AGENTS.md

## 作業前に読む文書

作業内容に応じて、以下を確認する。

- `README.md`
- 関連する `docs/adr/ADR-*.md`
- 関連する `docs/exec-plans/*.md`

## ExecPlan運用

- 大きな実装・実験を行う場合は、`docs/exec-plans/` にExecPlanを作成または更新する
- ExecPlanは日本語で記述する

## ADR運用

- 主要な研究判断・設計判断は `docs/adr/` に記録する
- ADRは `docs/adr/ADR-template.md` に従う
- ADRは日本語で記述する（フィールド名やコードブロック内の技術用語は英語のままでよい）
- Accepted ADRは後から判断履歴を消すように編集しない
- 判断を変える場合は、新しいADRでsupersedeまたはamendする

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
