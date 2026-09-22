import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createTestWorkspace } from "../helpers/test-workspace.js";
import { applicationView } from "../../src/web/views.js";

it("reads a saved JD/comparison beyond recent resources and displays gaps without claiming a submitted resume", () => {
  const w = createTestWorkspace();
  try {
    w.database.prepare("UPDATE projects SET metadata_json=json_set(metadata_json,'$.postingReference',?) WHERE id=?")
      .run("https://example.test/jobs/123", w.projectId);
    const facts = {contractVersion:"job-application-profile-v0.1",jobDescription:"Build reliable SQL pipelines.",
      sourceReference:"Posting https://example.test/jobs/123; candidate resume file/revision still to be confirmed",
      skillMatch:{summary:"Comparison with supplied experience",matches:[{requirement:"SQL pipelines",evidence:"User supplied SQL project",
        assessment:"PARTIAL",gap:"Confirm production scale <script>unsafe</script>"}],gaps:["Production scale evidence needed"]}};
    const profile=w.service.recordObservation({projectId:w.projectId,provider:"chatgpt",resourceType:"NOTE",externalUri:null,title:"Synthetic dossier",externalId:randomUUID(),
      observedAt:"2026-09-09T09:00:00Z",observedFacts:facts,idempotencyKey:randomUUID()});
    for(let i=0;i<12;i++) w.service.recordObservation({projectId:w.projectId,provider:"chatgpt",resourceType:"NOTE",externalUri:null,title:"Synthetic dossier",externalId:randomUUID(),
      observedAt:"2026-09-09T09:00:00Z",observedFacts:{summary:"Later unrelated note"},idempotencyKey:randomUUID()});
    const before=w.database.prepare("SELECT total_changes() n").get();
    const project=w.service.getProject(w.projectId);
    expect(project.resources.some(r=>r.id===profile.resource.id)).toBe(false);
    expect(project.applicationProfile?.saved?.facts).toEqual(facts);
    const html=applicationView(w.service,w.projectId,{},"Australia/Sydney");
    expect(html).toContain("2 / 4 已齐备");
    expect(html).toContain("完整性待确认");
    expect(html).toContain("待关联");
    expect(html).toContain("岗位要求与技能对照");
    expect(html).toContain("差距 / 待补证据");
    expect(html).toContain("Confirm production scale &lt;script&gt;unsafe&lt;/script&gt;");
    expect(html).not.toContain("<script>unsafe</script>");
    expect(html).toContain('id="application-jd"');
    expect(html).toContain('id="application-skills"');
    expect(html).toContain('id="application-resume"');
    expect(w.database.prepare("SELECT total_changes() n").get()).toEqual(before);
  } finally {w.cleanup();}
});

it.each([
  { kind: undefined, text: "Saved legacy text", expected: "UNKNOWN", label: "完整性待确认", complete: false },
  { kind: "UNKNOWN", text: "Unclassified source", expected: "UNKNOWN", label: "完整性待确认", complete: false },
  { kind: "SUMMARY", text: "Summarized requirements", expected: "SUMMARY", label: "仅有要求摘要", complete: false },
  { kind: "FULL_TEXT", text: "Exact posting text", expected: "FULL_TEXT", label: "已记录完整 JD", complete: true },
  { kind: undefined, text: null, expected: "MISSING", label: "尚未保存 JD 正文", complete: false },
])("keeps $expected dossier completeness consistent across saved facts, Web and preparation reads", ({ kind, text, expected, label, complete }) => {
  const w = createTestWorkspace();
  try {
    const facts = { contractVersion: "job-application-profile-v0.1", jobDescription: text,
      ...(kind ? { jobDescriptionKind: kind } : {}), sourceReference: "https://example.test/exact-posting", skillMatch: null };
    const input = { projectId: w.projectId, provider: "chatgpt", resourceType: "NOTE" as const,
      externalUri: null, title: "Dossier", externalId: randomUUID(), observedAt: "2026-09-23T00:00:00Z",
      observedFacts: facts, idempotencyKey: randomUUID() };
    const saved = w.service.recordObservation(input);
    expect(w.service.recordObservation(input).resource.id).toBe(saved.resource.id);
    const before = w.database.prepare("SELECT total_changes() n").get();
    const detail = w.service.getProject(w.projectId);
    expect(detail.applicationProfile?.saved?.facts).toEqual(facts);
    expect(detail.preparationContext?.dossier).toMatchObject({ jobDescriptionKind: expected,
      jobDescriptionStatus: text ? "AVAILABLE" : "MISSING" });
    const gaps = detail.preparationContext!.missingItems;
    expect(gaps.includes("JOB_DESCRIPTION_COMPLETENESS")).toBe(!!text && !complete);
    expect(gaps.includes("JOB_DESCRIPTION")).toBe(!text);
    const preparation = w.service.interviewPreparationService.read({ projectId: w.projectId, includeContext: true });
    expect(preparation.context?.missingMaterials.includes("JOB_DESCRIPTION_COMPLETENESS")).toBe(!!text && !complete);
    const html = applicationView(w.service, w.projectId, {}, "Australia/Sydney");
    expect(html).toContain(label);
    expect(html).toContain(`${complete ? 1 : 0} / 4 已齐备`);
    const history = applicationView(w.service, w.projectId, { section: "resources" }, "Australia/Sydney");
    const resourceRows = history.split("data-page-items>")[1]!.split('class="pagination"')[0]!;
    expect(resourceRows).toContain("岗位资料完整性");
    expect(resourceRows).toContain(expected === "MISSING" ? "待补充" : label);
    expect(w.database.prepare("SELECT total_changes() n").get()).toEqual(before);
  } finally { w.cleanup(); }
});

const invalidProfiles: Array<Record<string, string | null>> = [
  { jobDescription: null, jobDescriptionKind: "FULL_TEXT", sourceReference: "https://example.test/job" },
  { jobDescription: null, jobDescriptionKind: "SUMMARY", sourceReference: "Summary source" },
  { jobDescription: "Text", jobDescriptionKind: "FULL_TEXT" },
  { jobDescription: "Text", jobDescriptionKind: "FULL_TEXT", sourceReference: "  " },
  { jobDescription: "Text", jobDescriptionKind: "INFERRED" },
];
it.each(invalidProfiles)("rejects an unsupported or unattributed dossier classification without writes: %j", fields => {
  const w = createTestWorkspace();
  try {
    const before = w.database.prepare("SELECT total_changes() n").get();
    expect(() => w.service.recordObservation({ projectId: w.projectId, provider: "chatgpt", resourceType: "NOTE",
      externalUri: null, externalId: randomUUID(), title: "Invalid dossier", observedAt: "2026-09-23T00:00:00Z",
      observedFacts: { contractVersion: "job-application-profile-v0.1", skillMatch: null, ...fields },
      idempotencyKey: randomUUID() })).toThrow(/Invalid saved application profile/);
    expect(w.database.prepare("SELECT total_changes() n").get()).toEqual(before);
  } finally { w.cleanup(); }
});
