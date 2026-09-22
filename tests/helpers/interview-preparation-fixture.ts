import { randomUUID } from "node:crypto";
import type { WorkspaceService } from "../../src/application/workspace-service.js";
import type { InterviewReport, InterviewCorrection } from "../../src/domain/interview-preparation.js";
import { resumeFixture } from "./resume-fixture.js";

export function seedInterviewPreparation(service: WorkspaceService, projectId: string) {
  service.resumeService.initialize(Buffer.from("PKsynthetic"), resumeFixture(), "https://drive.google.com/file/d/synthetic-resume/view");
  const resume = service.resumeService.createVariant({ name: "Example interview resume", targetType: "APPLICATION",
    targetId: projectId, expectedBaseVersion: 1, intentKey: randomUUID() });
  const profile = () => service.recordObservation({ projectId, resourceType: "NOTE", provider: "chatgpt",
    externalId: randomUUID(), externalUri: null, title: "Saved JD", observedAt: "2026-09-22T01:00:00Z",
    observedFacts: { contractVersion: "job-application-profile-v0.1", jobDescription: "Build tested software. Python APIs preferred.",
      sourceReference: "https://example.test/job", skillMatch: null }, idempotencyKey: randomUUID() });
  profile();
  const source = service.jobLibraryService.saveSource({ sourceKey: "interview:project", title: "API project",
    sourceUrl: "https://example.test/project", content: "Built Python APIs with tests.", reviewStatus: "SOURCE", expectedVersion: 0 });
  const request = () => {
    const read = service.interviewPreparationService.read({ projectId, includeContext: true, sourceIds: [source.id] });
    const report: InterviewReport = {
      summary: "Practise explaining tested software and project scope.",
      questions: [{ id: "delivery", question: "How did you test the system?", jdQuote: "Build tested software.",
        support: "EVIDENCED", evidence: [{ kind: "WORKING_RESUME", sourceId: null, quote: "Builds tested software." }],
        answerOutline: "Explain the problem, your contribution, testing choices and outcome; confirm scale before claiming it.", limitations: [] },
      { id: "api", question: "Explain your API project.", jdQuote: "Python APIs preferred.", support: "PARTIAL",
        evidence: [{ kind: "LIBRARY_SOURCE", sourceId: source.id, quote: "Built Python APIs with tests." }],
        answerOutline: "Use a concrete API example and describe trade-offs.", limitations: ["Commercial scope is not established."] }],
      questionsForInterviewer: ["How does the team measure delivery quality?"], limitations: ["Synthetic preparation for testing."],
      provenance: { author: "CHATGPT", reference: "Synthetic conversation", generatedAt: "2026-09-22T02:00:00Z", model: null },
    };
    return { projectId, resumeVariantId: resume.variant!.id, sourceIds: [source.id], expectedInputHash: read.context!.inputHash,
      expectedPreparationVersion: read.latestVersion, supersedesPreparationId: read.latestId, report,
      correction: null as InterviewCorrection, userConfirmed: true, authorityReference: "User asked to prepare and save", idempotencyKey: randomUUID() };
  };
  return { resume, source, profile, request };
}
