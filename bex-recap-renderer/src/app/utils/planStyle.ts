export type BexPlanKey = "free" | "basic" | "pro" | "vip_auto" | "lifetime" | string;

export function normalizePlan(plan?: string | null): BexPlanKey {
  const p = String(plan || "free").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  if (p === "vip" || p === "vipauto" || p === "vip_auto" || p === "lifetime") return "vip_auto";
  if (p === "pro") return "pro";
  if (p === "basic") return "basic";
  return "free";
}

export function getPlanLabel(plan?: string | null): string {
  const p = normalizePlan(plan);
  if (p === "vip_auto") return "VIP Auto";
  if (p === "pro") return "Pro";
  if (p === "basic") return "Basic";
  return "Free";
}

export function getPlanBadgeClass(plan?: string | null): string {
  const p = normalizePlan(plan);
  if (p === "vip_auto") return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black border border-yellow-300 shadow-yellow-500/25";
  if (p === "pro") return "bg-gradient-to-r from-blue-500 to-emerald-500 text-white border border-emerald-300/60 shadow-emerald-500/20";
  if (p === "basic") return "bg-gradient-to-r from-emerald-600 to-emerald-800 text-white border border-emerald-400/50 shadow-emerald-500/20";
  return "bg-gradient-to-r from-sky-500 to-blue-700 text-white border border-sky-300/50 shadow-sky-500/20";
}

export function getPlanDotClass(plan?: string | null): string {
  const p = normalizePlan(plan);
  if (p === "vip_auto") return "bg-yellow-400";
  if (p === "pro") return "bg-emerald-400";
  if (p === "basic") return "bg-emerald-600";
  return "bg-sky-400";
}
