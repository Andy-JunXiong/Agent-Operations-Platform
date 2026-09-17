# Synthetic lifecycle walkthrough

All actors, messages and records in this example are fabricated. Application 001 at ExampleCorp is not derived from an individual's application history.

## Continuity and benefits

The public portfolio needs reproducible evidence without personal operational data. This demo uses existing services to make authorization, idempotency, concurrency and persistence reviewable. It supports a clean public release after repository checks; hosted-client and production acceptance remain separate. The verified benefit is a local executable example; easier external review is the expected longer-term benefit.

Run `npm run demo:synthetic`. Its input is [lifecycle.json](../../fixtures/synthetic/lifecycle.json); its implementation is [demo-synthetic.ts](../../scripts/demo-synthetic.ts).

| Step | Required outcome |
| --- | --- |
| Seed Application 001 | APPLIED, version 1 |
| Record a recruiter response; propose transition | Still APPLIED, version 1 |
| Admit without an authority reference | Rejected |
| Admit with explicit synthetic confirmation | RECRUITER_CONTACT, version 2 |
| Retry the exact admitted command | No additional database writes |
| Admit a distinct proposal at the old version | Concurrency conflict |
| Close and reopen SQLite | Same version and exactly one derived response task |

The script asserts each result and fails on any discrepancy. It creates a fresh temporary database, never reads `.env` or `PAW_DB_PATH`, makes no network calls, and removes only its own temporary directory. Generated internal IDs and audit timestamps are not part of the deterministic printed result.
