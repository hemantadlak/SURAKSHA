import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { useWorkflow } from "@/context/WorkflowContext";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { ErrorState } from "@/components/common/PageHeader";
import { SurakshaMap } from "@/components/map/SurakshaMap";
import { MapLegend } from "@/components/map/MapControls";
import { PriorityStep, SitesStep, CapacityStep } from "@/pages/workflow/StepsA";
import { PlanStep, RouteStep, ActionStep } from "@/pages/workflow/StepsB";
import { WORKFLOW_STEPS, fmt, coord } from "@/lib/format";

export default function Workflow() {
  const { habId, step } = useParams();
  const navigate = useNavigate();
  const { selectedHabId, setSelectedHabId, utilization, setUtilization, markStep, isStepDone } = useWorkflow();
  const [results, setResults] = useState({});
  const [mapRoutes, setMapRoutes] = useState([]);
  const [mapFocus, setMapFocus] = useState(null);

  useEffect(() => {
    if (habId && habId !== selectedHabId) setSelectedHabId(habId);
  }, [habId, selectedHabId, setSelectedHabId]);

  const detail = useFetch(() => api.habitation(habId), [habId]);
  const ranking = useFetch(() => api.sites(habId), [habId]);
  const geo = useFetch(() => api.geoDistricts(), []);

  const stepIndex = Math.max(0, WORKFLOW_STEPS.findIndex((s) => s.id === step));
  const current = WORKFLOW_STEPS[stepIndex] || WORKFLOW_STEPS[0];
  const goNext = () => {
    markStep(habId, current.id);
    const next = WORKFLOW_STEPS[stepIndex + 1];
    if (next) navigate(`/workflow/${habId}/${next.id}`);
  };
  const setResult = (key, value) => setResults((r) => ({ ...r, [`${habId}:${key}`]: value }));
  const getResult = (key) => results[`${habId}:${key}`];

  useEffect(() => {
    if (current.id !== "route") setMapRoutes([]);
  }, [current.id]);

  const hab = detail.data;
  const sites = useMemo(() => ranking.data?.sites || [], [ranking.data]);
  const mapSites = useMemo(() => sites.map((s) => ({ ...s })), [sites]);
  const bounds = useMemo(() => {
    if (!hab) return null;
    if (mapRoutes.length) {
      const pts = [];
      mapRoutes.forEach((r) => (r.geometry || []).forEach((p, i) => { if (i % 5 === 0) pts.push(p); }));
      pts.push([hab.lat, hab.lon]);
      return pts;
    }
    const pts = [[hab.lat, hab.lon], ...sites.filter((s) => s.status !== "REJECTED" || s.distance_km < 30).map((s) => [s.lat, s.lon])];
    return pts.length > 1 ? pts : null;
  }, [hab, sites, mapRoutes]);

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0 });
  }, [current.id]);

  const common = { habId, hab, ranking: ranking.data, utilization, setUtilization, goNext, setResult, getResult, setMapRoutes, setMapFocus, markStep: () => markStep(habId, current.id) };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link to={`/command-center?hab=${habId}`} className="rounded-md border border-border/70 p-1.5 hover:bg-white/5" title="Back to map" data-testid="workflow-back-to-map">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/50">Relocation workflow</div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold" data-testid="workflow-habitation-name">
                  {hab ? hab.name : "Loading..."}
                </h1>
                {hab && (
                  <>
                    <span className="text-xs text-foreground/60">
                      {hab.district} · {fmt(hab.population)} residents · {fmt(hab.population_exposed)} exposed
                    </span>
                    <StatusChip kind="risk" value={hab.risk_level} />
                    <span className="font-mono text-xs text-foreground/60">{hab.risk_score}/100</span>
                    <StatusChip kind="priority" value={hab.priority_class} />
                    <span className="hidden md:inline font-mono text-[10px] text-foreground/45">{coord(hab.lat, hab.lon)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DemoLabel text="Prototype decision support" />
            <Link to="/habitations" className="text-xs text-foreground/60 hover:text-foreground underline" data-testid="workflow-change-habitation">
              Change habitation
            </Link>
          </div>
        </div>

        <ol className="mt-2.5 grid grid-cols-3 gap-1.5 md:grid-cols-6" data-testid="relocation-stepper">
          {WORKFLOW_STEPS.map((s, i) => {
            const done = isStepDone(habId, s.id);
            const active = s.id === current.id;
            return (
              <li key={s.id}>
                <Link to={`/workflow/${habId}/${s.id}`} className={`step-link ${active ? "step-link-active" : ""} ${done ? "step-link-done" : ""}`} data-testid={`stepper-${s.id}`}>
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-mono ${done ? "bg-safe text-background" : active ? "bg-primary text-primary-foreground" : "bg-white/10 text-foreground/70"}`}>{done ? <Check className="h-3 w-3" /> : i + 1}</span>
                  <span className="truncate">{s.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div ref={scrollRef} className="min-h-0 overflow-y-auto scrollbar-thin p-4" data-testid={`workflow-step-${current.id}`}>
          {detail.error && <ErrorState error={detail.error} onRetry={detail.reload} />}
          {ranking.error && <ErrorState error={ranking.error} onRetry={ranking.reload} />}
          {hab && ranking.data && (
            <>
              {current.id === "priority" && <PriorityStep {...common} />}
              {current.id === "sites" && <SitesStep {...common} />}
              {current.id === "capacity" && <CapacityStep {...common} />}
              {current.id === "plan" && <PlanStep {...common} />}
              {current.id === "route" && <RouteStep {...common} />}
              {current.id === "action" && <ActionStep {...common} />}
            </>
          )}
          {(detail.loading || ranking.loading) && !hab && (
            <div className="space-y-3 animate-pulse">
              <div className="h-24 rounded-lg bg-white/5" />
              <div className="h-64 rounded-lg bg-white/5" />
            </div>
          )}
        </div>

        <aside className="hidden xl:flex flex-col border-l border-border/70 bg-background/95" data-testid="workflow-minimap">
          <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wider text-foreground/60">Situation map</div>
          <div className="relative min-h-0 flex-1">
            {hab && (
              <SurakshaMap
                geojson={geo.data}
                habitations={[hab]}
                selectedHabId={habId}
                sites={mapSites}
                routes={mapRoutes}
                layers={{ districts: true, habitations: true, buffers: true, sites: true, infrastructure: false, routes: true, reports: false }}
                basemap="streets"
                bounds={bounds}
                fitKey={`${habId}-${sites.length}-${mapRoutes.length}`}
                focus={mapFocus}
                showDistrictLabels={false}
                zoom={10}
                center={[hab.lat, hab.lon]}
                onSelectSite={(s) => setMapFocus({ lat: s.lat, lon: s.lon, zoom: 12, key: Date.now() })}
              />
            )}
            <div className="absolute bottom-3 left-3 right-3 z-[1000]">
              <MapLegend compact showRoutes={mapRoutes.length > 0} />
            </div>
          </div>
          {ranking.data && (
            <div className="border-t border-border/70 p-2.5 text-[10px] text-foreground/55">{ranking.data.search_rule}</div>
          )}
        </aside>
      </div>
    </div>
  );
}
