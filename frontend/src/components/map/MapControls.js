import { Layers, Map as MapIcon, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BASEMAPS } from "@/components/map/mapIcons";
import { HAZARD_LABELS, TONE_HEX } from "@/lib/format";

const LAYER_DEFS = [
  { id: "districts", label: "Red-zone districts (choropleth)" },
  { id: "habitations", label: "Habitations & exposure" },
  { id: "buffers", label: "3 km red-zone buffers" },
  { id: "sites", label: "Relocation candidate sites" },
  { id: "infrastructure", label: "Health infrastructure" },
  { id: "routes", label: "Evacuation routes" },
  { id: "reports", label: "Field reports" },
];

export const MapControls = ({ basemap, setBasemap, layers, setLayers, lens, setLens, hazardTypes = [], compact = false }) => (
  <div className="w-[248px] space-y-2" data-testid="map-controls">
    <div className="panel-surface bg-background/95 p-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/55">
        <MapIcon className="h-3 w-3" /> Basemap
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1" data-testid="map-basemap-switcher">
        {Object.entries(BASEMAPS).map(([id, b]) => (
          <button key={id} onClick={() => setBasemap(id)} className={`rounded border px-2 py-1 text-[11px] text-left transition-colors ${basemap === id ? "border-primary/60 bg-primary/15 text-foreground" : "border-border/60 text-foreground/70 hover:bg-white/5"}`} data-testid={`basemap-${id}`}>
            {b.label}
          </button>
        ))}
      </div>
      {basemap === "satellite" && (
        <div className="mt-1.5 flex items-start gap-1 text-[10px] text-foreground/55">
          <Info className="h-3 w-3 mt-px shrink-0" /> Imagery is visual context only. Scores come from tabular hazard data, not image analysis.
        </div>
      )}
    </div>

    <div className="panel-surface bg-background/95 p-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/55">
        <Layers className="h-3 w-3" /> Hazard lens
      </div>
      <Select value={lens} onValueChange={setLens}>
        <SelectTrigger className="mt-1.5 h-8 text-xs" data-testid="map-hazard-lens-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="composite">Composite red-zone score</SelectItem>
          {hazardTypes.map((h) => (
            <SelectItem key={h.id} value={h.id} disabled={h.id === "coastal_erosion"}>
              {HAZARD_LABELS[h.id] || h.label}
              {h.id === "coastal_erosion" ? " (n/a inland)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!compact && (
        <div className="mt-2 space-y-1.5">
          {LAYER_DEFS.map((l) => (
            <label key={l.id} className="flex items-center justify-between gap-2 text-[11px] text-foreground/80">
              <span>{l.label}</span>
              <Switch checked={Boolean(layers[l.id])} onCheckedChange={(v) => setLayers({ ...layers, [l.id]: v })} className="scale-75" data-testid={`map-layer-toggle-${l.id}`} />
            </label>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const MapLegend = ({ lens = "composite", showSites = true, showRoutes = false, compact = false }) => {
  if (compact) {
    return (
      <div className="panel-surface bg-background/95 px-2.5 py-1.5 text-[10px] backdrop-blur" data-testid="map-legend">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px] border-2" style={{ borderColor: TONE_HEX.critical }} /> Habitation</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: TONE_HEX.safe }} /> Recommended</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: TONE_HEX.watch }} /> Conditional</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: TONE_HEX.critical }} /> Rejected</span>
          {showRoutes && (
            <>
              <span className="flex items-center gap-1"><span className="h-1 w-4 rounded" style={{ background: TONE_HEX.safe }} /> Selected route</span>
              <span className="flex items-center gap-1"><span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "#9aa4b2" }} /> Alternative</span>
            </>
          )}
        </div>
      </div>
    );
  }
  return (
  <div className="panel-surface bg-background/95 p-2.5 text-[11px] backdrop-blur" data-testid="map-legend">
    <div className="text-[10px] uppercase tracking-wider text-foreground/55 mb-1.5">{lens === "composite" ? "District risk category" : `${HAZARD_LABELS[lens]} sub-score (avg)`}</div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {(lens === "composite"
        ? [
            ["Critical", TONE_HEX.critical],
            ["Very High", "#ee6644"],
            ["High", TONE_HEX.high],
            ["Not assessed", "#5b6472"],
          ]
        : [
            [">= 7 severe", TONE_HEX.critical],
            ["5 - 7 high", TONE_HEX.high],
            ["3 - 5 moderate", TONE_HEX.watch],
            ["< 3 low", TONE_HEX.safe],
          ]
      ).map(([l, c]) => (
        <div key={l} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-white/10" style={{ background: c }} />
          <span className="text-foreground/75">{l}</span>
        </div>
      ))}
    </div>
    <div className="mt-2 text-[10px] uppercase tracking-wider text-foreground/55 mb-1">Habitation marker</div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {[
        ["RED ZONE", TONE_HEX.critical],
        ["HIGH RISK", TONE_HEX.high],
        ["WATCH", TONE_HEX.watch],
        ["SAFER", TONE_HEX.safe],
      ].map(([l, c]) => (
        <div key={l} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] border-2" style={{ borderColor: c }} />
          <span className="text-foreground/75">{l}</span>
        </div>
      ))}
    </div>
    <div className="mt-1 text-[10px] text-foreground/50">Badge icon = dominant hazard type</div>
    {showSites && (
      <>
        <div className="mt-2 text-[10px] uppercase tracking-wider text-foreground/55 mb-1">Relocation site</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            ["Recommended", TONE_HEX.safe, false],
            ["Conditional", TONE_HEX.watch, false],
            ["Rejected", TONE_HEX.critical, true],
            ["Candidate", TONE_HEX.neutral, false],
          ].map(([l, c, dashed]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-full border-2 ${dashed ? "border-dashed" : ""}`} style={{ borderColor: c }} />
              <span className="text-foreground/75">{l}</span>
            </div>
          ))}
        </div>
      </>
    )}
    {showRoutes && (
      <>
        <div className="mt-2 text-[10px] uppercase tracking-wider text-foreground/55 mb-1">Route</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-5 rounded" style={{ background: TONE_HEX.safe }} /> Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: "#9aa4b2" }} /> Alternative
          </span>
        </div>
      </>
    )}
    <div className="mt-2 border-t border-border/60 pt-1.5 text-[10px] text-foreground/45">Prototype classification - not an official red-zone declaration</div>
  </div>
  );
};
