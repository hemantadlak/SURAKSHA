import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { PageHeader, Section, ErrorState } from "@/components/common/PageHeader";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { fmt, HAZARD_LABELS } from "@/lib/format";
import { hazardSvg } from "@/components/map/mapIcons";

export default function HazardIntelligence() {
  const districts = useFetch(() => api.districts(), []);
  const severity = useFetch(() => api.severityComponents(), []);
  const types = useFetch(() => api.hazardTypes(), []);
  const config = useFetch(() => api.hazardConfig(), []);
  const kpis = useFetch(() => api.kpis(), []);
  const [profiles, setProfiles] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.data) setProfiles(JSON.parse(JSON.stringify(config.data.profiles)));
  }, [config.data]);

  const setWeight = (pid, hz, v) => setProfiles((p) => ({ ...p, [pid]: { ...p[pid], weights: { ...p[pid].weights, [hz]: v / 100 } } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.updateHazardConfig(profiles);
      setProfiles(res.profiles);
      toast.success("Hazard weights saved and normalised. All scores recomputed.");
      kpis.reload();
      districts.reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save weights");
    } finally {
      setSaving(false);
    }
  };
  const reset = async () => {
    const res = await api.resetHazardConfig();
    setProfiles(res.profiles);
    toast.success("Weights reset to defaults");
    kpis.reload();
    districts.reload();
  };

  return (
    <div className="p-4 space-y-3">
      <PageHeader eyebrow="Hazard intelligence" title="Multi-hazard data, severity index and model configuration" description="Flood is the anchor hazard with ASDMA-derived seed data. Other hazard layers carry illustrative indicators. The composite red-zone score is a visible, configurable weighted overlay - not an official government formula." />

      <div className="grid gap-3 xl:grid-cols-2">
        <Section title="ASDMA-derived district seed table" aside={<DemoLabel text="Derived, illustrative classification" />} testId="hazard-intelligence-district-table">
          {districts.error && <ErrorState error={districts.error} onRetry={districts.reload} />}
          <div className="overflow-x-auto">
            <table className="w-full dense-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th className="text-right">Flood events (5 yr)</th>
                  <th className="text-right">Total affected</th>
                  <th className="text-right">Deaths</th>
                  <th className="text-right">Deaths / 100k</th>
                  <th className="text-right">Avg severity</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {(districts.data?.districts || []).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-[10px] text-foreground/45">Rivers: {d.major_rivers.join(", ")}</div>
                    </td>
                    <td className="text-right font-mono text-xs">{d.flood_events_5yr}</td>
                    <td className="text-right font-mono text-xs">{fmt(d.total_affected)}</td>
                    <td className="text-right font-mono text-xs">{d.deaths}</td>
                    <td className="text-right font-mono text-xs">{d.deaths_per_100k_affected}</td>
                    <td className="text-right font-mono text-xs">{d.avg_severity_index.toFixed(2)}</td>
                    <td>
                      <StatusChip kind="category" value={d.risk_category} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-foreground/50">{districts.data?.meta?.source}</p>
          <p className="mt-1 text-[10px] text-foreground/50">Risk category thresholds: Critical ≥ 9.0 · Very High ≥ 7.0 · High ≥ 5.0 · Moderate ≥ 3.0. Tamulpur is carried as Critical in the seed table (high fatality ratio relative to affected population).</p>
        </Section>

        <Section title="Flood severity index - bulletin snapshot components" aside={<DemoLabel text="Prototype model" />}>
          {severity.data && (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] text-foreground/60">
                {Object.entries(severity.data.weights).map(([k, w]) => (
                  <span key={k} className="rounded bg-white/5 px-1.5 py-0.5">
                    {k.replace(/_/g, " ")} {Math.round(w * 100)}%
                  </span>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full dense-table">
                  <thead>
                    <tr>
                      <th>District</th>
                      <th>Report date</th>
                      <th className="text-right">Affected</th>
                      <th className="text-right">Deaths</th>
                      <th className="text-right">Displaced</th>
                      <th className="text-right">Camps</th>
                      <th className="text-right">Sheltered</th>
                      <th className="text-right">Livestock</th>
                      <th className="text-right">Cropland ha</th>
                      <th className="text-right">Breaches</th>
                      <th className="text-right">Snapshot idx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {severity.data.rows.map((r) => (
                      <tr key={`${r.district}-${r.report_date}`}>
                        <td className="font-medium">{r.district}</td>
                        <td className="font-mono text-xs">{r.report_date}</td>
                        <td className="text-right font-mono text-xs">{fmt(r.affected_population)}</td>
                        <td className="text-right font-mono text-xs">{r.deaths}</td>
                        <td className="text-right font-mono text-xs">{fmt(r.displaced_population)}</td>
                        <td className="text-right font-mono text-xs">{r.relief_camps_operational}</td>
                        <td className="text-right font-mono text-xs">{fmt(r.people_sheltered)}</td>
                        <td className="text-right font-mono text-xs">{fmt(r.livestock_affected)}</td>
                        <td className="text-right font-mono text-xs">{fmt(r.cropland_submerged_hectares)}</td>
                        <td className="text-right font-mono text-xs">{r.embankment_breaches}</td>
                        <td className="text-right font-mono text-xs font-semibold">{r.snapshot_severity_index}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-foreground/50">{severity.data.note}</p>
            </>
          )}
        </Section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
        <Section title="Hazard layers and data status">
          <table className="w-full dense-table" data-testid="hazard-types-table">
            <thead>
              <tr>
                <th>Hazard</th>
                <th>Representative source</th>
                <th>Data status</th>
              </tr>
            </thead>
            <tbody>
              {(types.data?.hazard_types || []).map((h) => (
                <tr key={h.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/70" dangerouslySetInnerHTML={{ __html: hazardSvg(h.id, 14) }} />
                      <div>
                        <div>{h.label}</div>
                        <div className="text-[10px] text-foreground/45">{h.indicators}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-foreground/70">{h.source}</td>
                  <td>
                    <span className={`chip ${h.data_status.startsWith("Seed") ? "chip-neutral" : h.data_status.startsWith("Not") ? "chip-muted" : "chip-watch"}`}>{h.data_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section
          title="Composite red-zone weights (configurable)"
          aside={
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={reset} data-testid="hazard-weights-reset-button">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button size="sm" onClick={save} disabled={saving || !profiles} data-testid="hazard-weights-save-button">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save & recompute"}
              </Button>
            </div>
          }
          testId="hazard-weights-section"
        >
          <p className="mb-3 text-[11px] text-foreground/60">Each district uses a regional hazard profile. Composite hazard = Σ weight × sub-score. Saved weights are normalised to sum to 100% and every habitation score, KPI and alert is recomputed from them.</p>
          {profiles && (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(profiles).map(([pid, p]) => {
                const total = Object.values(p.weights).reduce((a, b) => a + b, 0);
                return (
                  <div key={pid} className="rounded-md border border-border/60 p-3" data-testid={`hazard-profile-${pid}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="font-mono text-[11px] text-foreground/55">Σ {Math.round(total * 100)}%</div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {Object.entries(p.weights).map(([hz, w]) => (
                        <div key={hz} className="grid grid-cols-[110px_1fr_40px] items-center gap-2">
                          <span className="text-xs text-foreground/80 truncate">{HAZARD_LABELS[hz]}</span>
                          <Slider value={[Math.round(w * 100)]} max={100} step={1} onValueChange={([v]) => setWeight(pid, hz, v)} disabled={hz === "coastal_erosion"} data-testid={`weight-slider-${pid}-${hz}`} />
                          <span className="text-right font-mono text-xs">{Math.round(w * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {kpis.data && (
            <div className="mt-3 flex flex-wrap gap-3 rounded-md border border-border/60 bg-white/[0.02] px-3 py-2 text-xs" data-testid="hazard-config-kpis">
              <span>
                Red zones: <span className="font-mono font-semibold text-critical">{kpis.data.critical_red_zones}</span>
              </span>
              <span>
                High-risk: <span className="font-mono font-semibold">{kpis.data.high_risk_habitations}</span>
              </span>
              <span>
                IMMEDIATE: <span className="font-mono font-semibold">{kpis.data.relocation_priority_immediate}</span>
              </span>
              <span>
                Population at risk: <span className="font-mono font-semibold">{fmt(kpis.data.population_at_risk)}</span>
              </span>
            </div>
          )}
        </Section>
      </div>

      {config.data && (
        <Section title="Model weights and thresholds (read-only reference)" aside={<DemoLabel text="Prototype scoring model" />}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-xs">
            <WeightList title="Flood GIS overlay" weights={config.data.gis_layer_weights} labels={Object.fromEntries(Object.entries(config.data.gis_layer_meta).map(([k, v]) => [k, v.label]))} />
            <WeightList title="Risk score (0-100)" weights={config.data.risk_weights} />
            <WeightList title="Relocation priority" weights={config.data.priority_weights} />
            <WeightList title="Site suitability" weights={config.data.suitability_weights} />
            <WeightList title="Vulnerability" weights={config.data.vulnerability_weights} />
            <WeightList title="Site inundation exposure" weights={config.data.site_exposure_weights} />
            <WeightList title="Route selection cost" weights={config.data.route_weights} />
            <div className="rounded-md border border-border/60 p-2.5">
              <div className="mb-1 font-medium text-foreground/85">Thresholds</div>
              <div className="space-y-0.5 text-foreground/70">
                <div>Risk: RED ≥ 70 · HIGH ≥ 50 · WATCH ≥ 30</div>
                <div>Priority: IMMEDIATE ≥ 70 · SHORT ≥ 55 · MEDIUM ≥ 40</div>
                <div>Site unsafe if exposure ≥ {config.data.thresholds.site_unsafe_exposure}/10</div>
                <div>Site not habitable if infra &lt; {config.data.thresholds.site_min_infra}/10</div>
                <div>Planning radius {config.data.thresholds.site_max_distance_km} km · search {config.data.thresholds.site_search_radius_km} km</div>
                <div>Suitability: RECOMMENDED ≥ {config.data.thresholds.suitability.recommended} · CONDITIONAL ≥ {config.data.thresholds.suitability.conditional}</div>
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

const WeightList = ({ title, weights, labels = {} }) => (
  <div className="rounded-md border border-border/60 p-2.5">
    <div className="mb-1 font-medium text-foreground/85">{title}</div>
    <div className="space-y-0.5">
      {Object.entries(weights).map(([k, w]) => (
        <div key={k} className="flex justify-between text-foreground/70">
          <span>{labels[k] || k.replace(/_/g, " ")}</span>
          <span className="font-mono">{Math.round(w * 100)}%</span>
        </div>
      ))}
    </div>
  </div>
);
