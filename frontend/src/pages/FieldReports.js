import { useState } from "react";
import { toast } from "sonner";
import { Camera, MapPin, Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { PageHeader, Section, ErrorState } from "@/components/common/PageHeader";
import { SurakshaMap } from "@/components/map/SurakshaMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ts, coord } from "@/lib/format";

const INCIDENTS = ["Flood inundation", "Embankment breach", "Riverbank erosion", "Landslide / debris flow", "Waterlogging", "Road cut-off", "Shelter condition", "Other"];
const SEVERITIES = ["Critical", "High", "Watch", "Information"];

const downscale = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });

export default function FieldReports() {
  const reports = useFetch(() => api.fieldReports(), []);
  const habs = useFetch(() => api.habitations(), []);
  const geo = useFetch(() => api.geoDistricts(), []);
  const [form, setForm] = useState({ location_name: "", incident_type: INCIDENTS[0], severity: "High", description: "", lat: "", lon: "", reporter: "Field officer", photo_data_url: null });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set("photo_data_url", await downscale(file));
    } catch {
      toast.error("Could not read photo");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location_name || form.lat === "" || form.lon === "") {
      toast.error("Location name and coordinates are required (click the map to set them)");
      return;
    }
    setBusy(true);
    try {
      await api.createFieldReport({ ...form, lat: Number(form.lat), lon: Number(form.lon) });
      toast.success("Field report logged - marker added to the map");
      setForm({ location_name: "", incident_type: INCIDENTS[0], severity: "High", description: "", lat: "", lon: "", reporter: form.reporter, photo_data_url: null });
      reports.reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save report");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.deleteFieldReport(id);
    reports.reload();
  };

  return (
    <div className="p-4">
      <PageHeader eyebrow="Field reports" title="Ground observations" description="Officers and volunteers log observations with a photo and coordinates. Reports appear as diamond markers on every map. Click the map to set coordinates." demo={false} />
      <div className="grid gap-3 xl:grid-cols-[380px_1fr]">
        <Section title="New field report">
          <form onSubmit={submit} className="space-y-3" data-testid="field-report-form">
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={form.location_name} onChange={(e) => set("location_name", e.target.value)} placeholder="e.g. Sialmari Char, north embankment" className="mt-1 h-9" data-testid="field-report-location" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Incident type</Label>
                <Select value={form.incident_type} onValueChange={(v) => set("incident_type", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs" data-testid="field-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENTS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs" data-testid="field-report-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="What was observed?" className="mt-1 text-sm" data-testid="field-report-description" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Latitude</Label>
                <Input value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="26.38" className="mt-1 h-9 font-mono text-xs" data-testid="field-report-lat" />
              </div>
              <div>
                <Label className="text-xs">Longitude</Label>
                <Input value={form.lon} onChange={(e) => set("lon", e.target.value)} placeholder="92.12" className="mt-1 h-9 font-mono text-xs" data-testid="field-report-lon" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/55">
              <MapPin className="h-3 w-3" /> Click anywhere on the map to fill coordinates.
            </div>
            <div>
              <Label className="text-xs">Photo (optional)</Label>
              <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-foreground/70 hover:bg-white/5">
                <Camera className="h-4 w-4" /> {form.photo_data_url ? "Photo attached - click to replace" : "Attach photo"}
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" data-testid="field-report-photo" />
              </label>
              {form.photo_data_url && <img src={form.photo_data_url} alt="preview" className="mt-2 max-h-32 rounded-md border border-border/60" data-testid="field-report-photo-preview" />}
            </div>
            <div>
              <Label className="text-xs">Reporter</Label>
              <Input value={form.reporter} onChange={(e) => set("reporter", e.target.value)} className="mt-1 h-9" data-testid="field-report-reporter" />
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="field-report-submit">
              <Send className="h-4 w-4" /> {busy ? "Saving..." : "Submit report"}
            </Button>
          </form>
        </Section>

        <div className="space-y-3">
          <Section title="Report map" className="overflow-hidden">
            <div className="h-[380px] overflow-hidden rounded-md">
              <SurakshaMap geojson={geo.data} habitations={habs.data?.habitations || []} reports={reports.data?.field_reports || []} sites={[]} layers={{ districts: true, habitations: true, buffers: false, sites: false, infrastructure: false, routes: false, reports: true }} basemap="streets" onMapClick={({ lat, lon }) => { set("lat", lat.toFixed(5)); set("lon", lon.toFixed(5)); toast.message(`Coordinates set: ${coord(lat, lon)}`); }} showDistrictLabels={false} zoom={8} />
            </div>
          </Section>
          <Section title={`Logged reports (${reports.data?.count ?? 0})`}>
            {reports.error && <ErrorState error={reports.error} onRetry={reports.reload} />}
            <div className="space-y-2" data-testid="field-report-list">
              {(reports.data?.field_reports || []).map((r) => (
                <div key={r.id} className="flex gap-3 rounded-md border border-border/60 p-2.5" data-testid={`field-report-${r.id}`}>
                  {r.photo_data_url ? <img src={r.photo_data_url} alt="" className="h-16 w-20 shrink-0 rounded object-cover" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded bg-white/5 text-foreground/30"><Camera className="h-4 w-4" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip chip-${{ Critical: "critical", High: "high", Watch: "watch", Information: "neutral" }[r.severity]}`}>{r.severity}</span>
                      <span className="text-sm font-medium">{r.incident_type}</span>
                      <span className="text-xs text-foreground/60">{r.location_name}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-foreground/75">{r.description}</div>
                    <div className="mt-1 font-mono text-[10px] text-foreground/50">
                      {coord(r.lat, r.lon)} · {ts(r.timestamp)} · {r.reporter}
                    </div>
                  </div>
                  <button onClick={() => remove(r.id)} className="self-start rounded-md p-1.5 text-foreground/40 hover:bg-white/5 hover:text-critical" title="Delete" data-testid={`field-report-delete-${r.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!reports.loading && !reports.data?.count && <div className="text-xs text-foreground/50">No reports logged yet.</div>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
