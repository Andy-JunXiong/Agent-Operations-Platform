import { randomUUID } from "node:crypto";
import type { WorkspaceDatabase } from "../persistence/database.js";
import type { IdentityContext } from "../domain/types.js";
import type { ProjectDetails, GetProjectOptions } from "./workspace-service.js";
import type { JobLibraryService } from "./job-library-service.js";
import { applicationProfileSchema } from "../domain/application-profile.js";
import { canonicalHash, canonicalJson } from "../domain/canonical-json.js";
import { skillLibraryState } from "../domain/skill-library.js";
import { AuthorizationError, ConcurrencyConflictError, IdempotencyConflictError, NotFoundError, ValidationError } from "../domain/errors.js";
import {
  INTERVIEW_CONTRACT, INTERVIEW_PROVIDER, interviewReadSchema, recordInterviewSchema,
  parseInterview, validateInterviewEvidence, type InterviewReport, type InterviewCorrection,
} from "../domain/interview-preparation.js";

interface SavedPreparation {
  contractVersion: typeof INTERVIEW_CONTRACT;
  recordVersion: number;
  supersedesPreparationId: string | null;
  inputHash: string;
  selection: { resumeVariantId: string | null; sourceIds: string[] };
  report: InterviewReport;
  correction: InterviewCorrection;
  createdBy: string;
  channel: "MCP";
  authorityReference: string;
}
interface PreparationRow {
  id: string; observed_facts_json: string; evidence_snapshot_json: string; created_at: string;
}
const rowColumns = "id,observed_facts_json,evidence_snapshot_json,created_at";
const MAX_SNAPSHOT_CHARACTERS = 600_000;

export class InterviewPreparationService {
  constructor(
    private db: WorkspaceDatabase,
    private identity: () => IdentityContext & { channel: "WEB" | "MCP" },
    private getProject: (id: string, options?: GetProjectOptions) => ProjectDetails,
    private library: JobLibraryService,
    private clock = () => new Date(),
  ) {}

  private inputs(projectId: string, resumeVariantId: string | undefined, requestedIds: string[]) {
    const detail = this.getProject(projectId, resumeVariantId ? { resumeVariantId } : {});
    if (!detail.preparationContext) throw new ValidationError("Interview preparation requires a Job Application");
    const context = detail.preparationContext;
    const parsed = applicationProfileSchema.safeParse(detail.applicationProfile?.saved?.facts);
    const library = this.library.snapshot();
    const skills = skillLibraryState(library.sources);
    const catalogIds = skills.catalog ? [skills.source!.id,
      ...[...skills.catalog.skills, ...skills.catalog.projects].flatMap(s => s.evidence.map(e => e.sourceId))] : [];
    const selectedIds = [...new Set([...requestedIds, ...catalogIds,
      ...library.sources.filter(s => s.review_status === "CONFIRMED").map(s => s.id)])].sort();
    const sources = library.sources.filter(s => selectedIds.includes(s.id)).sort((a, b) => a.id.localeCompare(b.id));
    const unavailable = selectedIds.filter(id => !sources.some(s => s.id === id));
    // Exclude clocks, Tasks and unrelated history from the fingerprint. Keep the
    // exact working copy and submission confirmations as separate source facts.
    const snapshot = {
      application: { id: projectId, title: detail.project.title, metadata: detail.project.metadata,
        recordVersion: detail.project.recordVersion },
      dossier: detail.applicationProfile?.saved ?? null,
      workingResume: context.workingResume.selected,
      submittedResumes: detail.resumeAssociations.filter(s => s.facts.interpretation.status.startsWith("CONFIRMED_")),
      sources,
      selection: { requestedSourceIds: [...new Set(requestedIds)].sort(), selectedSourceIds: selectedIds,
        unavailableSourceIds: unavailable, fullLibraryReviewed: false as const },
      missingMaterials: [...context.missingItems,
        ...(!sources.length ? ["PROJECT_EVIDENCE"] : []),
        ...(skills.source && skills.status !== "CURRENT" ? [`SKILL_LIBRARY_${skills.status}`] : []),
        ...unavailable.map(id => `SOURCE_UNAVAILABLE:${id}`)],
    };
    // Selection basis describes a read, not a source version.
    const fingerprint = { ...snapshot, workingResume: snapshot.workingResume
      ? { ...snapshot.workingResume, selectionBasis: undefined } : null };
    if (selectedIds.length > 100 || canonicalJson(snapshot).length > MAX_SNAPSHOT_CHARACTERS) {
      throw new ValidationError("Interview context exceeds 100 sources or 600000 characters");
    }
    return { snapshot, inputHash: canonicalHash(fingerprint),
      resumeOptions: context.workingResume.options,
      jd: parsed.success ? parsed.data.jobDescription : null };
  }

  private latest(projectId: string) {
    return this.db.prepare(`SELECT ${rowColumns} FROM resources WHERE project_id=? AND provider=?
      AND resource_type='NOTE' ORDER BY rowid DESC LIMIT 1`).get(projectId, INTERVIEW_PROVIDER) as PreparationRow | undefined;
  }

  private decode(row: PreparationRow) {
    return { id: row.id, createdAt: row.created_at, ...JSON.parse(row.observed_facts_json) as SavedPreparation,
      inputs: JSON.parse(row.evidence_snapshot_json) as ReturnType<InterviewPreparationService["inputs"]>["snapshot"] };
  }

  read(input: unknown) {
    const options = parseInterview(interviewReadSchema, input);
    return this.db.transaction(() => {
      // Authorize even when no preparation exists or an exact version is requested.
      if (!this.getProject(options.projectId).preparationContext) {
        throw new ValidationError("Interview preparation requires a Job Application");
      }
      const latest = this.latest(options.projectId);
      const latestVersion = latest ? this.decode(latest).recordVersion : 0;
      const row = options.preparationVersion === undefined ? latest : this.db.prepare(
        `SELECT ${rowColumns} FROM resources WHERE project_id=? AND provider=? AND resource_type='NOTE'
         AND json_extract(observed_facts_json,'$.recordVersion')=?`,
      ).get(options.projectId, INTERVIEW_PROVIDER, options.preparationVersion) as PreparationRow | undefined;
      if (options.preparationVersion !== undefined && !row) throw new NotFoundError("Interview preparation version was not found");
      const saved = row ? this.decode(row) : null;
      let staleReasons: string[] = [];
      if (saved) {
        try {
          const current = this.inputs(options.projectId, saved.selection.resumeVariantId ?? undefined, saved.selection.sourceIds);
          if (current.inputHash !== saved.inputHash) staleReasons = ["SOURCE_INPUTS_CHANGED"];
        } catch (error) {
          if (!(error instanceof NotFoundError || error instanceof ValidationError)) throw error;
          staleReasons = ["SOURCE_INPUTS_UNAVAILABLE"];
        }
      }
      const history = this.db.prepare(`SELECT id,created_at AS createdAt,
        json_extract(observed_facts_json,'$.recordVersion') AS recordVersion,
        json_extract(observed_facts_json,'$.correction.statement') AS correctionStatement
        FROM resources WHERE project_id=? AND provider=? AND resource_type='NOTE'
        AND json_extract(observed_facts_json,'$.recordVersion') < ? ORDER BY rowid DESC LIMIT 11`)
        .all(options.projectId, INTERVIEW_PROVIDER, options.historyBeforeVersion ?? latestVersion + 1) as
        Array<{ id: string; createdAt: string; recordVersion: number; correctionStatement: string | null }>;
      const current = options.includeContext ? this.inputs(options.projectId, options.resumeVariantId, options.sourceIds) : null;
      return { projectId: options.projectId, status: !saved ? "NOT_PREPARED" : staleReasons.length ? "STALE" : "CURRENT",
        latestVersion, latestId: latest?.id ?? null, staleReasons, preparation: saved,
        context: current ? { contractVersion: "interview-preparation-context-v1", inputHash: current.inputHash,
          ...current.snapshot, resumeOptions: current.resumeOptions } : null,
        history: { items: history.slice(0, 10), total: latestVersion,
          nextBeforeVersion: history.length > 10 ? history[9]!.recordVersion : null } };
    })();
  }

  record(input: unknown) {
    const parsed = parseInterview(recordInterviewSchema, input);
    const identity = this.identity();
    if (identity.channel !== "MCP" || !parsed.userConfirmed) {
      throw new AuthorizationError("Saving interview preparation requires explicit interactive user authority through MCP");
    }
    return this.db.transaction(() => {
      this.getProject(parsed.projectId);
      const operation = "interview.preparation.record";
      const requestHash = canonicalHash({ ...parsed, principalId: identity.principalId });
      const prior = this.db.prepare(`SELECT request_hash,response_json FROM idempotency_records
        WHERE workspace_id=? AND operation=? AND idempotency_key=?`)
        .get(identity.workspaceId, operation, parsed.idempotencyKey) as { request_hash: string; response_json: string } | undefined;
      if (prior) {
        if (prior.request_hash !== requestHash) throw new IdempotencyConflictError("Interview idempotency key has different content");
        return { ...JSON.parse(prior.response_json) as { id: string; recordVersion: number; createdAt: string }, replayed: true };
      }
      const latest = this.latest(parsed.projectId);
      const latestVersion = latest ? this.decode(latest).recordVersion : 0;
      if (latestVersion !== parsed.expectedPreparationVersion || (latest?.id ?? null) !== parsed.supersedesPreparationId) {
        throw new ConcurrencyConflictError("Interview preparation changed; read again before saving");
      }
      if (parsed.correction && !latest) throw new ValidationError("A correction requires an existing preparation");
      const current = this.inputs(parsed.projectId, parsed.resumeVariantId ?? undefined, parsed.sourceIds);
      if (current.snapshot.missingMaterials.includes("WORKING_RESUME_SELECTION")) {
        throw new ValidationError("Select an exact application working resume before saving");
      }
      if (current.inputHash !== parsed.expectedInputHash) throw new ConcurrencyConflictError("Interview source versions changed; read again");
      validateInterviewEvidence(parsed.report, { jd: current.jd,
        resume: current.snapshot.workingResume?.content ?? null, sources: current.snapshot.sources });
      const result = { id: randomUUID(), recordVersion: latestVersion + 1, createdAt: this.clock().toISOString(), replayed: false };
      const facts: SavedPreparation = {
        contractVersion: INTERVIEW_CONTRACT, recordVersion: result.recordVersion,
        supersedesPreparationId: latest?.id ?? null, inputHash: current.inputHash,
        selection: { resumeVariantId: current.snapshot.workingResume?.id ?? null, sourceIds: [...new Set(parsed.sourceIds)].sort() },
        report: parsed.report, correction: parsed.correction, createdBy: identity.principalId,
        channel: "MCP", authorityReference: parsed.authorityReference,
      };
      this.db.prepare(`INSERT INTO resources(id,project_id,resource_type,provider,external_id,external_uri,title,
        observed_facts_json,evidence_snapshot_json,observed_at,canonical_hash,created_at)
        VALUES(?,?,'NOTE',?,?,NULL,?,?,?,?,?,?)`).run(result.id, parsed.projectId, INTERVIEW_PROVIDER, result.id,
          `Interview preparation v${result.recordVersion}`, canonicalJson(facts), canonicalJson(current.snapshot),
          result.createdAt, canonicalHash(facts), result.createdAt);
      this.db.prepare(`INSERT INTO idempotency_records(workspace_id,operation,idempotency_key,request_hash,response_json,created_at)
        VALUES(?,?,?,?,?,?)`).run(identity.workspaceId, operation, parsed.idempotencyKey, requestHash, canonicalJson(result), result.createdAt);
      return result;
    })();
  }
}
