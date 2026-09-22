import { z } from "zod";
import { ValidationError } from "./errors.js";
import { resumeContains } from "./candidate-match-assessment.js";

export const INTERVIEW_PROVIDER = "workspace-interview-preparation";
export const INTERVIEW_CONTRACT = "interview-preparation-v1";
const text = (max: number) => z.string().trim().min(1).max(max);
const version = z.number().int().positive();
export const interviewReadSchema = z.object({
  projectId: z.uuid(),
  resumeVariantId: z.uuid().optional(),
  sourceIds: z.array(z.uuid()).max(30).default([]),
  includeContext: z.boolean().default(false),
  preparationVersion: version.optional(),
  historyBeforeVersion: version.optional(),
}).strict();

export const interviewReportSchema = z.object({
  summary: text(3000),
  questions: z.array(z.object({
    id: text(80), question: text(1000),
    jdQuote: text(2000).nullable(),
    support: z.enum(["EVIDENCED", "PARTIAL", "UNKNOWN"]),
    evidence: z.array(z.object({
      kind: z.enum(["WORKING_RESUME", "LIBRARY_SOURCE"]),
      sourceId: z.uuid().nullable(), quote: text(2000),
    }).strict()).max(10),
    answerOutline: text(4000),
    limitations: z.array(text(1000)).max(10),
  }).strict()).min(1).max(30),
  questionsForInterviewer: z.array(text(1000)).max(20),
  limitations: z.array(text(1000)).max(30),
  provenance: z.object({
    author: z.literal("CHATGPT"), reference: text(2000),
    generatedAt: z.iso.datetime(), model: text(200).nullable(),
  }).strict(),
}).strict();

export const recordInterviewSchema = z.object({
  projectId: z.uuid(), resumeVariantId: z.uuid().nullable(),
  sourceIds: z.array(z.uuid()).max(30),
  expectedInputHash: z.string().regex(/^[a-f0-9]{64}$/u),
  expectedPreparationVersion: z.number().int().min(0),
  supersedesPreparationId: z.uuid().nullable(),
  report: interviewReportSchema,
  correction: z.object({
    kind: z.literal("USER_STATEMENT"), statement: text(2000), reference: text(2000),
  }).strict().nullable(),
  userConfirmed: z.boolean(), authorityReference: text(1000), idempotencyKey: text(200),
}).strict();
export type InterviewReport = z.infer<typeof interviewReportSchema>;
export type InterviewCorrection = z.infer<typeof recordInterviewSchema>["correction"];

export function parseInterview<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError("Invalid interview preparation input");
  return result.data;
}

export function validateInterviewEvidence(report: InterviewReport, inputs: {
  jd: string | null; resume: unknown; sources: Array<{ id: string; content: string }>;
}) {
  const ids = new Set<string>();
  for (const question of report.questions) {
    if (ids.has(question.id)) throw new ValidationError("Duplicate interview question ID");
    ids.add(question.id);
    if (question.jdQuote !== null && !inputs.jd?.includes(question.jdQuote)) {
      throw new ValidationError("Interview requirement must quote the saved JD exactly");
    }
    if (question.support === "UNKNOWN" ? question.evidence.length > 0 : !question.evidence.length) {
      throw new ValidationError("Interview support must agree with its evidence");
    }
    if (question.support !== "EVIDENCED" && !question.limitations.length) {
      throw new ValidationError("Partial or unknown evidence requires an explicit limitation");
    }
    for (const citation of question.evidence) {
      const valid = citation.kind === "WORKING_RESUME"
        ? citation.sourceId === null && resumeContains(inputs.resume, citation.quote)
        : citation.sourceId !== null && inputs.sources.some(s => s.id === citation.sourceId && s.content.includes(citation.quote));
      if (!valid) throw new ValidationError("Interview citation is absent from the selected source snapshot");
    }
  }
}
