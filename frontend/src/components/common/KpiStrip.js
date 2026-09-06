import { fmt } from "@/lib/format";

const tiles = (k) => [
  { id: "kpi-critical-red-zones", label: "Critical red zones", value: k.critical_red_zones, meta: `of ${k.assessed_habitations} habitations`, tone: "critical" },
  { id: "kpi-high-risk-habitations", label: "High-risk habitations", value: k.high_risk_habitations, meta: "RED + HIGH", tone: "high" },
  { id: "kpi-population-at-risk", label: "Population at risk", value: fmt(k.population_at_risk), meta: "exposed in RED + HIGH", tone: "high" },
  { id: "kpi-relocation-immediate", label: "Relocation priority", value: k.relocation_priority_immediate, meta: `IMMEDIATE - ${fmt(k.population_requiring_relocation_immediate)} people`, tone: "critical" },
  { id: "kpi-available-safe-capacity", label: "Available safe capacity", value: fmt(k.available_safe_capacity), meta: `${fmt(k.unsafe_capacity_excluded)} unsafe places excluded`, tone: "safe" },
  { id: "kpi-capacity-deficit", label: "Capacity deficit", value: fmt(k.capacity_deficit), meta: "IMMEDIATE need vs safe capacity", tone: k.capacity_deficit > 0 ? "critical" : "safe" },
];

export const KpiStrip = ({ kpis, loading }) => {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-tile h-[68px] animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2" data-testid="kpi-strip">
      {tiles(kpis).map((t) => (
        <div key={t.id} className="kpi-tile relative overflow-hidden" data-testid={t.id}>
          <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-${t.tone}`} />
          <div className="pl-2">
            <div className="text-[11px] uppercase tracking-wider text-foreground/60">{t.label}</div>
            <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums tracking-tight">{t.value}</div>
            <div className="text-[11px] text-foreground/50 truncate">{t.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
