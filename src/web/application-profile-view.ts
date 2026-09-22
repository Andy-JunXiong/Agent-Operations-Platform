import { jobDescriptionKind } from "../domain/application-profile.js";

export function jobDescriptionPresentation(profile: Parameters<typeof jobDescriptionKind>[0]) {
  const kind = jobDescriptionKind(profile);
  const labels = {
    FULL_TEXT: { title: "职位描述 · JD", label: "已记录完整 JD" },
    SUMMARY: { title: "岗位要求摘要", label: "仅有要求摘要，完整 JD 待补充" },
    UNKNOWN: { title: "已保存岗位资料", label: "完整性待确认" },
    MISSING: { title: "职位描述 · JD", label: "待补充" },
  };
  return { kind, complete: kind === "FULL_TEXT", ...labels[kind] };
}
