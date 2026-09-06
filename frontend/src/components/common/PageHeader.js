import { DemoLabel } from "@/components/common/StatusChip";

export const PageHeader = ({ eyebrow, title, description, actions, demo = true }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
    <div>
      {eyebrow && <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50">{eyebrow}</div>}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {demo && <DemoLabel />}
      </div>
      {description && <p className="mt-1 max-w-3xl text-sm text-foreground/65">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const Section = ({ title, aside, children, className = "", testId }) => (
  <section className={`panel-surface ${className}`} data-testid={testId}>
    {(title || aside) && (
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-foreground/75">{title}</h2>
        {aside}
      </div>
    )}
    <div className="p-3">{children}</div>
  </section>
);

export const Stat = ({ label, value, sub, tone, mono = true, testId }) => (
  <div className="rounded-md border border-border/60 bg-white/[0.02] px-3 py-2" data-testid={testId}>
    <div className="text-[10px] uppercase tracking-wider text-foreground/55">{label}</div>
    <div className={`${mono ? "font-mono tabular-nums" : ""} text-lg font-semibold ${tone ? `text-${tone}` : ""}`}>{value}</div>
    {sub && <div className="text-[11px] text-foreground/55">{sub}</div>}
  </div>
);

export const EmptyState = ({ title, body, action }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 px-6 py-10 text-center">
    <div className="text-sm font-medium">{title}</div>
    {body && <div className="mt-1 max-w-md text-xs text-foreground/60">{body}</div>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="rounded-lg border border-status-critical/40 bg-status-critical/10 px-4 py-3 text-sm">
    <div className="font-medium text-critical">Could not load data</div>
    <div className="text-xs text-foreground/70 mt-0.5">{String(error)}</div>
    {onRetry && (
      <button onClick={onRetry} className="mt-2 text-xs underline text-foreground/80" data-testid="retry-button">
        Retry
      </button>
    )}
  </div>
);
