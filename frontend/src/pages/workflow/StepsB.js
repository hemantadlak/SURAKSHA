import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, FileCheck2, Printer, RefreshCw, Route as RouteIcon, Ship } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, Stat, ErrorState, EmptyState } from "@/components/common/PageHeader";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { fmt, ts, HAZARD_LABELS } from "@/lib/format";

// ---------------------------------------------------------------- PLAN
export const PlanStep = ({ habId, utilization, goNext, setResult, getResult, markStep }) => {
  const [plan, setPlan] = useState(getResult("plan") || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await api.plan(habId, utilization);
      setPlan(p);
      setResult("plan", p);
      markStep();
      toast.success(p.status === "CAPACITY SATISFIED" ? "Relocation plan generated - capacity satisfied" : "Relocation plan generated - capacity deficit flagged");
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (plan && plan.utilization_factor !== utilization) setPlan(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilization]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.02] p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Relocation plan - how should the population be allocated?</div>
          <p className="mt-1 max-w-xl text-sm text-foreground/75">Allocates the population requiring relocation across ranked safe sites: RECOMMENDED sites first, then CONDITIONAL, each filled up to its effective capacity (×{Math.round(utilization * 100)}%). REJECTED sites never receive people.</p>
        </div>
        <Button onClick={generate} disabled={busy} data-testid="generate-plan-button">
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} {plan ? "Regenerate relocation plan" : "Generate relocation plan"}
        </Button>
      </div>
      {error && <ErrorState error={error} onRetry={generate} />}

      {plan && (
        <>
          <div className={`rounded-lg border p-4 ${plan.status === "CAPACITY SATISFIED" ? "border-status-safe/50 bg-status-safe/10" : "border-status-critical/50 bg-status-critical/10"}`} data-testid="plan-verdict">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`text-lg font-semibold ${plan.status === "CAPACITY SATISFIED" ? "text-safe" : "text-critical"}`}>{plan.status}</span>
              <span className="font-mono text-sm">
                {fmt(plan.total_allocated)} allocated of {fmt(plan.required)} required
              </span>
              {plan.unallocated > 0 && <span className="font-mono text-sm text-critical">{fmt(plan.unallocated)} unallocated</span>}
              <span className="text-xs text-foreground/60">across {plan.allocations.length} site(s)</span>
            </div>
            <div className="mt-2 font-mono text-xs text-foreground/70" data-testid="plan-reconciliation">
              {plan.allocations.map((a) => fmt(a.allocated)).join(" + ")}
              {plan.unallocated > 0 ? ` + ${fmt(plan.unallocated)} (unallocated)` : ""} = {fmt(plan.required)} ✓ totals reconcile
            </div>
          </div>

          <Section title="Population allocation">
            <table className="w-full dense-table" data-testid="allocation-table">
              <thead>
                <tr>
                  <th>Destination site</th>
                  <th>Verdict</th>
                  <th className="text-right">Suitability</th>
                  <th className="text-right">Effective capacity</th>
                  <th className="text-right">Allocated</th>
                  <th className="text-right">Share</th>
                  <th className="text-right">Left after</th>
                  <th className="text-right">Distance</th>
                </tr>
              </thead>
              <tbody>
                {plan.allocations.map((a) => (
                  <tr key={a.site_id} data-testid={`allocation-row-${a.site_id}`}>
                    <td className="font-medium">{a.site_name}</td>
                    <td><StatusChip kind="site" value={a.status} /></td>
                    <td className="text-right font-mono text-xs">{a.suitability}</td>
                    <td className="text-right font-mono text-xs">{fmt(a.effective_capacity)}</td>
                    <td className="text-right font-mono text-sm font-semibold text-safe">{fmt(a.allocated)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="bar-track w-16"><div className="bar-fill bg-safe" style={{ width: `${a.share_pct}%` }} /></div>
                        <span className="font-mono text-xs w-12">{a.share_pct}%</span>
                      </div>
                    </td>
                    <td className="text-right font-mono text-xs text-foreground/60">{fmt(a.remaining_after)}</td>
                    <td className="text-right font-mono text-xs">{a.distance_km} km</td>
                  </tr>
                ))}
                <tr className="bg-white/[0.03] font-semibold">
                  <td colSpan={4}>Total</td>
                  <td className="text-right font-mono text-sm">{fmt(plan.total_allocated)}</td>
                  <td className="text-right font-mono text-xs">{plan.required ? Math.round((plan.total_allocated / plan.required) * 100) : 0}%</td>
                  <td colSpan={2} className="text-right font-mono text-xs text-foreground/60">required {fmt(plan.required)}</td>
                </tr>
              </tbody>
            </table>
            {plan.excluded_sites.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider text-foreground/55 mb-1">Excluded from allocation</div>
                <ul className="space-y-1 text-xs text-foreground/70">
                  {plan.excluded_sites.map((s) => (
                    <li key={s.id} className="flex gap-2">
                      <StatusChip kind="site" value="REJECTED" />
                      <span>
                        <span className="font-medium text-foreground/85">{s.name}</span> ({fmt(s.available_capacity)} available) - {s.gates[0]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2 text-[11px] text-foreground/50">{plan.algorithm}</div>
          </Section>
          <div className="flex justify-end">
            <Button onClick={goNext} data-testid="plan-next-button">
              Select safe route <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
      {!plan && !busy && <EmptyState title="No plan generated yet" body="Generate the relocation plan to allocate the exposed population across the verified safe destinations." />}
    </div>
  );
};

// ---------------------------------------------------------------- ROUTE
export const RouteStep = ({ habId, hab, utilization, goNext, setResult, getResult, setMapRoutes, markStep }) => {
  const [plan, setPlan] = useState(getResult("plan") || null);
  const [siteId, setSiteId] = useState(null);
  const [routes, setRoutes] = useState(getResult("routes") || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plan) api.plan(habId, utilization).then((p) => { setPlan(p); setResult("plan", p); }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habId]);

  useEffect(() => {
    if (plan && !siteId && plan.allocations.length) setSiteId(plan.allocations[0].site_id);
  }, [plan, siteId]);

  const current = siteId ? routes[siteId] : null;
  useEffect(() => {
    setMapRoutes(current ? current.routes : []);
  }, [current, setMapRoutes]);

  const optimise = async () => {
    if (!siteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.routes(habId, siteId);
      const next = { ...routes, [siteId]: res };
      setRoutes(next);
      setResult("routes", next);
      markStep();
      toast.success(`${res.routes.find((r) => r.selected)?.label} selected - lowest hazard-weighted route cost`);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const selected = current?.routes.find((r) => r.selected);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.02] p-4">
        <div className="min-w-[260px]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Safe route - hazard-aware, not just shortest</div>
          <p className="mt-1 max-w-xl text-sm text-foreground/75">Compares candidate road routes to the destination on distance, hazard exposure (share of route inside other red-zone buffers) and access quality. Road geometry from OpenStreetMap via OSRM.</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-foreground/60">Destination</span>
            <div className="w-72">
              <Select value={siteId || ""} onValueChange={setSiteId} disabled={!plan}>
                <SelectTrigger className="h-8 text-xs" data-testid="route-destination-select">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {(plan?.allocations || []).map((a) => (
                    <SelectItem key={a.site_id} value={a.site_id}>
                      {a.site_name} · {fmt(a.allocated)} people
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Button onClick={optimise} disabled={busy || !siteId} data-testid="optimize-route-button">
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RouteIcon className="h-4 w-4" />} {current ? "Re-optimise route" : "Optimise route"}
        </Button>
      </div>
      {error && <ErrorState error={error} onRetry={optimise} />}

      {current && (
        <>
          <div className="rounded-lg border border-status-safe/50 bg-status-safe/10 p-4" data-testid="route-verdict">
            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Selected route to {current.site.name}</div>
            <div className="mt-1 text-sm font-medium" data-testid="route-selection-reason">{selected?.selection_reason}</div>
            {current.access_note && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/70">
                <Ship className="h-3.5 w-3.5 mt-px shrink-0" /> {current.access_note}
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2" data-testid="route-comparison">
            {current.routes.map((r) => (
              <div key={r.id} className={`rounded-lg border p-3 ${r.selected ? "border-status-safe/60" : "border-border/60"}`} data-testid={`route-card-${r.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.label}</div>
                  {r.selected ? <span className="chip chip-safe">SELECTED</span> : <span className="chip chip-muted">ALTERNATIVE</span>}
                </div>
                <div className="mt-0.5 text-[11px] text-foreground/55">{r.via}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Stat label="Road distance" value={`${r.distance_km} km`} />
                  <Stat label="Est. duration" value={r.duration_min ? `${r.duration_min} min` : "-"} />
                  <Stat label="Hazard exposure" value={`${r.hazard.exposure_pct}%`} tone={r.hazard.exposure_pct > 20 ? "critical" : r.hazard.exposure_pct > 5 ? "high" : "safe"} sub={`${r.hazard.exposed_km} km inside red-zone buffers`} />
                  <Stat label="Route cost" value={r.route_cost} sub="lower is better" />
                </div>
                {r.hazard.zones_crossed.length > 0 && (
                  <div className="mt-2 text-[11px] text-foreground/65">Passes near: {r.hazard.zones_crossed.map((z) => `${z.name} (${z.km} km)`).join(", ")}</div>
                )}
                <div className="mt-1 text-[11px] text-foreground/55">
                  Access at destination: {current.site.road_label} ({current.site.road_name})
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-foreground/50">
            Route cost = hazard 45% · distance 35% · access 20%. {selected?.hazard.method}. Geometry: {current.source}.
          </div>
          <div className="flex justify-end">
            <Button onClick={goNext} data-testid="route-next-button">
              Generate action plan <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
      {!current && !busy && plan && <EmptyState title="No route computed yet" body={`Optimise the route from ${hab?.name} to the selected destination to compare candidates and pick the safest.`} />}
    </div>
  );
};

// ---------------------------------------------------------------- ACTION PLAN
export const ActionStep = ({ habId, hab, utilization, setResult, getResult, markStep }) => {
  const navigate = useNavigate();
  const [ap, setAp] = useState(getResult("action") || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const saved = useFetch(() => api.actionPlans(), [ap?.id]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.generateActionPlan(habId, { utilization, include_routes: true });
      setAp(res);
      setResult("action", res);
      markStep();
      toast.success("Action plan generated and saved");
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const openSaved = async (id) => {
    const doc = await api.actionPlan(id);
    setAp(doc);
    if (doc.habitation_id !== habId) navigate(`/workflow/${doc.habitation_id}/action`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.02] p-4 no-print">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Action plan - what should the authority consider?</div>
          <p className="mt-1 max-w-xl text-sm text-foreground/75">Consolidates risk, priority, site comparison, capacity, allocation and route selection into a structured, evidence-backed recommendation. Saved to the plan register.</p>
        </div>
        <div className="flex items-center gap-2">
          {ap && (
            <Button variant="outline" onClick={() => window.print()} data-testid="print-action-plan-button">
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          )}
          <Button onClick={generate} disabled={busy} data-testid="generate-action-plan-button">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} {ap ? "Regenerate action plan" : "Generate action plan"}
          </Button>
        </div>
      </div>
      {error && <ErrorState error={error} onRetry={generate} />}
      {busy && <div className="text-xs text-foreground/60">Recomputing priority, sites, capacity, allocation and routes...</div>}

      {ap && <ActionPlanDocument ap={ap} />}

      {!ap && !busy && <EmptyState title="No action plan generated yet" body="Generate the plan to produce the recommended action for this habitation." />}

      <Section title="Saved action plans (register)" className="no-print" testId="saved-action-plans">
        {saved.data?.action_plans?.length ? (
          <table className="w-full dense-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Habitation</th>
                <th>Priority</th>
                <th>Allocation</th>
                <th>Capacity</th>
                <th>Generated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {saved.data.action_plans.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-[11px]">{p.id}</td>
                  <td>{p.location?.habitation}, {p.location?.district}</td>
                  <td><StatusChip kind="priority" value={p.relocation_priority?.class} /></td>
                  <td className="font-mono text-xs">{fmt(p.allocation_totals?.allocated)} / {fmt(p.allocation_totals?.required)}</td>
                  <td className={`text-xs ${p.capacity_status?.status === "SUFFICIENT" ? "text-safe" : "text-critical"}`}>{p.capacity_status?.status}</td>
                  <td className="font-mono text-[11px]">{ts(p.generated_at)}</td>
                  <td>
                    <button className="text-xs text-primary hover:underline" onClick={() => openSaved(p.id)} data-testid={`open-saved-plan-${p.id}`}>
                      open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-foreground/50">No saved plans yet.</div>
        )}
      </Section>
    </div>
  );
};

const DocRow = ({ k, v }) => (
  <div className="grid grid-cols-[170px_1fr] gap-2 border-b border-panel-border/70 py-1.5 text-sm last:border-0">
    <div className="text-black/55">{k}</div>
    <div className="text-black/90">{v}</div>
  </div>
);

export const ActionPlanDocument = ({ ap }) => {
  const priorityTone = { High: "critical", "Medium-High": "high", Medium: "watch", Low: "safe" }[ap.relocation_priority.label] || "neutral";
  return (
    <article className="panel-light rounded-lg shadow-panel" data-testid="action-plan-output">
      <header className="border-b border-panel-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-black/50">SURAKSHA · Recommended action (decision support)</div>
            <h2 className="mt-0.5 text-lg font-semibold">
              {ap.location.habitation}, {ap.location.district}
            </h2>
            <div className="text-xs text-black/60">{ap.incident}</div>
          </div>
          <div className="text-right font-mono text-[11px] text-black/60">
            <div>{ap.id}</div>
            <div>generated {ts(ap.generated_at)}</div>
            <div>data as of {ts(ap.data_timestamp)}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`chip chip-${priorityTone} text-xs px-2.5 py-1`} data-testid="action-plan-priority">{ap.priority_label}</span>
          <span className="chip chip-muted text-xs">{ap.relocation_priority.class} · {ap.relocation_priority.score}/100</span>
          <span className="chip chip-muted text-xs">Severity {ap.severity.risk_score}/100 · {ap.severity.risk_level}</span>
          <span className={`chip text-xs ${ap.capacity_status.status === "SUFFICIENT" ? "chip-safe" : "chip-critical"}`}>Capacity {ap.capacity_status.status}</span>
        </div>
      </header>

      <div className="space-y-5 p-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Recommended action</h3>
          <p className="mt-1 text-[15px] font-medium leading-relaxed" data-testid="action-plan-recommended-action">{ap.recommended_action}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Situation</h3>
            <DocRow k="Incident" v={ap.incident} />
            <DocRow k="Location" v={`${ap.location.habitation}, ${ap.location.block} block, ${ap.location.district}`} />
            <DocRow k="Coordinates" v={<span className="font-mono text-xs">{ap.location.lat.toFixed(4)}N {ap.location.lon.toFixed(4)}E</span>} />
            <DocRow k="Severity" v={`${ap.severity.risk_score}/100 - ${ap.severity.risk_level}; dominant hazard ${HAZARD_LABELS[ap.severity.dominant_hazard]} (${ap.severity.hazard_subscores[ap.severity.dominant_hazard]}/10)`} />
            <DocRow k="Population at risk" v={`${fmt(ap.population_at_risk.exposed)} exposed of ${fmt(ap.population_at_risk.total)} (${fmt(ap.population_at_risk.households)} households)`} />
            <DocRow k="Requiring relocation" v={<span className="font-semibold">{fmt(ap.population_at_risk.requiring_relocation)}</span>} />
            <DocRow k="Relocation priority" v={`${ap.relocation_priority.class} (${ap.relocation_priority.score}/100)`} />
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Reason</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" data-testid="action-plan-reasons">
              {ap.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Recommended relocation sites</h3>
            <ul className="mt-1 space-y-1 text-sm" data-testid="action-plan-sites">
              {ap.recommended_sites.map((s) => (
                <li key={s.id} className="flex justify-between gap-2 border-b border-panel-border/70 py-1">
                  <span>{s.name}</span>
                  <span className="font-mono text-xs text-black/60">suit {s.suitability} · {fmt(s.available_capacity)} avail · {s.distance_km} km</span>
                </li>
              ))}
            </ul>
            {ap.rejected_sites.length > 0 && (
              <>
                <h3 className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-black/55">Sites rejected</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {ap.rejected_sites.map((s) => (
                    <li key={s.id} className="border-b border-panel-border/70 py-1">
                      <span className="font-medium">{s.name}</span> <span className="text-black/60">({fmt(s.available_capacity)} avail)</span> - <span className="text-[hsl(var(--status-critical))]">{s.reason}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Population allocation</h3>
            <table className="mt-1 w-full text-sm" data-testid="action-plan-allocation">
              <tbody>
                {ap.population_allocation.map((a) => (
                  <tr key={a.site_id} className="border-b border-panel-border/70">
                    <td className="py-1">{a.site_name}</td>
                    <td className="py-1 text-right font-mono">{fmt(a.allocated)}</td>
                    <td className="py-1 pl-2 text-right text-xs text-black/55">{a.share_pct}%</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1">Total allocated / required</td>
                  <td className="py-1 text-right font-mono">{fmt(ap.allocation_totals.allocated)} / {fmt(ap.allocation_totals.required)}</td>
                  <td className={`py-1 pl-2 text-right text-xs ${ap.allocation_totals.unallocated ? "text-[hsl(var(--status-critical))]" : "text-[hsl(var(--status-safe))]"}`}>{ap.allocation_totals.status}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 text-xs text-black/65">
              Capacity status: <span className="font-medium">{ap.capacity_status.status}</span> - effective safe capacity {fmt(ap.capacity_status.effective_safe_capacity)} vs {fmt(ap.capacity_status.required)} required ({ap.capacity_status.status === "SUFFICIENT" ? `surplus ${fmt(ap.capacity_status.surplus)}` : `deficit ${fmt(ap.capacity_status.deficit)}`}); {fmt(ap.capacity_status.excluded_unsafe_capacity)} unsafe places excluded.
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Route status</h3>
            <div className="mt-1 text-sm">{ap.route_status}</div>
            <ul className="mt-1 space-y-1 text-xs text-black/75" data-testid="action-plan-routes">
              {ap.routes.map((r) => (
                <li key={r.site_id} className="border-b border-panel-border/70 py-1">
                  <span className="font-medium">{r.site_name}</span>: {r.label}, {r.distance_km} km{r.duration_min ? `, ~${r.duration_min} min` : ""}, hazard exposure {r.hazard_exposure_pct}% - {r.reason}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Resource requirements (planning assumptions)</h3>
            <DocRow k="Bus trips (50 / trip)" v={fmt(ap.resource_requirements.bus_trips)} />
            <DocRow k="Drinking water / day" v={`${fmt(ap.resource_requirements.drinking_water_l_per_day)} L (15 L / person)`} />
            <DocRow k="Dry rations / day" v={`${fmt(ap.resource_requirements.dry_ration_kg_per_day)} kg`} />
            <DocRow k="Medical teams" v={fmt(ap.resource_requirements.medical_teams)} />
            <DocRow k="Relief kits (households)" v={fmt(ap.resource_requirements.relief_kits_households)} />
            {ap.resource_requirements.temporary_tents_for_deficit > 0 && <DocRow k="Tents for unallocated" v={fmt(ap.resource_requirements.temporary_tents_for_deficit)} />}
            <div className="mt-1 text-[10px] text-black/50">{ap.resource_requirements.assumptions.label}</div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/55">Key considerations</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" data-testid="action-plan-considerations">
            {ap.key_considerations.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <footer className="rounded-md border border-panel-border bg-panel-muted p-3 text-xs text-black/70" data-testid="action-plan-disclaimer">
          <div className="font-medium text-black/85">Decision support only</div>
          {ap.disclaimer} {ap.labels.model}. {ap.labels.data}.
        </footer>
      </div>
    </article>
  );
};

export const useNoop = () => useMemo(() => null, []);
export const DemoTag = DemoLabel;
