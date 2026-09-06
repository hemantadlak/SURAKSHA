import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MousePointerClick } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { useWorkflow } from "@/context/WorkflowContext";
import { KpiStrip } from "@/components/common/KpiStrip";
import { SurakshaMap } from "@/components/map/SurakshaMap";
import { MapControls, MapLegend } from "@/components/map/MapControls";
import { HabitationIntelPanel } from "@/components/panels/HabitationIntelPanel";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { ErrorState } from "@/components/common/PageHeader";
import { fmt } from "@/lib/format";

const DEFAULT_LAYERS = { districts: true, habitations: true, buffers: true, sites: true, infrastructure: false, routes: true, reports: true };

export default function CommandCenter() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { selectedHabId, setSelectedHabId } = useWorkflow();
  const [basemap, setBasemap] = useState("streets");
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [lens, setLens] = useState("composite");
  const [focus, setFocus] = useState(null);
  const [districtFilter, setDistrictFilter] = useState(null);

  const kpis = useFetch(() => api.kpis(), []);
  const geo = useFetch(() => api.geoDistricts(), []);
  const habs = useFetch(() => api.habitations(), []);
  const sites = useFetch(() => api.allSites(), []);
  const infra = useFetch(() => api.infrastructure(), []);
  const reports = useFetch(() => api.fieldReports(), []);
  const hazardTypes = useFetch(() => api.hazardTypes(), []);

  const habFromUrl = params.get("hab");
  const activeId = habFromUrl || selectedHabId;
  const detail = useFetch(() => api.habitation(activeId), [activeId], { enabled: Boolean(activeId) });

  useEffect(() => {
    if (habFromUrl && habFromUrl !== selectedHabId) setSelectedHabId(habFromUrl);
  }, [habFromUrl, selectedHabId, setSelectedHabId]);

  useEffect(() => {
    if (habFromUrl && detail.data && detail.data.id === habFromUrl) setFocus({ lat: detail.data.lat, lon: detail.data.lon, zoom: 10, key: habFromUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habFromUrl, detail.data?.id]);

  const select = (h) => {
    setSelectedHabId(h.id);
    setParams({ hab: h.id });
    setFocus({ lat: h.lat, lon: h.lon, zoom: 10, key: Date.now() });
  };

  const clear = () => {
    setSelectedHabId(null);
    setParams({});
  };

  const habList = useMemo(() => habs.data?.habitations || [], [habs.data]);
  const initialBounds = useMemo(() => {
    if (!habList.length) return null;
    const pts = habList.map((h) => [h.lat, h.lon]);
    (sites.data?.sites || []).forEach((s) => pts.push([s.lat, s.lon]));
    return pts;
  }, [habList, sites.data]);
  const visibleHabs = useMemo(() => (districtFilter ? habList.filter((h) => h.district_id === districtFilter) : habList), [habList, districtFilter]);
  const topPriority = useMemo(() => [...habList].sort((a, b) => a.priority_rank - b.priority_rank).slice(0, 6), [habList]);
  const districtName = useMemo(() => geo.data?.features?.find((f) => f.properties.suraksha_id === districtFilter)?.properties.display_name, [geo.data, districtFilter]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-3 py-2">
        <KpiStrip kpis={kpis.data} loading={kpis.loading} />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1" data-testid="command-center-map">
          {geo.error ? (
            <div className="p-4">
              <ErrorState error={geo.error} onRetry={geo.reload} />
            </div>
          ) : (
            <SurakshaMap
              geojson={geo.data}
              lens={lens}
              habitations={visibleHabs}
              selectedHabId={activeId}
              onSelectHabitation={select}
              sites={sites.data?.sites || []}
              infrastructure={infra.data?.facilities || []}
              reports={reports.data?.field_reports || []}
              layers={layers}
              basemap={basemap}
              focus={focus}
              bounds={habFromUrl ? null : initialBounds}
              fitKey={habFromUrl ? "none" : `init-${initialBounds ? initialBounds.length : 0}`}
              onDistrictClick={(p) => setDistrictFilter((d) => (d === p.suraksha_id ? null : p.suraksha_id))}
              className="h-full w-full"
            />
          )}

          <div className="absolute right-3 top-3 z-[1000] hidden lg:block">
            <MapControls basemap={basemap} setBasemap={setBasemap} layers={layers} setLayers={setLayers} lens={lens} setLens={setLens} hazardTypes={hazardTypes.data?.hazard_types || []} />
          </div>
          <div className="absolute bottom-6 left-3 z-[1000] hidden md:block">
            <MapLegend lens={lens} showSites={layers.sites} />
          </div>
          <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5">
            <div className="panel-surface bg-background/95 px-2.5 py-1.5 text-[11px] backdrop-blur">
              <span className="text-foreground/60">Assam · </span>
              <span className="font-mono">{kpis.data?.assessed_districts ?? 7}</span> <span className="text-foreground/60">districts assessed · </span>
              <span className="font-mono">{habList.length}</span> <span className="text-foreground/60">habitations</span>
              <DemoLabel className="ml-2" text="Derived from ASDMA bulletins" />
            </div>
            {districtFilter && (
              <button onClick={() => setDistrictFilter(null)} className="panel-surface bg-background/95 px-2.5 py-1.5 text-left text-[11px] backdrop-blur hover:bg-white/5" data-testid="district-filter-chip">
                Showing habitations in <span className="font-medium">{districtName}</span> · <span className="underline">clear</span>
              </button>
            )}
          </div>
        </div>

        <aside className="hidden w-[400px] shrink-0 border-l border-border/70 bg-background/95 lg:block" data-testid="intelligence-panel">
          {activeId ? (
            detail.error ? (
              <div className="p-3">
                <ErrorState error={detail.error} onRetry={detail.reload} />
              </div>
            ) : (
              <HabitationIntelPanel detail={detail.data} loading={detail.loading} onClose={clear} onZoom={() => detail.data && setFocus({ lat: detail.data.lat, lon: detail.data.lon, zoom: 12, key: Date.now() })} />
            )
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-border/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/50">Location intelligence</div>
                <h2 className="text-base font-semibold">Select a habitation</h2>
                <p className="mt-1 text-xs text-foreground/60 flex items-start gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5 mt-px shrink-0" /> Click a habitation marker on the map (or pick from the ranked list below) to see its risk score, exposure and the reasons it is prioritised.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground/75">Top relocation priorities</h3>
                  <button onClick={() => navigate("/habitations")} className="text-[11px] text-primary hover:underline" data-testid="view-all-habitations-link">
                    View all
                  </button>
                </div>
                <div className="space-y-1.5" data-testid="top-priority-list">
                  {topPriority.map((h) => (
                    <button key={h.id} onClick={() => select(h)} className="flex w-full items-center gap-2.5 rounded-md border border-border/60 px-2.5 py-2 text-left hover:bg-white/5 transition-colors" data-testid={`priority-list-item-${h.id}`}>
                      <span className="font-mono text-[11px] text-foreground/45 w-4">{h.priority_rank}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{h.name}</div>
                        <div className="text-[11px] text-foreground/55">
                          {h.district} · {fmt(h.population_exposed)} exposed
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusChip kind="risk" value={h.risk_level} />
                        <span className="font-mono text-[10px] text-foreground/60">{h.risk_score}/100</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-md border border-border/60 p-2.5 text-[11px] text-foreground/60 space-y-1">
                  <div className="font-medium text-foreground/80">How to read the map</div>
                  <div>District fill = ASDMA-derived flood risk category (or the selected hazard lens).</div>
                  <div>Square markers = habitations, coloured by prototype risk level; the badge icon shows the dominant hazard.</div>
                  <div>Circles = candidate relocation sites (dashed red = unsafe). Click a district to filter its habitations.</div>
                </div>
              </div>
              <div className="border-t border-border/70 p-3">
                <button onClick={() => topPriority[0] && select(topPriority[0])} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" data-testid="select-top-priority-button">
                  Open top priority habitation <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {activeId && (
        <div className="lg:hidden border-t border-border/70 bg-background max-h-[45vh] overflow-y-auto">
          <HabitationIntelPanel detail={detail.data} loading={detail.loading} onClose={clear} />
        </div>
      )}
    </div>
  );
}
