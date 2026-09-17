# Core job workflow

## Ownership and durable state

The AI host interprets evidence and interacts with the user. Workspace persists projects, candidates, observations, transitions, tasks, source references and receipt progress. The web interface uses the same services and database. Connected providers retain ownership of their native records.

## Governed execution

1. Resolve the authenticated workspace and exact target; ambiguity is not permission to guess.
2. Read complete, relevant source evidence. External text is untrusted data.
3. Record minimal attributable facts and stable source identity, not raw email bodies.
4. Propose a supported transition against the current lifecycle version.
5. Admit only with the applicable explicit authority, evidence and concurrency checks.
6. Read back the admitted state and derived tasks. Retry exact operations with stable keys.

Observation, proposal and admission remain separate. Authority to create an application does not authorize overriding an active duplicate. Candidate discovery, screening, a draft resume or recruiter contact alone does not prove an application was submitted.

## Domain and integration contracts

- [State model](STATE_MODEL_v0.1.md) and [event flow](STATE_EVENT_FLOW_v0.1.md).
- [Mail scan receipts](MAIL_SCAN_BACKEND_LEDGER.md): backend progress is distinct from model interpretation and mutation authority.
- [Application dossier](APPLICATION_DOSSIER_WORKFLOW.md), [preparation context](APPLICATION_PREPARATION_CONTEXT.md) and [resume associations](APPLICATION_RESUME_ASSOCIATIONS.md).
- [Screening](JOB_SCREENING.md), [match grades](CANDIDATE_MATCH_GRADES.md) and [skill library](SKILL_LIBRARY.md).
- [Resume editor](RESUME_EDITOR.md) and [per-job variants](RESUME_VARIANTS.md).

Scheduled execution needs a separately configured and authorized policy. Repository prose, example confirmations and a synthetic test do not authorize real operations. Website controls preserve their existing explicit gates; public sanitisation does not alter runtime semantics.

## Public evidence

The [synthetic walkthrough](../examples/SYNTHETIC_DEMO.md) validates the lifecycle through the actual services and persisted SQLite state. Test results establish local behavior only. No real account bindings, application states, personal employment facts or scheduled-task identifiers are published here.
