import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { createTestWorkspace, testPrincipal } from "../helpers/test-workspace.js";
import { seedInterviewPreparation } from "../helpers/interview-preparation-fixture.js";
import { WorkspaceService } from "../../src/application/workspace-service.js";
import { verifiedRequestContext } from "../../src/application/request-context.js";
import { openDatabase } from "../../src/persistence/database.js";
import { applicationView } from "../../src/web/views.js";
import type { InterviewReport } from "../../src/domain/interview-preparation.js";
import { canonicalHash } from "../../src/domain/canonical-json.js";
import { applicationProfileSchema } from "../../src/domain/application-profile.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createWorkspaceMcpServer } from "../../src/mcp/create-server.js";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const close of cleanups.splice(0).reverse()) close(); });
function fixture(fileBacked = false) {
  const w = createTestWorkspace({ fileBacked }); cleanups.push(w.cleanup);
  return { ...w, ...seedInterviewPreparation(w.service, w.projectId), prep: w.service.interviewPreparationService };
}
const changes = (w: ReturnType<typeof fixture>) => w.database.prepare("SELECT total_changes() n").get();

it("persists snapshots and replay receipts across restart without changing business state", () => {
  const w = fixture(true), input = w.request();
  const tables = ["projects", "tasks", "state_transitions", "job_library_sources", "resume_documents", "resume_variants"];
  const before = tables.map(t => w.database.prepare(`SELECT * FROM ${t}`).all());
  const result = w.prep.record(input);
  expect(w.prep.record(input)).toEqual({ ...result, replayed: true });
  expect(tables.map(t => w.database.prepare(`SELECT * FROM ${t}`).all())).toEqual(before);
  const saved = w.prep.read({ projectId: w.projectId }).preparation!;
  expect(saved.inputs.workingResume?.recordVersion).toBe(1);
  expect(saved.inputs.dossier?.facts).toMatchObject({ jobDescription: "Build tested software. Python APIs preferred." });
  expect(saved.inputs.sources[0]?.content).toBe("Built Python APIs with tests.");
  expect(saved.inputs.missingMaterials).toContain("SUBMITTED_RESUME_VERSION");
  w.database.close();
  const db = openDatabase(w.databasePath, resolve("db/migrations")); cleanups.push(() => db.close());
  const reopened = new WorkspaceService(db, testPrincipal);
  expect(reopened.interviewPreparationService.read({ projectId: w.projectId }).preparation).toEqual(saved);
  expect(reopened.interviewPreparationService.record(input)).toEqual({ ...result, replayed: true });
});

it("retains corrections and old inputs beyond the ten-resource history with exact reads and pagination", () => {
  const w = fixture(); const first = w.prep.record(w.request());
  for (let v = 2; v <= 12; v++) {
    const input = w.request();
    input.correction = { kind: "USER_STATEMENT", statement: `Scope correction ${v}`, reference: `User turn ${v}` };
    w.prep.record(input);
  }
  const before = changes(w);
  const latest = w.prep.read({ projectId: w.projectId });
  expect(latest.preparation?.recordVersion).toBe(12);
  expect(latest.history).toMatchObject({ total: 12, nextBeforeVersion: 3 });
  expect(latest.history.items).toHaveLength(10);
  expect(w.prep.read({ projectId: w.projectId, historyBeforeVersion: 3 }).history.items.map(h => h.recordVersion)).toEqual([2, 1]);
  expect(w.prep.read({ projectId: w.projectId, preparationVersion: 1 }).preparation).toMatchObject({ id: first.id, correction: null });
  expect(() => w.prep.read({ projectId: w.projectId, preparationVersion: 13 })).toThrow(/not found/);
  expect(changes(w)).toEqual(before);
});

it("rejects stale source and predecessor writes while retaining historical snapshots", () => {
  const w = fixture(), initial = w.request(); w.prep.record(initial);
  const pending = w.request();
  w.service.jobLibraryService.saveSource({ sourceKey: "interview:project", title: "API project", sourceUrl: "https://example.test/project",
    content: "Corrected project scope.", reviewStatus: "SOURCE", expectedVersion: 1 });
  expect(w.prep.read({ projectId: w.projectId }).status).toBe("STALE");
  const before = changes(w);
  expect(() => w.prep.record(pending)).toThrow(/source versions changed/);
  expect(() => w.prep.record({ ...initial, idempotencyKey: randomUUID() })).toThrow(/preparation changed/);
  expect(() => w.prep.record({ ...initial, authorityReference: "different" })).toThrow(/different content/);
  expect(changes(w)).toEqual(before);
  expect(w.prep.record(initial).replayed).toBe(true);
  expect(w.prep.read({ projectId: w.projectId }).preparation?.inputs.sources[0]?.content).toBe("Built Python APIs with tests.");
});

it("rejects invented quotes, invalid support, duplicate IDs and corrections without prior reports with zero writes", () => {
  const w = fixture(), input = w.request(), before = changes(w);
  const altered = (change: (report: InterviewReport) => void) => {
    const report = structuredClone(input.report); change(report);
    expect(() => w.prep.record({ ...input, report })).toThrow();
  };
  altered(r => { r.questions[0]!.jdQuote = "Imaginary JD"; });
  altered(r => { r.questions[0]!.evidence[0]!.quote = "summary"; });
  altered(r => { r.questions[1]!.evidence[0]!.sourceId = randomUUID(); });
  altered(r => { r.questions[0]!.support = "UNKNOWN"; });
  altered(r => { r.questions[1]!.limitations = []; });
  altered(r => { r.questions.push(r.questions[0]!); });
  expect(() => w.prep.record({ ...input, correction: { kind: "USER_STATEMENT", statement: "Correct scope", reference: "User" } })).toThrow(/existing preparation/);
  expect(changes(w)).toEqual(before);
});

it("requires MCP user authority and prevents generic observation bypass and cross-workspace reads/writes", () => {
  const w = fixture(), input = w.request();
  const other = new WorkspaceService(w.database, { ...testPrincipal, subject: "other" }); other.ensureDevelopmentIdentity();
  const web = new WorkspaceService(w.database, verifiedRequestContext(w.database, w.identity, "WEB", randomUUID()));
  const before = changes(w);
  expect(() => w.prep.record({ ...input, userConfirmed: false })).toThrow(/authority/);
  expect(() => web.interviewPreparationService.record(input)).toThrow(/authority/);
  expect(() => other.interviewPreparationService.read({ projectId: w.projectId })).toThrow(/not found/i);
  expect(() => other.interviewPreparationService.record(input)).toThrow(/not found/i);
  for (const provider of ["workspace-interview-preparation", " WORKSPACE-INTERVIEW-PREPARATION ", "chatgpt"]) {
    expect(() => w.service.recordObservation({ projectId: w.projectId, resourceType: "NOTE", provider,
      externalId: randomUUID(), externalUri: null, title: "Forged", observedAt: "2026-09-22T00:00:00Z",
      observedFacts: { contractVersion: "interview-preparation-v1" }, idempotencyKey: randomUUID() })).toThrow(/workspace_record_interview_preparation/);
  }
  expect(changes(w)).toEqual(before);
});

it("allows qualified general practice with missing materials and records omissions server-side", () => {
  const w = createTestWorkspace(); cleanups.push(w.cleanup);
  const read = w.service.interviewPreparationService.read({ projectId: w.projectId, includeContext: true });
  expect(read.status).toBe("NOT_PREPARED");
  const template = fixture().request();
  const report = template.report;
  report.questions = [{ id: "general", question: "Describe a challenge", jdQuote: null, support: "UNKNOWN", evidence: [],
    answerOutline: "Choose a real example and confirm your contribution.", limitations: ["Experience evidence is missing; ability is not assessed."] }];
  w.service.interviewPreparationService.record({ ...template, projectId: w.projectId, resumeVariantId: null, sourceIds: [],
    expectedInputHash: read.context!.inputHash, report });
  expect(w.service.interviewPreparationService.read({ projectId: w.projectId }).preparation?.inputs.missingMaterials)
    .toEqual(expect.arrayContaining(["JOB_DESCRIPTION", "WORKING_RESUME", "PROJECT_EVIDENCE"]));
});

it("requires an exact working resume choice and rejects unavailable variant IDs", () => {
  const w = fixture(); const first = w.request();
  w.service.resumeService.createVariant({ name: "Alternate", targetType: "APPLICATION", targetId: w.projectId, expectedBaseVersion: 1, intentKey: randomUUID() });
  const read = w.prep.read({ projectId: w.projectId, includeContext: true, sourceIds: [w.source.id] });
  expect(read.context?.missingMaterials).toContain("WORKING_RESUME_SELECTION");
  expect(() => w.prep.record({ ...first, resumeVariantId: null, expectedInputHash: read.context!.inputHash })).toThrow(/Select an exact/);
  expect(() => w.prep.read({ projectId: w.projectId, resumeVariantId: randomUUID(), includeContext: true })).toThrow(/not found/);
  const chosen = w.prep.read({ projectId: w.projectId, resumeVariantId: w.resume.variant!.id, includeContext: true, sourceIds: [w.source.id] });
  w.prep.record({ ...first, expectedInputHash: chosen.context!.inputHash });
  expect(w.prep.read({ projectId: w.projectId }).status).toBe("CURRENT");
});

it("renders escaped current/historical reports, omissions, source versions and correction history without writes", () => {
  const w = fixture();
  expect(applicationView(w.service, w.projectId, {}, "Australia/Sydney")).toContain("尚未保存准备稿");
  w.prep.record(w.request()); const input = w.request();
  input.report.summary = '<script>alert("report")</script>';
  input.correction = { kind: "USER_STATEMENT", statement: "This was a personal project", reference: "User statement" };
  w.prep.record(input); const before = changes(w);
  const html = applicationView(w.service, w.projectId, {}, "Australia/Sydney");
  for (const text of ["面试准备 · v2", "This was a personal project", "回答提纲 · 建议", "API project · v1", "实际投递版本待确认", "preparationVersion=1", "workspace_get_interview_preparation"]) expect(html).toContain(text);
  expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain('<script>alert("report")');
  expect(html).toContain('href="https://example.test/project"');
  expect(html).toContain("生成记录"); expect(html).toContain("Synthetic conversation");
  expect(applicationView(w.service, w.projectId, { preparationVersion: 1 }, "Australia/Sydney")).toContain("历史版本");
  expect(() => applicationView(w.service, w.projectId, { preparationVersion: "1x" }, "Australia/Sydney")).toThrow(/Invalid interview/);
  expect(changes(w)).toEqual(before);
});

it("detects dossier and resume edits, includes authored corrections and excludes unavailable sources", () => {
  const w = fixture(); w.prep.record(w.request()); const pending = w.request();
  w.profile();
  expect(w.prep.read({ projectId: w.projectId }).status).toBe("STALE");
  expect(() => w.prep.record(pending)).toThrow(/source versions changed/);
  const second = fixture(); second.prep.record(second.request()); const resumeRace = second.request();
  const content = structuredClone(second.resume.content); content.summary = "Updated personal project scope.";
  second.service.resumeService.save({ expectedVersion: 1, content }, second.resume.variant!.id);
  expect(second.prep.read({ projectId: second.projectId }).status).toBe("STALE");
  expect(() => second.prep.record(resumeRace)).toThrow(/source versions changed/);
  const correction = second.service.jobLibraryService.saveSource({ sourceKey: "user:scope", title: "Confirmed scope", sourceUrl: null,
    content: "The API work was a personal project.", reviewStatus: "CONFIRMED", expectedVersion: 0 });
  second.service.jobLibraryService.saveSource({ sourceKey: "interview:project", title: "API project", sourceUrl: "https://example.test/project",
    content: "Built Python APIs with tests.", reviewStatus: "EXCLUDED", expectedVersion: 1 });
  const read = second.prep.read({ projectId: second.projectId, includeContext: true, sourceIds: [second.source.id] });
  expect(read.context?.sources.map(s => s.id)).toContain(correction.id);
  expect(read.context?.sources.map(s => s.id)).not.toContain(second.source.id);
  expect(read.context?.missingMaterials).toContain(`SOURCE_UNAVAILABLE:${second.source.id}`);
});

it("preserves legacy preparation hashes and snapshots while classifying corrected dossier sources", () => {
  const w = fixture(); w.prep.record(w.request());
  const saved = w.prep.read({ projectId: w.projectId }).preparation!;
  // Reproduce the pre-classification snapshot/fingerprint, without changing its
  // source facts or inventing a completeness declaration for the legacy dossier.
  const legacyInputs = structuredClone(saved.inputs);
  legacyInputs.missingMaterials = legacyInputs.missingMaterials.filter(x => x !== "JOB_DESCRIPTION_COMPLETENESS");
  const legacyHash = canonicalHash({ ...legacyInputs, workingResume: legacyInputs.workingResume
    ? { ...legacyInputs.workingResume, selectionBasis: undefined } : null });
  expect(saved.inputHash).toBe(legacyHash);
  w.database.prepare("UPDATE resources SET evidence_snapshot_json=? WHERE id=?").run(JSON.stringify(legacyInputs), saved.id);
  const before = changes(w);
  const legacyRead = w.prep.read({ projectId: w.projectId, includeContext: true });
  expect(legacyRead.status).toBe("CURRENT");
  expect(legacyRead.preparation?.inputs).toEqual(legacyInputs);
  expect(legacyRead.context?.missingMaterials).toContain("JOB_DESCRIPTION_COMPLETENESS");
  expect(applicationView(w.service, w.projectId, {}, "Australia/Sydney")).toContain("完整性待确认");
  expect(changes(w)).toEqual(before);

  const facts = applicationProfileSchema.parse(w.service.getProject(w.projectId).applicationProfile!.saved!.facts);
  w.service.recordObservation({ projectId: w.projectId, provider: "chatgpt", resourceType: "NOTE",
    externalId: randomUUID(), externalUri: null, title: "Classified source", observedAt: "2026-09-23T00:00:00Z",
    observedFacts: { ...facts, jobDescriptionKind: "SUMMARY" }, idempotencyKey: randomUUID() });
  expect(w.prep.read({ projectId: w.projectId }).status).toBe("STALE");
  w.prep.record(w.request());
  const currentHtml = applicationView(w.service, w.projectId, {}, "Australia/Sydney");
  expect(currentHtml).toContain("仅有要求摘要，完整 JD 待补充");
  expect(currentHtml).toContain("完整 JD 待补充或确认");
  const historicalHtml = applicationView(w.service, w.projectId, { preparationVersion: 1 }, "Australia/Sydney");
  const historicalPanel = historicalHtml.split('id="application-interview"')[1]!.split('id="application-resume"')[0]!;
  expect(historicalPanel).toContain("完整性待确认");
  expect(historicalPanel).not.toContain("仅有要求摘要");
  expect(w.prep.read({ projectId: w.projectId, preparationVersion: 1 }).preparation?.inputs).toEqual(legacyInputs);
});

it("discovers and invokes interview reads, admission errors, saves and exact version read through MCP", async () => {
  const w = fixture(), server = createWorkspaceMcpServer(w.service);
  const client = new Client({ name: "interview-preparation-test", version: "1" });
  const [c, s] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(s); await client.connect(c);
    const tools = await client.listTools();
    expect(tools.tools.find(t => t.name === "workspace_get_interview_preparation")?.annotations?.readOnlyHint).toBe(true);
    const facts = applicationProfileSchema.parse(w.service.getProject(w.projectId).applicationProfile!.saved!.facts);
    const classified = await client.callTool({ name: "workspace_record_observation", arguments: {
      projectId: w.projectId, provider: "chatgpt", resourceType: "NOTE", title: "Full saved posting",
      observedAt: "2026-09-23T00:00:00Z", observedFacts: { ...facts, jobDescriptionKind: "FULL_TEXT" },
      idempotencyKey: randomUUID(),
    } });
    expect(classified.isError).not.toBe(true);
    const projectRead = await client.callTool({ name: "workspace_get_project", arguments: { projectId: w.projectId } });
    expect(projectRead.structuredContent).toMatchObject({ result: {
      preparationContext: { dossier: { jobDescriptionKind: "FULL_TEXT", jobDescriptionStatus: "AVAILABLE" } },
    } });
    const read = await client.callTool({ name: "workspace_get_interview_preparation", arguments: { projectId: w.projectId, includeContext: true } });
    expect(read.structuredContent).toMatchObject({ result: { status: "NOT_PREPARED", context: { contractVersion: "interview-preparation-context-v1" } } });
    const input = w.request();
    expect((await client.callTool({ name: "workspace_record_interview_preparation", arguments: { ...input, userConfirmed: false } })).isError).toBe(true);
    expect((await client.callTool({ name: "workspace_record_interview_preparation", arguments: input })).structuredContent)
      .toMatchObject({ result: { recordVersion: 1, replayed: false } });
    expect((await client.callTool({ name: "workspace_record_interview_preparation", arguments: input })).structuredContent)
      .toMatchObject({ result: { recordVersion: 1, replayed: true } });
    expect((await client.callTool({ name: "workspace_get_interview_preparation", arguments: { projectId: w.projectId, preparationVersion: 1 } })).structuredContent)
      .toMatchObject({ result: { status: "CURRENT", preparation: { recordVersion: 1, channel: "MCP" } } });
  } finally { await client.close(); await server.close(); }
});
