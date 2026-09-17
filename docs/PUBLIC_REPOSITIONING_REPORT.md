# Public positioning and portfolio-hardening report

## Continuity and benefits

The approved positioning review extends the [public sanitisation work](PUBLIC_SANITISATION_REPORT.md): make the reusable operational controls visible without claiming an unimplemented agent runtime. This package updates public naming, architecture explanations and interface copy while preserving contracts and production configuration. It prepares the clean edition for publication. Clearer capability boundaries are the immediate benefit; easier technical evaluation and reuse across domains are expected benefits, not measured adoption outcomes.

## Phase 1: audit and bounded plan

- Clean-edition baseline: `343b13ef88977ac848e40a44f727a85141e69524` (327 publishable files, clean worktree).
- Original source baseline: `74d8f88b218bcda73f3e0e1b7eb355d9dd02c677`; remote main was rechecked and still matches. The original remote remains public.
- Naming gaps: README, npm description, web branding, MCP availability description, ChatGPT handoff text, active Watch guidance and historical architecture documents mix product names and implementation identifiers.
- One active Watch instruction still points to the original repository. Replace it with explicit selection of the reviewed showcase repository; never silently fall back to the original history.
- Trust and control mechanisms exist across several modules. No independent Trust Kernel service, generic approval engine, workflow scheduler or portable delegated-agent grant layer is established by this rename.
- Prior privacy evidence remains applicable to the unchanged original baseline: personal contact and operational data in tracked material and history. The clean edition excludes that material. Eight historical secret-scanner matches were reviewed as test idempotency keys; no real credential was identified in that scan. Remote artifact contents and every remote branch remain outside the exhaustive audit scope.
- Risky renames to avoid: environment variables, database/workspace defaults, schemas, migrations, MCP/tool identifiers, package identity, API paths and deployment resources. A connector's registered display name may also persist independently of this source tree.

Implementation plan: rewrite the README around Agent Operations Platform; document Trust Kernel with code/test mappings and limitations; retain Jobs as the full reference application and Platform Watch as a distinct report/decision application; refresh user-facing copy without changing actions; label historical terminology; refresh pinned synthetic Watch inputs; run public checks and verification; update the source manifest and clean archive. No merge, deployment, original-history rewrite or remote visibility change is included.

## Product and terminology decisions

- Product: **Agent Operations Platform**.
- Description: **A production-oriented platform for governing AI-assisted workflows through durable state, explicit authority and controlled state transitions.**
- Trust Kernel: a logical group of existing identity, evidence, authority, admission, idempotency, concurrency and audit controls, not a separate implemented service or product name.
- MCP / integration boundary: the tool interface and provider adapters. Web routes also call application services directly; they are not represented as MCP clients.
- Jobs and Platform Watch: concrete applications sharing selected platform infrastructure. Future domains and additional agent hosts remain future work.
- AgentGov: a separately named portfolio project; no integration, code reuse, lineage or equivalent functionality is asserted without a separate repository review.

## Compatibility decisions

`PAW_*`, `workspace_*`, `personal-ai-workspace`, database/schema names, paths and release capability identifiers remain stable. The default persisted workspace name remains unchanged. ChatGPT handoff copy names the current product and its legacy connector alias; an installed connection is not automatically renamed. Historical decisions retain their original wording with a link to the current terminology guide. Runtime authority and evidence requirements are unchanged.

## Verification and final status

Pending implementation verification. The final update will record actual checks, changes, file counts and status. This interim record does not declare either repository safe to publish.
