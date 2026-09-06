import { useNavigate } from "react-router-dom";
import { ArrowRight, Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { ContributionBars } from "@/components/common/ContributionBars";
import { useWorkflow } from "@/context/WorkflowContext";
import { fmt, pct, coord, HAZARD_LABELS, toneFromScore10 } from "@/lib/format";
import { hazardSvg } from "@/components/map/mapIcons";

const Row = ({ k, v, mono }) => (
  <div className="flex items-baseline justify-between gap-2 py-1 border-b border-border/40 last:border-0">
    <span className="text-xs text-foreground/60">{k}</span>
    <span className={`text-xs text-right ${mono ? "font-mono tabular-nums" : ""}`}>{v}</span>
  </div>
);

export const HabitationIntelPanel = ({ detail, loading, onClose, onZoom }) => {
  const navigate = useNavigate();
  const { setSelectedHabId } = useWorkflow();

  if (loading || !detail) {
    return (
      <div className="p-3 space-y-3 animate-pulse">
        <div className="h-6 w-2/3 rounded bg-white/10" />
        <div className="h-20 rounded bg-white/5" />
        <div className="h-40 rounded bg-white/5" />
      </div>
    );
  }

  const hazardRows = Object.entries(detail.hazard_subscores)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([hz, v]) => ({ label: HAZARD_LABELS[hz] || hz, score: v, weight: detail.hazard_weights?.[hz], contribution: (detail.hazard_weights?.[hz] || 0) * v * 10 }))
    .sort((a, b) => b.contribution - a.contribution);

  const gis = detail.gis_layers;
  const layerRows = [
    ...Object.values(gis),
    { label: "Population exposure", display: `${pct(detail.exposed_pct)} of ${fmt(detail.population)} · ${fmt(detail.gis.population_density_per_km2)}/km²`, score: detail.risk_factors.find((f) => f.factor === "population_exposure")?.score, weight: null, source: "Census 2011 + OSM footprints", multiplier: true },
  ];

  const assess = () => {
    setSelectedHabId(detail.id);
    navigate(`/workflow/${detail.id}/priority`);
  };

  return (
    <div className="flex h-full flex-col" data-testid="habitation-intel-panel">
      <div className="border-b border-border/70 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/50">Selected habitation</div>
            <h2 className="truncate text-base font-semibold" data-testid="intel-habitation-name">{detail.name}</h2>
            <div className="text-xs text-foreground/65">
              {detail.block} block · {detail.district} district
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-foreground/50">{coord(detail.lat, detail.lon)}</div>
          </div>
          <div className="flex items-center gap-1">
            {onZoom && (
              <button onClick={onZoom} className="rounded-md border border-border/70 p-1.5 hover:bg-white/5" title="Zoom to location" data-testid="intel-zoom-button">
                <Crosshair className="h-3.5 w-3.5" />
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="rounded-md border border-border/70 p-1.5 hover:bg-white/5" title="Close" data-testid="intel-close-button">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-md border border-border/60 bg-white/[0.03] p-2.5" data-testid="risk-score-badge">
          <div className="flex h-12 w-14 flex-col items-center justify-center rounded-md" style={{ background: `hsl(var(--status-${toneFromScore10(detail.risk_score / 10)}) / 0.16)`, boxShadow: `inset 0 0 0 1px hsl(var(--status-${toneFromScore10(detail.risk_score / 10)}) / 0.5)` }}>
            <span className={`font-mono text-xl font-semibold leading-none text-${toneFromScore10(detail.risk_score / 10)}`}>{detail.risk_score}</span>
            <span className="text-[9px] text-foreground/60">/100</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusChip kind="risk" value={detail.risk_level} testId="intel-risk-level-chip" />
              <StatusChip kind="priority" value={detail.priority_class} testId="relocation-priority-chip" />
            </div>
            <div className="mt-1 text-[10px] text-foreground/55">{detail.labels.classification}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wider text-foreground/55">Population</div>
            <div className="font-mono text-base font-semibold" data-testid="intel-population">{fmt(detail.population)}</div>
            <div className="text-[10px] text-foreground/50">{fmt(detail.households)} households</div>
          </div>
          <div className="rounded-md border border-border/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wider text-foreground/55">Exposed</div>
            <div className="font-mono text-base font-semibold text-high" data-testid="intel-population-exposed">{fmt(detail.population_exposed)}</div>
            <div className="text-[10px] text-foreground/50">{pct(detail.exposed_pct)} inside hazard extent</div>
          </div>
          <div className="rounded-md border border-border/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wider text-foreground/55">Historical hazard</div>
            <div className="font-mono text-base font-semibold">{detail.gis.years_flooded_5yr}/5 yrs</div>
            <div className="text-[10px] text-foreground/50">{detail.history.embankment_breaches_5yr} embankment breaches</div>
          </div>
          <div className="rounded-md border border-border/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wider text-foreground/55">Infrastructure exposure</div>
            <div className="font-mono text-base font-semibold">{detail.infrastructure_risk}/10</div>
            <div className="text-[10px] text-foreground/50 truncate">{detail.infra.road_label}</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground/75">Why this location is high risk</h3>
            <DemoLabel text="Prototype model" />
          </div>
          <Tabs defaultValue="factors">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="factors" className="text-xs" data-testid="intel-tab-factors">
                Generic factors
              </TabsTrigger>
              <TabsTrigger value="hazards" className="text-xs" data-testid="intel-tab-hazards">
                Hazard breakdown
              </TabsTrigger>
            </TabsList>
            <TabsContent value="factors" className="mt-3">
              <ContributionBars rows={detail.risk_factors} max={50} testId="intel-risk-factors" />
              <div className="mt-2 text-[10px] text-foreground/50">Risk score = Σ weight × factor(0-10) × 10. Weights: hazard 50 · exposure 25 · history 15 · infrastructure 10.</div>
            </TabsContent>
            <TabsContent value="hazards" className="mt-3">
              <div className="space-y-2" data-testid="intel-hazard-breakdown">
                {hazardRows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2">
                    <span className="text-foreground/70" dangerouslySetInnerHTML={{ __html: hazardSvg(Object.keys(HAZARD_LABELS).find((k) => HAZARD_LABELS[k] === r.label), 14) }} />
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>{r.label}</span>
                        <span className="font-mono text-[10px] text-foreground/50">w {Math.round((r.weight || 0) * 100)}%</span>
                      </div>
                      <div className="bar-track mt-1">
                        <div className="bar-fill" style={{ width: `${r.score * 10}%`, background: `hsl(var(--status-${toneFromScore10(r.score)}))` }} />
                      </div>
                    </div>
                    <span className="font-mono text-xs tabular-nums">{r.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-foreground/50">
                Composite hazard {detail.hazard_composite}/10 · profile: {detail.hazard_profile.replace("_", " ")} · dominant: {HAZARD_LABELS[detail.dominant_hazard]}. Non-flood layers are illustrative; coastal erosion n/a inland.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground/75">GIS input layers (flood overlay)</h3>
            <DemoLabel text="Representative values" />
          </div>
          <table className="w-full dense-table text-xs" data-testid="intel-gis-layers-table">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Value</th>
                <th className="text-right">Score</th>
                <th className="text-right">W</th>
              </tr>
            </thead>
            <tbody>
              {layerRows.map((l) => (
                <tr key={l.label}>
                  <td className="!py-1.5">
                    <div className="text-xs">{l.label}</div>
                    <div className="text-[10px] text-foreground/45">{l.source}</div>
                  </td>
                  <td className="!py-1.5 font-mono text-[11px] text-foreground/80">{l.display}</td>
                  <td className="!py-1.5 text-right font-mono text-[11px]">
                    <span className={`text-${toneFromScore10(l.score)}`}>{Number(l.score).toFixed(1)}</span>
                  </td>
                  <td className="!py-1.5 text-right font-mono text-[10px] text-foreground/55">{l.multiplier ? "×" : `${Math.round(l.weight * 100)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1.5 text-[10px] text-foreground/50">Weighted overlay → flood sub-score {detail.hazard_subscores.flood}/10. Population exposure is applied as a separate factor: an empty low-lying field is a hazard zone but not a relocation priority.</div>
        </div>

        <div className="rounded-md border border-border/60 p-2.5">
          <Row k="Vulnerability index" v={`${detail.vulnerability_score}/10`} mono />
          <Row k="Kutcha housing" v={`${detail.social.kutcha_housing_pct}%`} mono />
          <Row k="Children / elderly / PwD" v={`${detail.social.vulnerable_groups_pct}%`} mono />
          <Row k="Nearest hospital" v={`${detail.infra.hospital_distance_km} km`} mono />
          <Row k="Dominant hazard" v={HAZARD_LABELS[detail.dominant_hazard]} />
        </div>
        {detail.notes && <p className="text-[11px] leading-snug text-foreground/60">{detail.notes}</p>}
      </div>

      <div className="border-t border-border/70 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground/60">Relocation priority</span>
          <span className="font-mono">
            {detail.priority_score}/100 · <StatusChip kind="priority" value={detail.priority_class} />
          </span>
        </div>
        <Button className="w-full" onClick={assess} data-testid="habitation-intel-assess-relocation-button">
          Assess Relocation <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
