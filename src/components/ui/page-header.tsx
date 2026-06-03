interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-3">
      <p className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      </div>
    </div>
  );
}
