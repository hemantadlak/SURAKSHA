import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Section, Stat, ErrorState } from "@/components/common/PageHeader";
import { StatusChip, DemoLabel } from "@/components/common/StatusChip";
import { ContributionBars } from "@/components/common/ContributionBars";
import { fmt, pct, TONE_HEX, toneFromScore10 } from "@/lib/format";

const NextButton = ({ onClick, label, testId }) => (
  <div className="mt-4 flex justify-end">
    <Button onClick={onClick} data-testid={testId}>
      {label} <ArrowRight className="h-4 w-4" />
    </Button>
  </div>
);

// ---------------------------------------------------------------- PRIORITY
export const PriorityStep = ({ habId, hab, goNext, markStep }) => {
  const prio = useFetch(() => api.priority(habId), [habId]);
  useEffect(() => {
    if (prio.data) markStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prio.data]);
  if (prio.error) return <ErrorState error={prio.error} onRetry={prio.reload} />;
  const p = prio.data;
  if (!p) return <div className="h-48 animate-pulse rounded-lg bg-white/5" />;
  const tone = { IMMEDIATE: "critical", "SHORT-TERM": "high", "MEDIUM-TERM": "watch", MONITOR: "safe" }[p.priority_class];
  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-4" style={{ borderColor: `${TONE_HEX[tone]}66`, background: `${TONE_HEX[tone]}14` }} data-testid="priority-verdict">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Relocation priority - who needs to move, and how urgently</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-3xl font-semibold" style={{ color: TONE_HEX[tone] }} data-testid="priority-score">
                {p.priority_score}
              </span>
              <span className="text-foreground/50 font-mono">/100</span>
              <StatusChip kind="priority" value={p.priority_class} className="text-xs px-2.5 py-1" testId="relocation-priority-chip" />
            </div>
          </div>
          <div className="max-w-md text-sm text-foreground/85">
            <span className="text-foreground/55">Recommended action: </span>
            {p.recommended_action}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Population" value={fmt(p.habitation.population)} testId="priority-population" />
          <Stat label="Exposed" value={fmt(p.habitation.population_exposed)} tone="high" testId="priority-exposed" />
          <Stat label="Requiring relocation" value={fmt(p.habitation.population_requiring_relocation)} tone="critical" sub="planning figure" testId="priority-requiring-relocation" />
          <Stat label="Risk" value={`${p.habitation.risk_score}/100`} sub={p.habitation.risk_level} testId="priority-risk" />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Contributing factors" aside={<DemoLabel text="Prototype Relocation Priority Model" />}>
          <ContributionBars rows={p.priority_factors} max={35} testId="priority-factors" />
          <div className="mt-3 text-[11px] text-foreground/55">Priority = Σ weight × factor(0-10) × 10. Classes: IMMEDIATE ≥ 70 · SHORT-TERM ≥ 55 · MEDIUM-TERM ≥ 40 · MONITOR below.</div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {p.classes.map((c) => (
              <div key={c.label} className={`rounded border px-2 py-1.5 text-[11px] ${c.label === p.priority_class ? "border-primary/60 bg-primary/10" : "border-border/50 text-foreground/60"}`}>
                <div className="flex items-center justify-between">
                  <StatusChip kind="priority" value={c.label} />
                  <span className="font-mono">≥ {c.min}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Vulnerability breakdown" aside={<span className="font-mono text-xs">{p.vulnerability_score}/10</span>}>
          <ContributionBars rows={Object.values(p.vulnerability_parts).map((v) => ({ label: v.label, score: v.score, weight: v.weight, contribution: v.weighted * 10, hint: v.value }))} max={35} testId="vulnerability-bars" />
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-wider text-foreground/55 mb-1">Critical infrastructure exposure</div>
            <table className="w-full dense-table text-xs">
              <tbody>
                {p.infrastructure_items.map((i) => (
                  <tr key={i.factor}>
                    <td className="!py-1">{i.factor}</td>
                    <td className="!py-1 text-right font-mono">+{i.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
      <div className="text-[11px] text-foreground/50">{p.labels.model}</div>
      <NextButton onClick={goNext} label="Compare alternative sites" testId="priority-next-button" />
    </div>
  );
};

// ---------------------------------------------------------------- SITES
const FactorMini = ({ factors }) => (
  <div className="grid grid-cols-5 gap-1.5">
    {factors.map((f) => (
      <div key={f.factor} className="rounded border border-border/50 px-1.5 py-1">
        <div className="text-[9px] uppercase tracking-wider text-foreground/50 truncate">{f.label}</div>
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-xs text-${toneFromScore10(10 - f.score)}`}>{f.score.toFixed(1)}</span>
          <span className="text-[9px] text-foreground/40">w{Math.round(f.weight * 100)}</span>
        </div>
        <div className="bar-track mt-0.5 !h-1">
          <div className="bar-fill !h-1" style={{ width: `${f.score * 10}%`, background: TONE_HEX[toneFromScore10(10 - f.score)] }} />
        </div>
      </div>
    ))}
  </div>
);

export const SitesStep = ({ ranking, goNext, markStep, setMapFocus }) => {
  const [open, setOpen] = useState(() => ranking.sites.find((s) => s.status === "REJECTED")?.id || null);
  useEffect(() => {
    markStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sites = ranking.sites;
  const recommended = sites.filter((s) => s.status === "RECOMMENDED");
  const rejected = sites.filter((s) => s.status === "REJECTED");
  const biggestRejected = [...rejected].sort((a, b) => b.available_capacity - a.available_capacity)[0];
  const biggestOverall = [...sites].sort((a, b) => b.available_capacity - a.available_capacity)[0];

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-status-safe/40 bg-status-safe/10 p-3" data-testid="sites-summary-recommended">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/60">
            <ShieldCheck className="h-3.5 w-3.5 text-safe" /> Recommended
          </div>
          <div className="font-mono text-2xl font-semibold text-safe">{recommended.length}</div>
          <div className="text-[11px] text-foreground/60">{fmt(recommended.reduce((a, s) => a + s.available_capacity, 0))} places available</div>
        </div>
        <div className="rounded-lg border border-status-watch/40 bg-status-watch/10 p-3" data-testid="sites-summary-conditional">
          <div className="text-[10px] uppercase tracking-wider text-foreground/60">Conditional</div>
          <div className="font-mono text-2xl font-semibold text-watch">{sites.filter((s) => s.status === "CONDITIONAL").length}</div>
          <div className="text-[11px] text-foreground/60">need pre-deployment or transport</div>
        </div>
        <div className="rounded-lg border border-status-critical/40 bg-status-critical/10 p-3" data-testid="sites-summary-rejected">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/60">
            <ShieldAlert className="h-3.5 w-3.5 text-critical" /> Rejected
          </div>
          <div className="font-mono text-2xl font-semibold text-critical">{rejected.length}</div>
          <div className="text-[11px] text-foreground/60">{fmt(rejected.reduce((a, s) => a + s.available_capacity, 0))} places excluded as unsafe / unusable</div>
        </div>
      </div>

      {biggestRejected && biggestRejected.id === biggestOverall?.id && (
        <div className="rounded-md border border-status-critical/50 bg-status-critical/10 px-3 py-2 text-xs" data-testid="capacity-trap-callout">
          <span className="font-semibold text-critical">Capacity is not safety.</span> {biggestRejected.name} has the largest available capacity ({fmt(biggestRejected.available_capacity)}) of all candidates but is <span className="font-semibold">REJECTED</span>: {biggestRejected.gates[0]}.
        </div>
      )}

      <Section title="Alternative site comparison" aside={<span className="text-[10px] text-foreground/55">Suitability = safety 35 · capacity 20 · accessibility 15 · infrastructure 15 · distance 15</span>}>
        <div className="overflow-x-auto">
          <table className="w-full dense-table" data-testid="alternative-sites-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Site</th>
                <th>Verdict</th>
                <th className="text-right">Suitability</th>
                <th className="text-right">Safety</th>
                <th className="text-right">Hazard exposure</th>
                <th className="text-right">Available</th>
                <th className="text-right">Distance</th>
                <th>Access</th>
                <th className="text-right">Infra</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <RowGroup key={s.id} s={s} open={open === s.id} toggle={() => setOpen(open === s.id ? null : s.id)} focus={() => setMapFocus({ lat: s.lat, lon: s.lon, zoom: 12, key: Date.now() })} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-[11px] text-foreground/50">
          {ranking.search_rule} Hard gates: hazard exposure ≥ {ranking.thresholds.unsafe_exposure}/10 → REJECTED; infrastructure &lt; {ranking.thresholds.min_infra}/10 → REJECTED; distance &gt; {ranking.thresholds.max_distance_km} km → capped at CONDITIONAL. {ranking.labels.model}.
        </div>
      </Section>
      <NextButton onClick={goNext} label="Check carrying capacity" testId="sites-next-button" />
    </div>
  );
};

const RowGroup = ({ s, open, toggle, focus }) => (
  <>
    <tr className={`cursor-pointer ${open ? "bg-white/[0.03]" : ""}`} onClick={toggle} data-testid={`site-row-${s.id}`}>
      <td className="font-mono text-xs text-foreground/50">{s.rank}</td>
      <td>
        <div className="font-medium">{s.name}</div>
        <div className="text-[10px] text-foreground/50">
          {s.type.replace("_", " ")} · {s.district} · {s.elevation_m} m
        </div>
      </td>
      <td>
        <StatusChip kind="site" value={s.status} testId="site-verdict-chip" />
      </td>
      <td className="text-right font-mono text-xs font-semibold">{s.suitability.toFixed(1)}</td>
      <td className="text-right font-mono text-xs">
        <span className={`text-${toneFromScore10(10 - s.safety_score)}`}>{s.safety_score.toFixed(1)}</span>
      </td>
      <td className="text-right font-mono text-xs">
        <span className={`text-${toneFromScore10(s.hazard_exposure)}`}>{s.hazard_exposure.toFixed(1)}</span>
        {!s.is_safe && <span className="ml-1 text-[9px] text-critical">UNSAFE</span>}
      </td>
      <td className="text-right font-mono text-xs">
        {fmt(s.available_capacity)} <span className="text-foreground/40">/ {fmt(s.total_capacity)}</span>
      </td>
      <td className="text-right font-mono text-xs">{s.distance_km} km</td>
      <td className="text-xs text-foreground/75">{s.road_label}</td>
      <td className="text-right font-mono text-xs">{s.infrastructure_readiness.toFixed(1)}</td>
      <td>
        <div className="flex items-center gap-1">
          <button className="rounded border border-border/60 px-1.5 py-1 text-[10px] hover:bg-white/5" onClick={(e) => { e.stopPropagation(); focus(); }} data-testid={`site-locate-${s.id}`}>
            map
          </button>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-foreground/50" /> : <ChevronDown className="h-3.5 w-3.5 text-foreground/50" />}
        </div>
      </td>
    </tr>
    {open && (
      <tr className="!border-t-0">
        <td colSpan={11} className="!pt-0 !pb-3">
          <div className="rounded-md border border-border/50 bg-background/60 p-3" data-testid={`site-reasons-${s.id}`}>
            <FactorMini factors={s.factors} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-safe mb-1">Why accepted / strengths</div>
                <ul className="space-y-1 text-xs text-foreground/80">
                  {s.reasons_for.length === 0 && <li className="text-foreground/45">-</li>}
                  {s.reasons_for.map((r) => (
                    <li key={r} className="flex gap-1.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-safe" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-critical mb-1">Why rejected / concerns</div>
                <ul className="space-y-1 text-xs text-foreground/80">
                  {s.gates.map((g) => (
                    <li key={g} className="flex gap-1.5 font-medium">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-critical" />
                      {g}
                    </li>
                  ))}
                  {s.reasons_against.map((r) => (
                    <li key={r} className="flex gap-1.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-high" />
                      {r}
                    </li>
                  ))}
                  {s.gates.length === 0 && s.reasons_against.length === 0 && <li className="text-foreground/45">No concerns flagged</li>}
                </ul>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-foreground/50">
              Site inundation exposure: {Object.values(s.exposure_detail.parts).map((p) => `${p.label} ${p.value} → ${p.score}`).join(" · ")} (weights 35/25/25/15). {s.notes}
            </div>
          </div>
        </td>
      </tr>
    )}
  </>
);

// ---------------------------------------------------------------- CAPACITY
export const CapacityStep = ({ habId, utilization, setUtilization, goNext, markStep }) => {
  const cap = useFetch(() => api.capacity(habId, utilization), [habId, utilization]);
  useEffect(() => {
    if (cap.data) markStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap.data]);
  if (cap.error) return <ErrorState error={cap.error} onRetry={cap.reload} />;
  const c = cap.data;
  if (!c) return <div className="h-48 animate-pulse rounded-lg bg-white/5" />;
  const ok = c.status === "SUFFICIENT";
  const scale = Math.max(c.required_capacity, c.total_site_capacity, 1);
  const usable = c.sites.filter((s) => s.status !== "REJECTED");
  const rejected = c.sites.filter((s) => s.status === "REJECTED");

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border p-4 ${ok ? "border-status-safe/50 bg-status-safe/10" : "border-status-critical/50 bg-status-critical/10"}`} data-testid="capacity-verdict">
        <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Carrying capacity - can the safe destinations accommodate them?</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-2xl font-semibold" data-testid="capacity-required">{fmt(c.required_capacity)}</span>
          <span className="text-sm text-foreground/70">requiring relocation</span>
          <span className="text-foreground/40">vs</span>
          <span className="font-mono text-2xl font-semibold" data-testid="capacity-effective">{fmt(c.effective_safe_capacity)}</span>
          <span className="text-sm text-foreground/70">effective safe capacity</span>
          <span className="text-foreground/40">→</span>
          <span className={`text-lg font-semibold ${ok ? "text-safe" : "text-critical"}`}>{c.status}</span>
          <span className="font-mono text-sm text-foreground/70">
            ({ok ? "surplus" : "deficit"} {fmt(ok ? c.surplus : c.deficit)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Requiring relocation" value={fmt(c.population_requiring_relocation)} tone="critical" testId="capacity-requiring" />
        <Stat label="Total site capacity" value={fmt(c.total_site_capacity)} sub="usable sites" testId="capacity-total" />
        <Stat label="Current occupancy" value={fmt(c.current_occupancy)} testId="capacity-occupancy" />
        <Stat label="Available capacity" value={fmt(c.available_capacity)} sub="total - occupancy" testId="capacity-available" />
        <Stat label="Effective safe capacity" value={fmt(c.effective_safe_capacity)} sub={`× ${Math.round(c.utilization_factor * 100)}% utilisation`} tone="safe" testId="capacity-effective-stat" />
        <Stat label={ok ? "Surplus" : "Deficit"} value={fmt(ok ? c.surplus : c.deficit)} tone={ok ? "safe" : "critical"} testId="capacity-balance" />
      </div>

      <Section title="Capacity balance" aside={<DemoLabel text="Configurable planning assumption" />}>
        <div className="space-y-3" data-testid="capacity-visual">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-foreground/60">
              <span>Usable site capacity (occupied vs available)</span>
              <span className="font-mono">{fmt(c.total_site_capacity)}</span>
            </div>
            <div className="relative h-5 w-full rounded bg-white/5">
              <div className="absolute left-0 top-0 h-5 rounded-l bg-white/25" style={{ width: `${(c.current_occupancy / scale) * 100}%` }} title="Current occupancy" />
              <div className="absolute top-0 h-5 bg-status-safe/70" style={{ left: `${(c.current_occupancy / scale) * 100}%`, width: `${((c.effective_safe_capacity) / scale) * 100}%` }} title="Effective safe capacity" />
              <div className="absolute top-[-4px] h-7 w-0.5 bg-critical" style={{ left: `${(c.required_capacity / scale) * 100}%` }} title="Required" />
              <div className="absolute top-[-16px] -translate-x-1/2 font-mono text-[10px] text-critical" style={{ left: `${(c.required_capacity / scale) * 100}%` }}>
                required {fmt(c.required_capacity)}
              </div>
            </div>
            <div className="mt-1 flex gap-4 text-[10px] text-foreground/55">
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-white/25" /> occupied {fmt(c.current_occupancy)}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-status-safe/70" /> effective safe {fmt(c.effective_safe_capacity)}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-0.5 bg-critical" /> required</span>
            </div>
          </div>
          <div className="grid grid-cols-[140px_1fr_60px] items-center gap-3">
            <span className="text-xs text-foreground/70">Utilisation factor</span>
            <Slider value={[Math.round(utilization * 100)]} min={50} max={100} step={5} onValueChange={([v]) => setUtilization(v / 100)} data-testid="utilization-slider" />
            <span className="text-right font-mono text-xs">{Math.round(utilization * 100)}%</span>
          </div>
          <p className="text-[11px] text-foreground/55">{c.assumption}</p>
        </div>
      </Section>

      <Section title="Per-site capacity">
        <table className="w-full dense-table" data-testid="capacity-sites-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Verdict</th>
              <th className="text-right">Total</th>
              <th className="text-right">Occupied</th>
              <th className="text-right">Available</th>
              <th className="text-right">Effective</th>
              <th className="text-right">Distance</th>
            </tr>
          </thead>
          <tbody>
            {usable.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td><StatusChip kind="site" value={s.status} /></td>
                <td className="text-right font-mono text-xs">{fmt(s.total_capacity)}</td>
                <td className="text-right font-mono text-xs">{fmt(s.current_occupancy)}</td>
                <td className="text-right font-mono text-xs">{fmt(s.available_capacity)}</td>
                <td className="text-right font-mono text-xs font-semibold text-safe">{fmt(s.effective_capacity)}</td>
                <td className="text-right font-mono text-xs">{s.distance_km} km</td>
              </tr>
            ))}
            <tr className="bg-white/[0.03] font-semibold">
              <td colSpan={2}>Effective safe capacity</td>
              <td className="text-right font-mono text-xs">{fmt(c.total_site_capacity)}</td>
              <td className="text-right font-mono text-xs">{fmt(c.current_occupancy)}</td>
              <td className="text-right font-mono text-xs">{fmt(c.available_capacity)}</td>
              <td className="text-right font-mono text-xs text-safe">{fmt(c.effective_safe_capacity)}</td>
              <td></td>
            </tr>
            {rejected.map((s) => (
              <tr key={s.id} className="opacity-60">
                <td>
                  <div className="font-medium line-through decoration-critical/70">{s.name}</div>
                  <div className="text-[10px] text-critical">{s.gates[0]}</div>
                </td>
                <td><StatusChip kind="site" value={s.status} /></td>
                <td className="text-right font-mono text-xs">{fmt(s.total_capacity)}</td>
                <td className="text-right font-mono text-xs">{fmt(s.current_occupancy)}</td>
                <td className="text-right font-mono text-xs">{fmt(s.available_capacity)}</td>
                <td className="text-right font-mono text-xs text-critical">0</td>
                <td className="text-right font-mono text-xs">{s.distance_km} km</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-[11px] text-foreground/55">
          {fmt(c.excluded_unsafe_capacity)} places at REJECTED sites are excluded from effective capacity - space at an unsafe site is not safe capacity.
        </div>
      </Section>
      <NextButton onClick={goNext} label="Generate relocation plan" testId="capacity-next-button" />
    </div>
  );
};

export const pctLabel = pct;
