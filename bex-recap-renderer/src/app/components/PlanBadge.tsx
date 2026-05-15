import { getPlanBadgeClass, getPlanLabel } from "../utils/planStyle";

type PlanBadgeProps = {
  plan?: string | null;
  className?: string;
};

export function PlanBadge({ plan, className = "" }: PlanBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase leading-none shadow-lg ${getPlanBadgeClass(plan)} ${className}`}>
      {getPlanLabel(plan)}
    </span>
  );
}
