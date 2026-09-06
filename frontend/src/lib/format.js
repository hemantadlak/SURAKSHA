export const fmt = (n) => (n === null || n === undefined ? "-" : Number(n).toLocaleString("en-IN"));
export const pct = (v, d = 0) => (v === null || v === undefined ? "-" : `${(Number(v) * 100).toFixed(d)}%`);
export const coord = (lat, lon) => `${Number(lat).toFixed(4)}N ${Number(lon).toFixed(4)}E`;
export const ts = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16) + "Z";
};

export const RISK_TONE = { "RED ZONE": "critical", "HIGH RISK": "high", WATCH: "watch", SAFER: "safe" };
export const PRIORITY_TONE = { IMMEDIATE: "critical", "SHORT-TERM": "high", "MEDIUM-TERM": "watch", MONITOR: "safe" };
export const SITE_TONE = { RECOMMENDED: "safe", CONDITIONAL: "watch", REJECTED: "critical" };
export const ALERT_TONE = { CRITICAL: "critical", HIGH: "high", WATCH: "watch", INFORMATION: "neutral" };
export const CATEGORY_TONE = { Critical: "critical", "Very High": "critical", High: "high", Moderate: "watch", Low: "safe", "Not assessed": "muted" };

export const TONE_HEX = {
  critical: "#e04b4b",
  high: "#f7772a",
  watch: "#f2c227",
  safe: "#38a169",
  neutral: "#3b8ff0",
  muted: "#6b7280",
};

export const toneFromScore10 = (s) => (s === null || s === undefined ? "muted" : s >= 7 ? "critical" : s >= 5 ? "high" : s >= 3 ? "watch" : "safe");
export const toneFromScore100 = (s) => (s >= 70 ? "critical" : s >= 50 ? "high" : s >= 30 ? "watch" : "safe");

export const HAZARD_LABELS = {
  flood: "Flood",
  landslide: "Landslide",
  cloudburst: "Cloudburst",
  coastal_erosion: "Coastal erosion",
  cyclone: "Cyclone / Nor'wester",
  earthquake: "Earthquake",
  lightning: "Lightning",
  heatwave: "Heatwave",
  fire: "Fire",
};

export const WORKFLOW_STEPS = [
  { id: "priority", label: "Relocation Priority", short: "Priority" },
  { id: "sites", label: "Alternative Sites", short: "Sites" },
  { id: "capacity", label: "Carrying Capacity", short: "Capacity" },
  { id: "plan", label: "Relocation Plan", short: "Plan" },
  { id: "route", label: "Safe Route", short: "Route" },
  { id: "action", label: "Action Plan", short: "Action" },
];
