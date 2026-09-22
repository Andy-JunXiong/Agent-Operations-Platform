# Single-application preparation context

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

The [interview-preparation successor](INTERVIEW_PREPARATION.md) reuses this read
context to admit cited results, retain source snapshots and preserve correction
history. It keeps working copies and actual-submission evidence separate.

## Read contract

`workspace_get_project` accepts:

```json
{
  "projectId": "existing-job-application-uuid",
  "resumeVariantId": "optional-exact-application-linked-variant-uuid"
}
```

For a Job Application, the existing result now also contains:

- `preparationContext.contractVersion` and `readAt`;
- dossier availability and the exact saved profile Resource reference;
- application-linked working-resume options plus zero or one selected content
  body, its own `recordVersion` and base-source version;
- confirmed-file/version Resource references, while the sibling
  `resumeAssociations` retains the full confirmation basis;
- ordered `missingItems` for posting reference, JD, structured skill comparison,
  submitted file/version, working resume or required working-resume selection;
- returned/total/limit/truncated facts for Resources and transitions, and complete
  open-Task counts.

Non-Job Projects receive `preparationContext: null`. Existing top-level fields and
the 10-item Resource/transition limits are retained. The selected working resume
is automatically included only when exactly one application-linked option exists.
With several options, no content is returned until an exact option is supplied.

