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

Pattern scanning cannot prove the absence of personal narratives, new credential formats or sensitive screenshots. No media is approved in this baseline. Review additions for relationships, context and provenance, not just names. Never publish a sanitisation report containing the sensitive original text.
