import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { useWorkflow } from "@/context/WorkflowContext";
import { PageHeader, Section, ErrorState } from "@/components/common/PageHeader";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { SurakshaMap } from "@/components/map/SurakshaMap";
import { MapLegend } from "@/components/map/MapControls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, HAZARD_LABELS, TONE_HEX, toneFromScore10 } from "@/lib/format";

export default function RedZones() {
  const navigate = useNavigate();
  const { setSelectedHabId } = useWorkflow();
  const [lens, setLens] = useState("composite");
  const [districtFilter, setDistrictFilter] = useState(null);
  const geo = useFetch(() => api.geoDistricts(), []);
  const districts = useFetch(() => api.districts(), []);
  const habs = useFetch(() => api.habitations(), []);
  const hazardTypes = useFetch(() => api.hazardTypes(), []);

  const redHabs = useMemo(() => {
    const list = (habs.data?.habitations || []).filter((h) => h.risk_level === "RED ZONE" || h.risk_level === "HIGH RISK");
    return districtFilter ? list.filter((h) => h.district_id === districtFilter) : list;
  }, [habs.data, districtFilter]);

  const open = (h) => {
    setSelectedHabId(h.id);
    navigate(`/command-center?hab=${h.id}`);
  };

  return (
    <div className="p-4">
      <PageHeader eyebrow="Red-zone identification" title="Red zones - districts and habitations" description="District classification is derived from ASDMA flood bulletins (illustrative, not an official red-zone declaration). Habitation-level red zones are computed by the prototype composite hazard × exposure model. Switch the hazard lens to see which hazard drives each area." />

      <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr]">
        <Section
          title="Red-zone map"
          aside={
            <div className="w-56">
              <Select value={lens} onValueChange={setLens}>
                <SelectTrigger className="h-7 text-xs" data-testid="redzones-lens-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composite">Composite red-zone score</SelectItem>
                  {(hazardTypes.data?.hazard_types || []).map((h) => (
                    <SelectItem key={h.id} value={h.id} disabled={h.id === "coastal_erosion"}>
                      {HAZARD_LABELS[h.id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <div className="relative h-[440px] overflow-hidden rounded-md">
            {geo.error ? <ErrorState error={geo.error} onRetry={geo.reload} /> : <SurakshaMap geojson={geo.data} lens={lens} habitations={redHabs} onSelectHabitation={open} sites={[]} layers={{ districts: true, habitations: true, buffers: true, sites: false, infrastructure: false, routes: false, reports: false }} basemap="dark" onDistrictClick={(p) => setDistrictFilter((d) => (d === p.suraksha_id ? null : p.suraksha_id))} zoom={7} />}
            <div className="absolute bottom-3 left-3 z-[1000]">
              <MapLegend lens={lens} showSites={false} />
            </div>
          </div>
        </Section>

        <Section title="District classification (ASDMA-derived)" aside={<DemoLabel text="Illustrative classification" />}>
          <div className="overflow-x-auto">
            <table className="w-full dense-table" data-testid="redzones-district-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Category</th>
                  <th className="text-right">Severity</th>
                  <th className="text-right">Events 5y</th>
                  <th className="text-right">Affected</th>
                  <th className="text-right">Deaths</th>
                  <th className="text-right">Red-zone hab.</th>
                  <th>Dominant hazards</th>
                </tr>
              </thead>
              <tbody>
                {(districts.data?.districts || []).map((d) => {
                  const top = Object.entries(d.hazard_avg || {})
                    .filter(([, v]) => v !== null)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                  return (
                    <tr key={d.id} className={`cursor-pointer ${districtFilter === d.id ? "bg-primary/10" : ""}`} onClick={() => setDistrictFilter((x) => (x === d.id ? null : d.id))} data-testid={`redzones-district-row-${d.id}`}>
                      <td>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-[10px] text-foreground/45">{d.hazard_profile_label}</div>
                      </td>
                      <td>
                        <StatusChip kind="category" value={d.risk_category} />
                        {d.risk_note && <div className="text-[10px] text-foreground/45">{d.risk_note}</div>}
                      </td>
                      <td className="text-right font-mono text-xs">{d.avg_severity_index.toFixed(2)}</td>
                      <td className="text-right font-mono text-xs">{d.flood_events_5yr}</td>
                      <td className="text-right font-mono text-xs">{fmt(d.total_affected)}</td>
                      <td className="text-right font-mono text-xs">{d.deaths}</td>
                      <td className="text-right font-mono text-xs">
                        <span className={d.red_zone_count ? "text-critical" : ""}>{d.red_zone_count}</span> / {d.habitation_count}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {top.map(([hz, v]) => (
                            <span key={hz} className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_HEX[toneFromScore10(v)] }} />
                              {HAZARD_LABELS[hz]} {v}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {d_geo_note(districts.data)}
        </Section>
      </div>

      <Section className="mt-3" title={`Red-zone & high-risk habitations${districtFilter ? " - filtered" : ""}`} aside={districtFilter && <button className="text-[11px] underline" onClick={() => setDistrictFilter(null)}>clear filter</button>}>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" data-testid="redzone-habitation-cards">
          {redHabs.map((h) => (
            <div key={h.id} className="rounded-md border border-border/60 p-3" style={{ boxShadow: `inset 3px 0 0 ${TONE_HEX[h.risk_level === "RED ZONE" ? "critical" : "high"]}` }} data-testid={`redzone-card-${h.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-[11px] text-foreground/55">
                    {h.district} · {fmt(h.population_exposed)} exposed of {fmt(h.population)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-semibold leading-none">{h.risk_score}</div>
                  <div className="text-[10px] text-foreground/45">/100</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusChip kind="risk" value={h.risk_level} />
                <StatusChip kind="priority" value={h.priority_class} />
                <span className="text-[10px] text-foreground/55">dominant {HAZARD_LABELS[h.dominant_hazard]} {h.hazard_subscores[h.dominant_hazard]}</span>
              </div>
              <button onClick={() => open(h)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline" data-testid={`redzone-open-${h.id}`}>
                Open in command center <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
          {redHabs.length === 0 && <div className="text-xs text-foreground/50">No red-zone habitations for this filter.</div>}
        </div>
      </Section>
    </div>
  );
}

function d_geo_note(data) {
  const notes = (data?.districts || []).filter((d) => d.geo_note);
  if (!notes.length) return null;
  return (
    <div className="mt-2 text-[10px] text-foreground/45">
      {notes.map((d) => (
        <div key={d.id}>
          {d.name}: {d.geo_note}
        </div>
      ))}
    </div>
  );
}
