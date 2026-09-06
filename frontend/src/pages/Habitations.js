import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { useWorkflow } from "@/context/WorkflowContext";
import { PageHeader, ErrorState } from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, pct, HAZARD_LABELS, toneFromScore10 } from "@/lib/format";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical (RED ZONE)" },
  { id: "IMMEDIATE", label: "Immediate" },
  { id: "SHORT-TERM", label: "Short-term" },
  { id: "MEDIUM-TERM", label: "Medium-term" },
  { id: "MONITOR", label: "Monitor" },
];

export default function Habitations() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { selectedHabId, setSelectedHabId } = useWorkflow();
  const [filter, setFilter] = useState("all");
  const [district, setDistrict] = useState("all");
  const habs = useFetch(() => api.habitations(), []);
  const districts = useFetch(() => api.districts(), []);

  const rows = useMemo(() => {
    let list = habs.data?.habitations || [];
    if (filter === "critical") list = list.filter((h) => h.risk_level === "RED ZONE");
    else if (filter !== "all") list = list.filter((h) => h.priority_class === filter);
    if (district !== "all") list = list.filter((h) => h.district_id === district);
    return list;
  }, [habs.data, filter, district]);

  const assess = (h) => {
    setSelectedHabId(h.id);
    navigate(`/workflow/${h.id}/priority`);
  };

  return (
    <div className="p-4">
      <PageHeader
        eyebrow="Vulnerable habitations"
        title="Relocation priority ranking"
        description="Habitations ranked by the prototype relocation-priority model (hazard risk 35 · population exposure 25 · vulnerability 20 · historical hazard 10 · infrastructure exposure 10). Select a habitation to start the relocation workflow."
      />
      {params.get("prompt") && !selectedHabId && (
        <div className="mb-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs" data-testid="select-prompt">
          The relocation workflow needs a habitation. Choose one below and click <span className="font-medium">Assess</span>.
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" data-testid="habitation-filters">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${filter === f.id ? "border-primary/60 bg-primary/15" : "border-border/60 text-foreground/70 hover:bg-white/5"}`} data-testid={`habitation-filter-${f.id.toLowerCase()}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto w-48">
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="h-8 text-xs" data-testid="habitation-district-select">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              {(districts.data?.districts || []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {habs.error && <ErrorState error={habs.error} onRetry={habs.reload} />}
      <div className="panel-surface overflow-x-auto">
        <table className="w-full dense-table" data-testid="vulnerable-habitations-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Habitation</th>
              <th>District</th>
              <th>Risk level</th>
              <th className="text-right">Population</th>
              <th className="text-right">Exposed</th>
              <th className="text-right">Vulnerability</th>
              <th className="text-right">Infra exposure</th>
              <th>Relocation priority</th>
              <th>Recommended action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {habs.loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={11} className="!py-3">
                    <div className="h-4 animate-pulse rounded bg-white/5" />
                  </td>
                </tr>
              ))}
            {rows.map((h) => (
              <tr key={h.id} className={h.id === selectedHabId ? "bg-primary/10" : ""} data-testid={`habitation-row-${h.id}`}>
                <td className="font-mono text-xs text-foreground/50">{h.priority_rank}</td>
                <td>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-[11px] text-foreground/50">
                    {h.block} · dominant {HAZARD_LABELS[h.dominant_hazard]}
                  </div>
                </td>
                <td className="text-foreground/80">{h.district}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <StatusChip kind="risk" value={h.risk_level} />
                    <span className="font-mono text-xs text-foreground/60">{h.risk_score}</span>
                  </div>
                </td>
                <td className="text-right font-mono text-xs">{fmt(h.population)}</td>
                <td className="text-right font-mono text-xs">
                  {fmt(h.population_exposed)} <span className="text-foreground/45">({pct(h.exposed_pct)})</span>
                </td>
                <td className="text-right font-mono text-xs">
                  <span className={`text-${toneFromScore10(h.vulnerability_score)}`}>{h.vulnerability_score}</span>/10
                </td>
                <td className="text-right font-mono text-xs">
                  <span className={`text-${toneFromScore10(h.infrastructure_risk)}`}>{h.infrastructure_risk}</span>/10
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <StatusChip kind="priority" value={h.priority_class} />
                    <span className="font-mono text-xs text-foreground/60">{h.priority_score}</span>
                  </div>
                </td>
                <td className="max-w-[260px] text-xs text-foreground/70">{h.recommended_action}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/command-center?hab=${h.id}`)} className="rounded-md border border-border/60 p-1.5 hover:bg-white/5" title="View on map" data-testid={`habitation-map-${h.id}`}>
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => assess(h)} className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/40 hover:bg-primary/25" data-testid={`habitation-assess-${h.id}`}>
                      Assess <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!habs.loading && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-xs text-foreground/50 !py-6">
                  No habitations match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px] text-foreground/50">Prototype / Illustrative Data - settlement-level values disaggregated from ASDMA district data. Prototype scoring model - not an official government formula.</div>
    </div>
  );
}
