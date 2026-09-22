import { z } from "zod";
import type { WorkspaceService } from "../application/workspace-service.js";
import { parseInterview } from "../domain/interview-preparation.js";
import { applicationProfileSchema } from "../domain/application-profile.js";
import { jobDescriptionPresentation } from "./application-profile-view.js";
import { escapeHtml as e, rootPath, safeExternalUrl } from "./views.js";

const pageSchema = z.object({
  preparationVersion: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  preparationBeforeVersion: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();
const missingLabels: Record<string, string> = {
  POSTING_REFERENCE: "职位链接待补充", JOB_DESCRIPTION: "JD 正文待补充", SKILL_MATCH: "技能对照待补充",
  JOB_DESCRIPTION_COMPLETENESS: "完整 JD 待补充或确认",
  WORKING_RESUME: "岗位简历副本待创建", WORKING_RESUME_SELECTION: "需选择岗位简历副本",
  SUBMITTED_RESUME_FILE: "实际投递文件待确认", SUBMITTED_RESUME_VERSION: "实际投递版本待确认",
  PROJECT_EVIDENCE: "项目资料待补充",
};
const list = (items: string[]) => items.length ? `<ul>${items.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : "";
function sourceText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(sourceText).filter(Boolean).join("\n");
  if (value && typeof value === "object") return Object.values(value).map(sourceText).filter(Boolean).join("\n");
  return "";
}

export function interviewPreparationPanel(service: WorkspaceService, projectId: string, query: unknown, zone: string) {
  const options = parseInterview(pageSchema, query);
  const result = service.interviewPreparationService.read({ projectId,
    preparationVersion: options.preparationVersion, historyBeforeVersion: options.preparationBeforeVersion });
  const saved = result.preparation;
  const link = `${rootPath}/applications/${encodeURIComponent(projectId)}`;
  const prompt = `请为申请 ${projectId} 准备并保存面试提纲。先调用 workspace_get_interview_preparation，includeContext=true；核对申请、JD、简历版本及项目来源。如有多个简历副本，先让我选择。查看已有准备稿和纠正历史（含后续分页），保留用户纠正。问题逐字引用已保存的岗位资料；若资料只是要求摘要，应明确说明，不称为完整 JD。经历依据引用所选简历或项目资料；回答提纲标为建议。缺少证据就列为待确认，不编造经历，也不认定没有能力。用当前 inputHash、latestVersion、latestId 通过 workspace_record_interview_preparation 保存，再读取核对。`;
  const handoff = `<details class="candidate-chatgpt-handoff" data-chatgpt-handoff><summary>${saved ? "在 ChatGPT 中更新或纠正" : "用 ChatGPT 准备面试"}</summary><p>复制指令到 ChatGPT，并选择 Agent Operations Platform（连接名称可能仍为 Personal AI Workspace）。需要纠正时，在指令后写明你的更正。</p><label class="sr-only" for="interview-prompt">面试准备指令</label><textarea id="interview-prompt" data-chatgpt-prompt readonly rows="6">${e(prompt)}</textarea><button type="button" class="button secondary" data-copy-candidate-prompt>复制准备指令</button><p data-chatgpt-copy-status role="status" aria-live="polite"></p></details>`;
  if (!saved) return `<section id="application-interview" class="panel application-profile"><h2>面试准备</h2><p>尚未保存准备稿。可基于这份申请的 JD、岗位简历和项目资料生成问题与回答提纲。</p>${handoff}</section>`;
  const at = new Intl.DateTimeFormat("zh-CN", { timeZone: zone, dateStyle: "medium", timeStyle: "short" }).format(new Date(saved.createdAt));
  const inputs = saved.inputs;
  const profile = applicationProfileSchema.safeParse(inputs.dossier?.facts);
  const jd = jobDescriptionPresentation(profile.success ? profile.data : null);
  const dossierText = profile.success ? [profile.data.jobDescription, profile.data.sourceReference].filter(Boolean).join("\n\n") : "资料未保存";
  const missing = inputs.missingMaterials.map(x => missingLabels[x] ?? (x.startsWith("SOURCE_UNAVAILABLE:") ? "所选资料不可用" : x.startsWith("SKILL_LIBRARY_") ? "技能库需要检查" : x));
  const questions = saved.report.questions.map(q => `<article class="evidence-row"><h3>${e(q.question)}</h3><p class="muted">${{ EVIDENCED: "有来源依据", PARTIAL: "部分依据 · 需补充", UNKNOWN: "待确认依据" }[q.support]}</p>${q.jdQuote ? `<h4>已保存岗位资料 · 引用</h4><p class="muted">${e(jd.label)}</p><blockquote>${e(q.jdQuote)}</blockquote>` : '<p class="muted">通用练习题</p>'}${q.evidence.map(c => {
    const source = inputs.sources.find(s => s.id === c.sourceId);
    return `<h4>${e(c.kind === "WORKING_RESUME" ? `${inputs.workingResume?.name ?? "岗位简历"} · v${inputs.workingResume?.recordVersion}` : `${source?.title ?? "项目资料"} · v${source?.record_version}`)}</h4><blockquote>${e(c.quote)}</blockquote>`;
  }).join("")}<h4>回答提纲 · 建议</h4><div class="saved-text">${e(q.answerOutline)}</div>${list(q.limitations)}</article>`).join("");
  const sourceDetails = `<details><summary>查看本稿使用的资料快照</summary><p>这些是保存当时的资料。岗位简历副本与实际投递确认分别保留。</p><h3>已保存岗位资料与来源</h3><p class="muted">${e(jd.label)}</p><div class="saved-text">${e(dossierText)}</div><h3>岗位简历副本${inputs.workingResume ? ` · ${e(inputs.workingResume.name)} · v${inputs.workingResume.recordVersion}` : " · 缺失"}</h3><div class="saved-text">${e(sourceText(inputs.workingResume?.content))}</div><h3>投递确认</h3>${inputs.submittedResumes.length ? list(inputs.submittedResumes.map(s => `${s.facts.sourceFacts.fileName} · ${s.facts.sourceFacts.revisionId ?? "版本待确认"}`)) : "<p>尚无投递确认。</p>"}<h3>所选项目资料</h3><p class="muted">本稿仅使用所选来源，不代表已审阅全部资料库。</p>${inputs.sources.map(s => `<details><summary>${e(s.title)} · v${s.record_version}</summary>${safeExternalUrl(s.source_url) ? `<a class="text-link" href="${e(safeExternalUrl(s.source_url))}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>` : ""}<div class="saved-text">${e(s.content)}</div></details>`).join("")}<h3>生成记录</h3><p class="saved-text">${e(saved.report.provenance.reference)}</p><p class="muted">ChatGPT · ${e(saved.report.provenance.generatedAt)}${saved.report.provenance.model ? ` · ${e(saved.report.provenance.model)}` : ""}</p></details>`;
  const history = result.history.items.map(h => `<li><a href="${link}?preparationVersion=${h.recordVersion}#application-interview">v${h.recordVersion}</a>${h.correctionStatement ? ` · 用户纠正：${e(h.correctionStatement)}` : ""}</li>`).join("");
  return `<section id="application-interview" class="panel application-profile"><h2>面试准备 · v${saved.recordVersion}</h2><p class="muted">${e(at)} · ${saved.recordVersion === result.latestVersion ? "最新保存稿" : "历史版本"} · ${result.status === "STALE" ? "资料已变化或不可用，需重新核对" : "与当前所用资料一致"}</p><p class="saved-text">${e(saved.report.summary)}</p><p class="muted">回答提纲为练习建议；来源引用与建议分别展示。</p>${saved.correction ? `<h3>本次用户纠正</h3><p class="saved-text">${e(saved.correction.statement)}</p><p class="muted">${e(saved.correction.reference)}</p>` : ""}${missing.length ? `<h3>保存时待补材料</h3>${list(missing)}` : ""}${questions}<h3>可向面试官提问</h3>${list(saved.report.questionsForInterviewer)}${list(saved.report.limitations)}${sourceDetails}<details><summary>准备稿与纠正历史 · ${result.history.total} 个版本</summary><ul>${history}</ul>${result.history.nextBeforeVersion ? `<a href="${link}?preparationBeforeVersion=${result.history.nextBeforeVersion}#application-interview">更早版本</a>` : ""}<p><a href="${link}#application-interview">查看最新稿</a></p></details>${handoff}</section>`;
}
