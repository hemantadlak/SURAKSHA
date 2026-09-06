import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, Tooltip, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { BASEMAPS, habitationIcon, siteIcon, infraIcon, reportIcon, categoryColor, score10Color } from "@/components/map/mapIcons";
import { fmt, TONE_HEX, HAZARD_LABELS } from "@/lib/format";

const ASSAM_CENTER = [26.35, 91.6];

const ViewController = ({ focus, bounds, fitKey }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length) {
      try {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
      } catch (e) {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), focus.zoom || 10), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.lat, focus?.lon, focus?.key]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

const ClickCatcher = ({ onClick }) => {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return undefined;
    const h = (e) => onClick({ lat: e.latlng.lat, lon: e.latlng.lng });
    map.on("click", h);
    return () => map.off("click", h);
  }, [map, onClick]);
  return null;
};

/**
 * Reusable SURAKSHA GIS map.
 * props: geojson, lens ('composite' | hazard id), habitations[], selectedHabId, onSelectHabitation,
 *        sites[] (with optional status), routes[] ({geometry, selected, label, tone}), infrastructure[], reports[],
 *        layers {districts, habitations, sites, infrastructure, routes, reports, buffers}, basemap, focus, bounds, fitKey, onMapClick, onDistrictClick
 */
export const SurakshaMap = ({
  geojson,
  lens = "composite",
  habitations = [],
  selectedHabId,
  onSelectHabitation,
  sites = [],
  onSelectSite,
  routes = [],
  infrastructure = [],
  reports = [],
  layers = { districts: true, habitations: true, sites: true, infrastructure: false, routes: true, reports: true, buffers: true },
  basemap = "streets",
  focus,
  bounds,
  fitKey,
  onMapClick,
  onDistrictClick,
  center = ASSAM_CENTER,
  zoom = 8,
  className = "h-full w-full",
  showDistrictLabels = true,
  children,
}) => {
  const bm = BASEMAPS[basemap] || BASEMAPS.streets;

  const styleFeature = useMemo(
    () => (feature) => {
      const p = feature.properties || {};
      if (!p.assessed) return { color: "rgba(255,255,255,0.28)", weight: 1, fillColor: "#5b6472", fillOpacity: 0.06, dashArray: "3 4" };
      const color = lens === "composite" ? categoryColor(p.risk_category) : score10Color(p.hazard_avg?.[lens]);
      return { color, weight: 1.8, fillColor: color, fillOpacity: lens === "composite" ? 0.28 : 0.3 };
    },
    [lens]
  );

  const onEach = (feature, layer) => {
    const p = feature.properties || {};
    if (p.assessed) {
      const lensLine = lens === "composite" ? `Risk category: ${p.risk_category}` : `${HAZARD_LABELS[lens] || lens} avg: ${p.hazard_avg?.[lens] ?? "n/a"}/10`;
      layer.bindTooltip(`<div><strong>${p.display_name}</strong><br/>${lensLine}<br/>Severity ${p.avg_severity_index}/10 · ${p.flood_events_5yr} flood events (5 yr)<br/>${fmt(p.total_affected)} affected · ${p.deaths} deaths<br/><span style="opacity:.7">${p.red_zone_count} red-zone habitation(s)</span></div>`, { sticky: true });
      if (showDistrictLabels) {
        const c = layer.getBounds().getCenter();
        const lbl = L.tooltip({ permanent: true, direction: "center", className: "district-label", opacity: 0.9 }).setContent(p.display_name).setLatLng(c);
        layer.on("add", () => layer._map && lbl.addTo(layer._map));
        layer.on("remove", () => lbl.remove());
      }
      layer.on("click", () => onDistrictClick && onDistrictClick(p));
      layer.on("mouseover", () => layer.setStyle({ weight: 3, fillOpacity: 0.4 }));
      layer.on("mouseout", () => layer.setStyle(styleFeature(feature)));
    } else {
      layer.bindTooltip(`<div><strong>${p.display_name}</strong><br/><span style="opacity:.7">Not assessed in prototype</span></div>`, { sticky: true });
    }
  };

  const siteStatusMap = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s.status])), [sites]);

  return (
    <MapContainer center={center} zoom={zoom} className={className} zoomControl preferCanvas={false} data-testid="gis-map">
      <TileLayer key={basemap} url={bm.url} attribution={bm.attribution} maxZoom={18} />
      <ViewController focus={focus} bounds={bounds} fitKey={fitKey} />
      {onMapClick && <ClickCatcher onClick={onMapClick} />}

      {layers.districts && geojson && <GeoJSON key={`gj-${lens}-${showDistrictLabels}`} data={geojson} style={styleFeature} onEachFeature={onEach} />}

      {layers.buffers &&
        layers.habitations &&
        habitations
          .filter((h) => h.risk_level === "RED ZONE" || h.risk_level === "HIGH RISK")
          .map((h) => (
            <Circle key={`buf-${h.id}`} center={[h.lat, h.lon]} radius={3000} pathOptions={{ color: TONE_HEX[h.risk_level === "RED ZONE" ? "critical" : "high"], weight: 1, opacity: 0.5, fillOpacity: 0.08, dashArray: "4 4" }} interactive={false} />
          ))}

      {layers.routes &&
        routes.map((r, i) => (
          <Polyline
            key={`route-${r.id || i}-${r.selected}`}
            positions={r.geometry}
            pathOptions={{
              color: r.selected ? TONE_HEX.safe : r.tone ? TONE_HEX[r.tone] : "#9aa4b2",
              weight: r.selected ? 6 : 4,
              opacity: r.selected ? 0.95 : 0.7,
              dashArray: r.selected ? null : "8 8",
              lineCap: "round",
            }}
          >
            <Tooltip sticky>
              <div>
                <strong>{r.label}</strong> {r.selected ? "- SELECTED" : ""}
                <br />
                {r.distance_km} km · {r.duration_min ? `${r.duration_min} min` : ""}
                <br />
                Hazard exposure {r.hazard?.exposure_pct ?? "-"}%
              </div>
            </Tooltip>
          </Polyline>
        ))}

      {layers.infrastructure &&
        infrastructure.map((f) => (
          <Marker key={f.id} position={[f.lat, f.lon]} icon={infraIcon()} zIndexOffset={100}>
            <Tooltip direction="right">
              <strong>{f.name}</strong>
              <br />
              {f.type.replace("_", " ")}
            </Tooltip>
          </Marker>
        ))}

      {layers.sites &&
        sites.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={siteIcon(s, siteStatusMap[s.id])} zIndexOffset={200} eventHandlers={{ click: () => onSelectSite && onSelectSite(s) }}>
            <Tooltip direction="right">
              <div>
                <strong>{s.name}</strong>
                <br />
                {s.status ? `${s.status} · suitability ${s.suitability}/10` : s.is_safe ? "Safe site" : "Unsafe site (hazard exposure)"}
                <br />
                Available {fmt(s.available_capacity)} of {fmt(s.total_capacity)}
                {s.distance_km !== undefined ? ` · ${s.distance_km} km` : ""}
              </div>
            </Tooltip>
          </Marker>
        ))}

      {layers.reports &&
        reports.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lon]} icon={reportIcon(r.severity)} zIndexOffset={300}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{r.incident_type} · {r.severity}</div>
                <div>{r.location_name}</div>
                <div className="text-foreground/70">{r.description}</div>
                {r.photo_data_url && <img src={r.photo_data_url} alt="field report" className="mt-1 max-h-32 rounded" />}
                <div className="font-mono text-[10px] text-foreground/60">{r.timestamp}</div>
              </div>
            </Popup>
          </Marker>
        ))}

      {layers.habitations &&
        habitations.map((h) => (
          <Marker key={`${h.id}-${h.id === selectedHabId}`} position={[h.lat, h.lon]} icon={habitationIcon(h, h.id === selectedHabId)} zIndexOffset={h.id === selectedHabId ? 1000 : 500} eventHandlers={{ click: () => onSelectHabitation && onSelectHabitation(h) }}>
            <Tooltip direction="right">
              <div>
                <strong>{h.name}</strong> · {h.district}
                <br />
                Risk {h.risk_score}/100 · {h.risk_level}
                <br />
                {fmt(h.population_exposed)} exposed · {h.priority_class}
                <br />
                <span style={{ opacity: 0.7 }}>Dominant: {HAZARD_LABELS[h.dominant_hazard]}</span>
              </div>
            </Tooltip>
          </Marker>
        ))}
      {children}
    </MapContainer>
  );
};
