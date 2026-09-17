# Public data policy

Public examples use fabricated records, reserved example domains and isolated databases. Real mail, resumes, contacts, account bindings, operational exports and screenshots belong outside the repository.

## Classification

| Class | Treatment |
| --- | --- |
| Credentials, account identifiers, private messages and contact details | Exclude; rotate any actual exposed credential |
| Useful examples based on personal operations | Rebuild as explicitly synthetic scenarios, including dates, roles, IDs and relationships |
| Architecture, contracts, source, migrations, tests and generic runbooks | Retain and verify |

Public author attribution and official vendor documentation are not private operational evidence. Known provider domains in parser/security tests are retained for their behavioral purpose; they are not records of a real user's interactions.

## Preventing recurrence

`npm run check:public` scans tracked files even if subsequently ignored, plus nonignored untracked files. It refuses symlinks, binary/media artifacts, private paths, personal email patterns and selected operational identifiers. Gitleaks scans the same publishable content; missing tooling or scanner errors fail the command. Output identifies paths and rule names, never matched private values.

The narrow Gitleaks exception covers reviewed synthetic idempotency-key lines in three tests. It does not exempt entire tests or all high-entropy strings. Parser tests have exact file/domain exceptions for rejecting URL credentials and verifying known providers.

Ignored local files are not publication inputs; `.gitignore` is not a history-removal tool. Scan history separately before migrating an existing repository. Do not publish the parent workspace, private audit reports, old deployment artifacts or original `.git` directory.

## Limitations

Pattern scanning cannot prove the absence of personal narratives, new credential formats or sensitive screenshots. Operational screenshots and unreviewed media remain excluded. Review additions for relationships, context and provenance, not just names. Never publish a sanitisation report containing the sensitive original text.

## Reviewed illustration

The original vector cover at `docs/assets/agent-operations-platform.svg` is approved
for this public portfolio. It is a conceptual architecture illustration authored
from public component responsibilities, not a screenshot or a derivative of
private operational records. Its source contains no scripts, external resource
references, embedded images or personal identifiers.

`docs/assets/agent-operations-social.png` is its visually reviewed 1200 x 630 PNG
render for social previews, with dark margins preserving the complete SVG. It
contains only the public illustration, not a browser or operational screenshot.
The public guard allows only that exact path and SHA-256 digest:
`dbdbd44a5bbc333c44a27f4dee00a073d9b646fa2f299cc87111bfc8c89a7b5e`.
Changed bytes, a different filename and all other unreviewed media still fail.
Re-exporting the cover requires another visual/provenance review and digest update.
