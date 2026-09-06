import L from "leaflet";
import { TONE_HEX } from "@/lib/format";

const PATHS = {
  flood: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  landslide: '<path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>',
  lightning: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  cloudburst: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
  earthquake: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  heatwave: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  cyclone: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  coastal_erosion: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  hospital: '<path d="M12 6v12"/><path d="M6 12h12"/>',
};

export const hazardSvg = (hz, size = 14) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${PATHS[hz] || PATHS.flood}</svg>`;

export const habitationIcon = (hab, selected = false) => {
  const color = TONE_HEX[{ "RED ZONE": "critical", "HIGH RISK": "high", WATCH: "watch", SAFER: "safe" }[hab.risk_level] || "neutral"];
  return L.divIcon({
    className: "",
    html: `<div class="hab-marker ${selected ? "selected" : ""}" style="--marker-color:${color}" data-testid="map-habitation-marker-${hab.id}">${hab.risk_level === "RED ZONE" ? '<span class="pulse"></span>' : ""}${hazardSvg(hab.dominant_hazard)}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    tooltipAnchor: [14, 0],
  });
};

export const siteIcon = (site, status) => {
  const tone = status ? { RECOMMENDED: "safe", CONDITIONAL: "watch", REJECTED: "critical" }[status] : site.is_safe === false ? "critical" : "neutral";
  return L.divIcon({
    className: "",
    html: `<div class="site-marker ${status === "REJECTED" || site.is_safe === false ? "rejected" : ""}" style="--marker-color:${TONE_HEX[tone]}" data-testid="map-site-marker-${site.id}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
    tooltipAnchor: [10, 0],
  });
};

export const infraIcon = () =>
  L.divIcon({ className: "", html: `<div class="infra-marker">${hazardSvg("hospital", 10)}</div>`, iconSize: [16, 16], iconAnchor: [8, 8], tooltipAnchor: [9, 0] });

export const reportIcon = (severity) => {
  const tone = { Critical: "critical", High: "high", Watch: "watch", Information: "neutral" }[severity] || "neutral";
  return L.divIcon({ className: "", html: `<div class="report-marker" style="--marker-color:${TONE_HEX[tone]}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10], tooltipAnchor: [10, 0] });
};

export const BASEMAPS = {
  streets: { label: "Streets (OSM)", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors", note: "OpenStreetMap standard tiles" },
  dark: { label: "Dark (ops)", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: "&copy; OpenStreetMap contributors &copy; CARTO", note: "Carto Dark Matter tiles" },
  terrain: { label: "Terrain", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)", note: "OpenTopoMap relief" },
  satellite: { label: "Satellite (Esri)", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles &copy; Esri - Source: Esri, Maxar, Earthstar Geographics", note: "Visual context only - scoring is not derived from imagery" },
};

export const categoryColor = (cat) => {
  switch (cat) {
    case "Critical":
      return TONE_HEX.critical;
    case "Very High":
      return "#ee6644";
    case "High":
      return TONE_HEX.high;
    case "Moderate":
      return TONE_HEX.watch;
    case "Low":
      return TONE_HEX.safe;
    default:
      return "#5b6472";
  }
};

export const score10Color = (s) => (s === null || s === undefined ? "#5b6472" : s >= 7 ? TONE_HEX.critical : s >= 5 ? TONE_HEX.high : s >= 3 ? TONE_HEX.watch : TONE_HEX.safe);
