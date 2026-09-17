import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WorkspaceService } from "../src/application/workspace-service.js";
import { AuthorizationError, ConcurrencyConflictError } from "../src/domain/errors.js";
import { openDatabase } from "../src/persistence/database.js";

// Never read .env or PAW_DB_PATH. Only this newly created temporary DB is opened.
const fixture = JSON.parse(readFileSync(new URL("../fixtures/synthetic/lifecycle.json", import.meta.url), "utf8"));
assert.equal(fixture.synthetic, true);
const directory = mkdtempSync(join(tmpdir(), "paw-public-demo-"));
const databasePath = join(directory, "demo.db");
const migrations = resolve("db/migrations");
const principal = { issuer: "synthetic-demo", subject: "candidate-a", workspaceName: "Synthetic Workspace" };
let database = openDatabase(databasePath, migrations);
try {
  const service = new WorkspaceService(database, principal);
  service.ensureDevelopmentIdentity();
  service.seedJobApplication(fixture);
  const observation = service.recordObservation({
    projectId: fixture.projectId, resourceType: "EMAIL", provider: "synthetic-mail",
    externalId: fixture.messageId, externalUri: fixture.messageUrl,
    title: "Synthetic recruiter response", observedFacts: { recruiterReplied: true },
    observedAt: fixture.observedAt, idempotencyKey: "synthetic-observation",
  });
  const input = {
    projectId: fixture.projectId, expectedLifecycleVersion: 1,
    toState: "RECRUITER_CONTACT" as const, triggerType: "EXTERNAL_EVIDENCE" as const,
    evidenceResourceIds: [observation.resource.id], rationale: "Synthetic recruiter response",
  };
  const proposal = service.proposeTransition({ ...input, idempotencyKey: "synthetic-proposal" });
  const stale = service.proposeTransition({ ...input, rationale: "Distinct synthetic proposal at version 1", idempotencyKey: "synthetic-stale-proposal" });
  assert.equal(service.getProject(fixture.projectId).project.lifecycleState, "APPLIED");
  assert.throws(() => service.admitTransition({
    transitionId: proposal.transition.id, expectedLifecycleVersion: 1,
    authority: { type: "EXPLICIT_USER_DEV", confirmed: true, reference: "" },
    idempotencyKey: "synthetic-refused",
  }), AuthorizationError);
  const admission = {
    transitionId: proposal.transition.id, expectedLifecycleVersion: 1,
    authority: { type: "EXPLICIT_USER_DEV" as const, confirmed: true as const, reference: "Synthetic user confirmation" },
    idempotencyKey: "synthetic-admission",
  };
  const accepted = service.admitTransition(admission);
  assert.equal(accepted.project.lifecycleVersion, 2);
  const changes = database.prepare("SELECT total_changes() AS n").get() as { n: number };
  service.admitTransition(admission);
  assert.deepEqual(database.prepare("SELECT total_changes() AS n").get(), changes);
  assert.throws(() => service.admitTransition({ ...admission, transitionId: stale.transition.id, idempotencyKey: "synthetic-stale-admission" }), ConcurrencyConflictError);
  database.close();
  database = openDatabase(databasePath, migrations);
  const restored = new WorkspaceService(database, principal).getProject(fixture.projectId);
  assert.equal(restored.project.lifecycleState, "RECRUITER_CONTACT");
  assert.equal(restored.project.lifecycleVersion, 2);
  assert.equal(restored.openTasks.length, 1);
  console.log(JSON.stringify({ synthetic: true, application: "Application 001", company: fixture.company,
    observationAndProposalDoNotAdmit: true, missingAuthorityRejected: true,
    exactRetryAddsNoWrites: true, staleAdmissionRejected: true,
    recoveredState: restored.project.lifecycleState, recoveredVersion: restored.project.lifecycleVersion,
    derivedTask: restored.openTasks[0]?.taskKind,
  }, null, 2));
} finally {
  if (database.open) database.close();
  rmSync(directory, { recursive: true, force: true });
}
