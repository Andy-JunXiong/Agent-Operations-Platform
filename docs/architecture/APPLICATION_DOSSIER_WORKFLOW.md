# Application dossier workflow

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Required post-application sequence

1. Resolve the exact company, role and application. Register only with existing
   user authority or explicit submission evidence under the approved workflow.
2. Save the exact employer/platform posting URL in postingReference. Use the
   existing versioned workspace_update_job_application tool for later backfill.
   Do not substitute a company homepage or another similarly named job.
3. Retrieve the actual JD from that posting or supplied document and save its text
   in a job-application-profile-v0.1 NOTE. Record the URL/source in sourceReference.
   A missing or inaccessible posting remains a visible gap; do not reconstruct
   its JD from the title or a different vacancy.
4. Search available resume files by company, then role and application date.
   Suggested filename: Company_Role_Name_YYYY-MM-DD_v1.pdf (or .docx).
   Multiple roles or versions must remain distinguishable. Filename matches are
   candidates only. Associate the exact Drive file and revision using the existing
   resume contract; confirm actual submission only from user/submission evidence.
   Do not rename user files merely to make a match.
5. Compare each substantive requirement from the saved JD with evidence in the
   identified resume or user-supplied experience. Preserve exact requirements,
   concrete evidence and source/version references. Save structured skillMatch:
   matches[{requirement,evidence,assessment,gap?}] plus summary and gaps.
   MATCH requires evidence, PARTIAL describes the limitation, GAP needs evidence
   of a real gap, and UNKNOWN means evidence is unavailable. Missing resume text
   must never be converted into invented skills or a claim that the skill is absent.
6. Before updating the profile, read applicationProfile.saved and preserve existing
   JD, report and resume text in the new complete snapshot. After writing, read
   workspace_get_project again and verify the URL, latest profile and resume
   association. Disclose missing fields instead of claiming the dossier is complete.


## Completion indicators

The four indicators are: a usable-format saved URL, explicitly sourced full JD text, confirmed submitted
resume version, and a nonempty structured comparison. A candidate or confirmed
file with an unknown revision is explicitly incomplete for version confirmation.
Saved comparison completeness is not an automated quality certification. The
comparison can still be reviewed when the submission version is pending, with
its source/version uncertainty disclosed in the saved report.

## Explicit JD completeness — September 23

### Continuity and benefits

The preparation workflow needs to distinguish retained summaries from complete
source text. This increment adds explicit source-kind declarations and consistent
Web/context labels, so a summary cannot satisfy the complete-JD indicator. It
enables deliberate source correction and later preparation from attributable
material. Preserved source facts support reproducibility across conversations;
complete-dossier real use and source quality still require separate acceptance.

The optional `jobDescriptionKind` accepts FULL_TEXT, SUMMARY or UNKNOWN. Omission
with saved text reads as UNKNOWN; absent text projects MISSING. FULL_TEXT requires
text and a sourceReference; SUMMARY requires text. No legacy row is rewritten and
there is no migration. Preserve other profile fields when saving a new snapshot.

The shared view labels full text, requirements summaries and unverified material
separately. Preparation context adds `dossier.jobDescriptionKind` and the
`JOB_DESCRIPTION_COMPLETENESS` gap. Existing AVAILABLE/MISSING status continues
to mean text presence. Saved interview citations use their retained profile facts,
not today's classification. The host instruction explicitly qualifies summaries.

Only the new derived warning is excluded from the interview input hash, preserving
unchanged pre-upgrade hashes. Actual profile/source changes still invalidate older
preparations. Source snapshots, authority, lifecycle, Tasks and submission evidence
retain their existing contracts.

Verification: 74 tests across the five affected dossier/context/resume/interview/
Web suites, both TypeScript configurations and build passed in this public checkout.
The tests cover validation, material status, legacy hashes, explicit source changes
and historical rendering. This is public source evidence, not a hosted-service,
live account or cross-host acceptance claim. Unchanged broader runtime checks are
not repeated locally; existing full Verify CI and public-data gates remain intact.

