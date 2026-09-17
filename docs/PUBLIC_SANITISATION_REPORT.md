# Public repository sanitisation report

Recommendation: **CLEAN PUBLIC SHOWCASE REPO RECOMMENDED**.

## Continuity and benefits

The portfolio review identified personal operational evidence mixed with reusable engineering material. This edition supplies a separate public source tree, synthetic examples and automated privacy checks while preserving the original working repository. It enables a reviewed fresh public publication; remediation of the old public repository remains outstanding. Immediate checks are recorded below. Preventing future private-data commits and making engineering evidence easier to review are the intended long-term benefits.

## Baseline and scope

- Original main baseline: `74d8f88b218bcda73f3e0e1b7eb355d9dd02c677`, matching the remote at audit time.
- All 411 original tracked files were inventoried and scanned as text; no tracked binary/media files were found in that tree.
- Local reachable history: 213 commit objects, 4 annotated-tag objects, 1,152 tree objects and 1,355 unique blobs.
- Remote metadata inspected: 32 branches, 5 tags, 28 pull requests, 1 issue comment, no review comments, and 77 retained Actions artifacts; no GitHub releases. Issue listings comprise the same 28 pull requests.
- Private findings, original values and comparison manifests are retained outside this repository. The original working tree, production state and remote repository were not modified.

## Findings and treatment

| Class | Finding | Public edition treatment |
| --- | --- | --- |
| REMOVE | Two personal email addresses in tracked operational prompts; local usernames and runtime paths; private application/report identifiers and live origin links | Original prompts, acceptance transcripts and operational ledgers excluded |
| SYNTHESISE | Real application/candidate states, employer-specific examples and resume acceptance narratives | A wholly fabricated ExampleCorp scenario; example names in tests replaced consistently |
| KEEP | Source, all migrations, automatic tests, admission semantics, MCP functionality, recovery tools, ADRs and technical contracts | Preserved; technical excerpts omit personal deployment ledgers |
| PREVENT | Watch exporter could retrieve old private-context documents from a historical commit | Six reviewed public snapshots pinned by SHA-256; no original Git history dependency |

No files were deleted from the original repository. The public edition intentionally omits original Git history and operational documents. A machine-readable [file manifest](PUBLIC_FILE_MANIFEST.json) lists copied, modified, added and excluded paths without sensitive contents.

## Credential scan

Gitleaks 8.30.1 scanned the locally available original history. Its eight findings were individually reviewed: fixed synthetic idempotency keys in three integration-test files, not credentials. No actual credential was identified in this scan. This is not proof that uninspected remote branches, logs or artifacts contain none. Any actual credential found there must be revoked/rotated; deletion or rewriting alone is insufficient.

The public scan uses the standard Gitleaks rules with an exact path-and-line exception for those reviewed test literals. There is no whole-test-directory exception.

## Validation

Validation is in progress. This document must be updated with completed results before publication. No public-safety verdict is claimed for the original repository.

## History and residual risks

Current-HEAD cleanup is insufficient for the original repository. Personal values occur in multiple historical blobs and commit metadata includes personal author email. Two PR descriptions were flagged for contextual review. Retained Actions artifact payloads/logs and every remote branch tip were not exhaustively audited. Tags, PR diffs, cached views, forks and prior downloads can retain old content.

A fresh public edition reduces accidental historical disclosure but does not retract the old publication. Review the old repository's visibility and retention, PR material, all branch/tag refs, Actions artifacts/logs and provider removal options separately. Do not push the original history to this edition. No history rewrite, force push, remote deletion or visibility change was performed.

Pattern checks do not prove semantic privacy, production security or enterprise readiness. The edition publishes no screenshots or binary resumes. Hosted-agent execution, account access, scheduled runs and production acceptance are outside the local validation scope. No license was invented; select a license before advertising open-source reuse.
