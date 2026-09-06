import { RISK_TONE, PRIORITY_TONE, SITE_TONE, ALERT_TONE, CATEGORY_TONE } from "@/lib/format";

const MAPS = { risk: RISK_TONE, priority: PRIORITY_TONE, site: SITE_TONE, alert: ALERT_TONE, category: CATEGORY_TONE };

export const StatusChip = ({ kind = "risk", value, tone, className = "", testId, children }) => {
  const t = tone || MAPS[kind]?.[value] || "muted";
  return (
    <span className={`chip chip-${t} ${className}`} data-testid={testId || `${kind}-chip`}>
      {children || value}
    </span>
  );
};

export const DemoLabel = ({ text = "Prototype / Illustrative", className = "" }) => (
  <span className={`demo-label ${className}`} title="Simulated / derived value for prototype demonstration">
    {text}
  </span>
);

export const Dot = ({ tone = "neutral", className = "" }) => <span className={`inline-block h-2 w-2 rounded-full bg-${tone} ${className}`} />;
