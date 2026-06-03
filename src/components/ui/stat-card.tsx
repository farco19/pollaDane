import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <div className="panel rounded-2xl p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
        </div>
        <div className="rounded-xl border border-primary/12 bg-primary/8 p-3 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
