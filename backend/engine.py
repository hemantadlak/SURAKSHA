"""
SURAKSHA prototype scoring engine.

Transparent, weighted-overlay scoring. Every weight used here is exposed to the UI and
labelled "Prototype scoring model - not an official government formula".
"""
from __future__ import annotations

import json
import math
from copy import deepcopy
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"

MODEL_LABEL = "Prototype scoring model - not an official government formula"
ILLUSTRATIVE_LABEL = "Prototype / Illustrative Data"


def _load(name: str) -> Any:
    with open(DATA_DIR / name, "r", encoding="utf-8") as fh:
        return json.load(fh)


DISTRICTS_RAW = _load("districts.json")
HABITATIONS_RAW = _load("habitations.json")
SITES_RAW = _load("sites.json")
HAZARD_PROFILES_RAW = _load("hazard_profiles.json")
INFRASTRUCTURE_RAW = _load("infrastructure.json")
GEOJSON_RAW = _load("assam_districts.geojson")

DISTRICTS: dict[str, dict] = {d["id"]: d for d in DISTRICTS_RAW["districts"]}
HABITATIONS: dict[str, dict] = {h["id"]: h for h in HABITATIONS_RAW["habitations"]}
SITES: dict[str, dict] = {s["id"]: s for s in SITES_RAW["sites"]}
HAZARD_TYPES: list[dict] = HAZARD_PROFILES_RAW["hazard_types"]
DEFAULT_PROFILES: dict[str, dict] = HAZARD_PROFILES_RAW["profiles"]

# ---------------------------------------------------------------------------
# Visible weights (all configurable planning assumptions)
# ---------------------------------------------------------------------------
GIS_LAYER_WEIGHTS = {
    "rainfall": 0.25,
    "elevation": 0.20,
    "slope": 0.15,
    "soil": 0.10,
    "land_cover": 0.10,
    "distance_to_water": 0.10,
    "historical_extent": 0.10,
}
GIS_LAYER_META = {
    "rainfall": {"label": "Rainfall", "source": "IMD gridded rainfall", "unit": "mm/season"},
    "elevation": {"label": "Elevation", "source": "SRTM / ASTER DEM", "unit": "m"},
    "slope": {"label": "Slope", "source": "Derived from DEM", "unit": "deg"},
    "soil": {"label": "Soil", "source": "NBSS-LUP soil maps", "unit": ""},
    "land_cover": {"label": "Land cover", "source": "Bhuvan LULC", "unit": ""},
    "distance_to_water": {"label": "Distance from river", "source": "OSM hydrology / CWC", "unit": "km"},
    "historical_extent": {"label": "Historical flood extent", "source": "ASDMA bulletins / Bhuvan inventory", "unit": "yrs flooded of 5"},
    "population_exposure": {"label": "Population exposure", "source": "Census 2011 + OSM footprints", "unit": ""},
}

RISK_WEIGHTS = {
    "hazard_composite": 0.50,
    "population_exposure": 0.25,
    "disaster_history": 0.15,
    "infrastructure_risk": 0.10,
}
RISK_LEVELS = [(70, "RED ZONE", "red"), (50, "HIGH RISK", "orange"), (30, "WATCH", "yellow"), (0, "SAFER", "green")]

PRIORITY_WEIGHTS = {
    "hazard_risk": 0.35,
    "population_exposure": 0.25,
    "vulnerability": 0.20,
    "historical_hazard": 0.10,
    "infrastructure_exposure": 0.10,
}
PRIORITY_CLASSES = [(70, "IMMEDIATE"), (55, "SHORT-TERM"), (40, "MEDIUM-TERM"), (0, "MONITOR")]
PRIORITY_ACTIONS = {
    "IMMEDIATE": "Initiate pre-emptive relocation planning; verify safe-site capacity and route before onset of peak flow",
    "SHORT-TERM": "Prepare relocation plan within the current season; pre-position relief and confirm shelter availability",
    "MEDIUM-TERM": "Strengthen embankment / early-warning coverage; review exposure annually",
    "MONITOR": "Continue monitoring; no relocation action indicated at present",
}

VULNERABILITY_WEIGHTS = {
    "vulnerable_groups": 0.35,
    "kutcha_housing": 0.30,
    "bpl_households": 0.20,
    "road_isolation": 0.15,
}

SITE_EXPOSURE_WEIGHTS = {
    "historical_extent": 0.35,
    "distance_to_water": 0.25,
    "elevation": 0.25,
    "terrain_soil": 0.15,
}
SITE_UNSAFE_THRESHOLD = 6.0  # site hazard exposure >= this => REJECTED regardless of capacity
SITE_MIN_INFRA = 2.0  # infrastructure readiness < this => not habitable
SITE_MAX_DISTANCE_KM = 25.0  # beyond this planning radius a site is capped at CONDITIONAL
SITE_SEARCH_RADIUS_KM = 45.0

SUITABILITY_WEIGHTS = {
    "safety": 0.35,
    "available_capacity": 0.20,
    "accessibility": 0.15,
    "infrastructure_readiness": 0.15,
    "distance": 0.15,
}
SUITABILITY_THRESHOLDS = {"recommended": 6.5, "conditional": 4.5}

ROUTE_WEIGHTS = {"hazard_exposure": 0.45, "distance": 0.35, "accessibility": 0.20}
ROUTE_HAZARD_BUFFER_KM = 3.0

RESOURCE_ASSUMPTIONS = {
    "persons_per_bus_trip": 50,
    "drinking_water_l_per_person_day": 15,
    "dry_ration_kg_per_person_day": 0.5,
    "persons_per_medical_team": 1000,
    "persons_per_tent": 5,
    "label": "Planning assumptions (prototype; configurable) - Sphere-style indicative figures, not a mandated standard",
}

SOIL_FLOOD = {"clay": 9, "silty_clay": 8, "sandy_silt_char": 7, "silt_loam": 6, "loam": 4, "sandy_loam": 3, "sand": 2, "lateritic": 3, "colluvial": 4}
SOIL_LABEL = {"clay": "Clay (poor drainage)", "silty_clay": "Silty clay (poor drainage)", "sandy_silt_char": "Sandy silt - char alluvium (unstable, erodible)", "silt_loam": "Silt loam (moderate drainage)", "loam": "Loam (good drainage)", "sandy_loam": "Sandy loam (well drained)", "sand": "Sand (rapid drainage)", "lateritic": "Lateritic", "colluvial": "Colluvial (slope debris)"}
SOIL_LANDSLIDE = {"clay": 5, "silty_clay": 5, "sandy_silt_char": 4, "silt_loam": 5, "loam": 4, "sandy_loam": 6, "sand": 3, "lateritic": 7, "colluvial": 8}
LAND_COVER_FLOOD = {"floodplain_wetland": 9, "char_agriculture": 8, "agriculture": 5, "built_up_dense": 7, "built_up_sparse": 5, "vegetation": 3, "forest": 2, "open_ground": 5}
LAND_COVER_LABEL = {"floodplain_wetland": "Floodplain / wetland", "char_agriculture": "Char agriculture (seasonal sandbar)", "agriculture": "Agricultural land", "built_up_dense": "Built-up (dense)", "built_up_sparse": "Built-up (sparse)", "vegetation": "Vegetation", "forest": "Forest", "open_ground": "Open ground"}
ROAD_LABEL = {"all_weather": "All-weather road", "fair_weather": "Fair-weather road", "track": "Earthen track / boat access"}


def clamp(v: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, v))


def r1(v: float) -> float:
    return round(float(v), 1)


def r2(v: float) -> float:
    return round(float(v), 2)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Layer normalisers (0-10)
# ---------------------------------------------------------------------------
def rainfall_score(mm: float) -> float:
    return clamp((mm - 1500) / (3500 - 1500) * 10)


def elevation_flood_score(m: float) -> float:
    # 30 m -> 10 (low-lying), 80 m -> 0
    return clamp((80 - m) / 50 * 10)


def slope_flood_score(deg: float) -> float:
    if deg < 0.5:
        return 8
    if deg < 1:
        return 6
    if deg < 3:
        return 4
    if deg < 8:
        return 2
    return 1


def slope_landslide_score(deg: float) -> float:
    return clamp(deg / 25 * 10)


def distance_water_score(km: float) -> float:
    if km < 0.5:
        return 10
    if km < 1:
        return 9
    if km < 2:
        return 8
    if km < 3:
        return 7
    if km < 5:
        return 5
    if km < 8:
        return 3
    if km < 12:
        return 2
    return 1


def history_score(years: int) -> float:
    return clamp(years * 2)


def density_score(d: float) -> float:
    return clamp(d / 1200 * 10)


# ---------------------------------------------------------------------------
# Hazard profile configuration (may be overridden at runtime by the API)
# ---------------------------------------------------------------------------
_profiles_override: dict[str, dict] | None = None


def get_profiles() -> dict[str, dict]:
    return deepcopy(_profiles_override or DEFAULT_PROFILES)


def set_profiles(profiles: dict[str, dict] | None) -> None:
    global _profiles_override
    _profiles_override = deepcopy(profiles) if profiles else None


def profile_weights(profile_id: str) -> dict[str, float]:
    return get_profiles()[profile_id]["weights"]


# ---------------------------------------------------------------------------
# GIS overlay -> flood / landslide sub-scores
# ---------------------------------------------------------------------------
def gis_layer_scores(gis: dict) -> dict[str, dict]:
    soil = gis.get("soil", "loam")
    lc = gis.get("land_cover", "agriculture")
    layers = {
        "rainfall": {"value": gis["rainfall_mm"], "display": f'{gis["rainfall_mm"]:,} mm', "score": rainfall_score(gis["rainfall_mm"])},
        "elevation": {"value": gis["elevation_m"], "display": f'{gis["elevation_m"]} m', "score": elevation_flood_score(gis["elevation_m"])},
        "slope": {"value": gis["slope_deg"], "display": f'{gis["slope_deg"]} deg', "score": slope_flood_score(gis["slope_deg"])},
        "soil": {"value": soil, "display": SOIL_LABEL.get(soil, soil), "score": SOIL_FLOOD.get(soil, 4)},
        "land_cover": {"value": lc, "display": LAND_COVER_LABEL.get(lc, lc), "score": LAND_COVER_FLOOD.get(lc, 5)},
        "distance_to_water": {"value": gis["distance_to_water_km"], "display": f'{gis["distance_to_water_km"]} km', "score": distance_water_score(gis["distance_to_water_km"])},
        "historical_extent": {"value": gis["years_flooded_5yr"], "display": f'{gis["years_flooded_5yr"]} of last 5 yrs', "score": history_score(gis["years_flooded_5yr"])},
    }
    for k, v in layers.items():
        v["weight"] = GIS_LAYER_WEIGHTS[k]
        v["weighted"] = r2(v["score"] * v["weight"])
        v["score"] = r1(v["score"])
        v.update(GIS_LAYER_META[k])
    return layers


def flood_subscore(gis: dict) -> tuple[float, dict]:
    layers = gis_layer_scores(gis)
    total = sum(v["score"] * v["weight"] for v in layers.values())
    return clamp(total), layers


def landslide_subscore(gis: dict, past_events: int = 0) -> tuple[float, dict]:
    soil = gis.get("soil", "loam")
    parts = {
        "slope": {"label": "Slope angle", "value": f'{gis["slope_deg"]} deg', "score": r1(slope_landslide_score(gis["slope_deg"])), "weight": 0.40},
        "rainfall": {"label": "Rainfall saturation", "value": f'{gis["rainfall_mm"]:,} mm', "score": r1(rainfall_score(gis["rainfall_mm"])), "weight": 0.25},
        "soil": {"label": "Soil weakness", "value": SOIL_LABEL.get(soil, soil), "score": r1(SOIL_LANDSLIDE.get(soil, 4)), "weight": 0.20},
        "past_events": {"label": "Past landslide events", "value": f"{past_events}", "score": r1(clamp(past_events * 3)), "weight": 0.15},
    }
    total = sum(p["score"] * p["weight"] for p in parts.values())
    return clamp(total), parts


def earthquake_subscore(district: dict, gis: dict, social: dict) -> tuple[float, dict]:
    zone = district.get("seismic_zone", 5)
    base = {5: 7.0, 4: 5.0, 3: 3.0, 2: 1.5}.get(zone, 3.0)
    liquefaction = 1.5 if (gis.get("soil") in ("sandy_silt_char", "sand", "sandy_loam", "silt_loam") and gis["elevation_m"] < 45 and gis["distance_to_water_km"] < 2) else 0.0
    housing = social.get("kutcha_housing_pct", 40) / 100 * 1.5
    parts = {
        "seismic_zone": {"label": f"BIS seismic zone {zone}", "score": base},
        "liquefaction_proxy": {"label": "Soil liquefaction proxy", "score": liquefaction},
        "housing_vulnerability": {"label": "Non-engineered (kutcha) housing", "score": r1(housing)},
    }
    return clamp(base + liquefaction + housing), parts


def hazard_subscores(district: dict, gis: dict, social: dict, indicators: dict, history: dict) -> dict[str, dict]:
    flood, flood_layers = flood_subscore(gis)
    landslide, landslide_parts = landslide_subscore(gis, history.get("past_landslide_events", 0))
    eq, eq_parts = earthquake_subscore(district, gis, social)
    subs = {
        "flood": {"score": r1(flood), "detail": flood_layers, "data_status": "Seed data (ASDMA-derived) + representative GIS layers"},
        "landslide": {"score": r1(landslide), "detail": landslide_parts, "data_status": ILLUSTRATIVE_LABEL},
        "earthquake": {"score": r1(eq), "detail": eq_parts, "data_status": "BIS zone (real) + illustrative proxies"},
        "cloudburst": {"score": r1(clamp(indicators.get("peak_rain_intensity_mm_hr", 0) / 120 * 10)), "detail": {"peak_rain_intensity_mm_hr": indicators.get("peak_rain_intensity_mm_hr")}, "data_status": ILLUSTRATIVE_LABEL},
        "lightning": {"score": r1(clamp(indicators.get("lightning_strike_density", 0) / 30 * 10)), "detail": {"strike_density_per_km2_yr": indicators.get("lightning_strike_density")}, "data_status": ILLUSTRATIVE_LABEL},
        "heatwave": {"score": r1(clamp(indicators.get("heatwave_days_per_year", 0) / 20 * 10)), "detail": {"heatwave_days_per_year": indicators.get("heatwave_days_per_year")}, "data_status": ILLUSTRATIVE_LABEL},
        "cyclone": {"score": r1(clamp(indicators.get("cyclone_wind_exposure", 0))), "detail": {"wind_exposure_index": indicators.get("cyclone_wind_exposure")}, "data_status": ILLUSTRATIVE_LABEL},
        "fire": {"score": r1(clamp(indicators.get("fire_alerts_5yr", 0) / 10 * 10)), "detail": {"fire_alerts_5yr": indicators.get("fire_alerts_5yr")}, "data_status": ILLUSTRATIVE_LABEL},
        "coastal_erosion": {"score": None, "detail": {}, "data_status": "Not applicable - inland district"},
    }
    return subs


def composite_hazard(subs: dict[str, dict], weights: dict[str, float]) -> tuple[float, list[dict]]:
    total_w = 0.0
    total = 0.0
    contributions = []
    for hz, w in weights.items():
        s = subs.get(hz, {}).get("score")
        if s is None or w <= 0:
            continue
        total += s * w
        total_w += w
        contributions.append({"hazard": hz, "weight": w, "score": s, "weighted": r2(s * w)})
    if total_w == 0:
        return 0.0, contributions
    composite = total / total_w
    contributions.sort(key=lambda c: c["weighted"], reverse=True)
    return clamp(composite), contributions


# ---------------------------------------------------------------------------
# Habitation-level scoring
# ---------------------------------------------------------------------------
def infrastructure_risk(infra: dict, history: dict) -> tuple[float, list[dict]]:
    items = []
    road = infra.get("road_type", "all_weather")
    road_pts = {"track": 3, "fair_weather": 2, "all_weather": 0}[road]
    items.append({"factor": ROAD_LABEL[road], "points": road_pts})
    hd = infra.get("hospital_distance_km", 5)
    hosp_pts = 2 if hd > 15 else (1 if hd > 8 else 0)
    items.append({"factor": f"Nearest hospital {hd} km", "points": hosp_pts})
    if infra.get("embankment_within_2km"):
        emb_pts = 3 if history.get("embankment_breaches_5yr", 0) > 0 else 1
        items.append({"factor": f'Embankment within 2 km ({history.get("embankment_breaches_5yr", 0)} breaches in 5 yrs)', "points": emb_pts})
    if infra.get("school_in_floodplain"):
        items.append({"factor": "School / anganwadi inside floodplain", "points": 2})
    total = clamp(sum(i["points"] for i in items))
    return total, items


def vulnerability_score(social: dict, infra: dict) -> tuple[float, dict]:
    road = infra.get("road_type", "all_weather")
    road_v = {"track": 10, "fair_weather": 6, "all_weather": 0}[road]
    parts = {
        "vulnerable_groups": {"label": "Children, elderly & PwD share", "value": f'{social["vulnerable_groups_pct"]}%', "score": r1(clamp(social["vulnerable_groups_pct"] / 40 * 10)), "weight": VULNERABILITY_WEIGHTS["vulnerable_groups"]},
        "kutcha_housing": {"label": "Kutcha (non-permanent) housing", "value": f'{social["kutcha_housing_pct"]}%', "score": r1(clamp(social["kutcha_housing_pct"] / 10)), "weight": VULNERABILITY_WEIGHTS["kutcha_housing"]},
        "bpl_households": {"label": "Below-poverty-line households", "value": f'{social["bpl_pct"]}%', "score": r1(clamp(social["bpl_pct"] / 10)), "weight": VULNERABILITY_WEIGHTS["bpl_households"]},
        "road_isolation": {"label": "Access isolation", "value": ROAD_LABEL[road], "score": r1(road_v), "weight": VULNERABILITY_WEIGHTS["road_isolation"]},
    }
    for p in parts.values():
        p["weighted"] = r2(p["score"] * p["weight"])
    total = sum(p["score"] * p["weight"] for p in parts.values())
    return clamp(total), parts


def classify(score: float, table: list[tuple]) -> tuple:
    for threshold, *rest in table:
        if score >= threshold:
            return tuple(rest)
    return tuple(table[-1][1:])


def score_habitation(hab_id: str) -> dict:
    h = HABITATIONS[hab_id]
    d = DISTRICTS[h["district"]]
    weights = profile_weights(d["hazard_profile"])
    subs = hazard_subscores(d, h["gis"], h["social"], h["indicators"], h["history"])
    hazard, hazard_contrib = composite_hazard(subs, weights)

    exposed_pct = h["exposed_pct"]
    pop_exposed = int(round(h["population"] * exposed_pct))
    dens = h["gis"]["population_density_per_km2"]
    exposure = clamp(0.6 * exposed_pct * 10 + 0.4 * density_score(dens))

    hist = clamp(h["gis"]["years_flooded_5yr"] * 1.6 + h["history"].get("embankment_breaches_5yr", 0) * 1.0)
    infra_risk, infra_items = infrastructure_risk(h["infra"], h["history"])
    vuln, vuln_parts = vulnerability_score(h["social"], h["infra"])

    risk_factors = {
        "hazard_composite": hazard,
        "population_exposure": exposure,
        "disaster_history": hist,
        "infrastructure_risk": infra_risk,
    }
    risk_score = sum(RISK_WEIGHTS[k] * v * 10 for k, v in risk_factors.items())
    risk_score = int(round(clamp(risk_score, 0, 100)))
    level, color = classify(risk_score, RISK_LEVELS)

    priority_factors = {
        "hazard_risk": hazard,
        "population_exposure": exposure,
        "vulnerability": vuln,
        "historical_hazard": hist,
        "infrastructure_exposure": infra_risk,
    }
    priority_score = sum(PRIORITY_WEIGHTS[k] * v * 10 for k, v in priority_factors.items())
    priority_score = int(round(clamp(priority_score, 0, 100)))
    (priority_class,) = classify(priority_score, PRIORITY_CLASSES)

    dominant = hazard_contrib[0]["hazard"] if hazard_contrib else "flood"

    return {
        "id": h["id"],
        "name": h["name"],
        "district": d["name"],
        "district_id": d["id"],
        "block": h.get("block"),
        "lat": h["lat"],
        "lon": h["lon"],
        "population": h["population"],
        "households": h["households"],
        "exposed_pct": exposed_pct,
        "population_exposed": pop_exposed,
        "population_requiring_relocation": pop_exposed,
        "risk_score": risk_score,
        "risk_level": level,
        "risk_color": color,
        "hazard_composite": r1(hazard),
        "dominant_hazard": dominant,
        "hazard_subscores": {k: v["score"] for k, v in subs.items()},
        "hazard_contributions": hazard_contrib,
        "hazard_profile": d["hazard_profile"],
        "hazard_weights": weights,
        "risk_factors": [
            {"factor": k, "label": {"hazard_composite": "Hazard composite", "population_exposure": "Population exposure", "disaster_history": "Disaster history", "infrastructure_risk": "Infrastructure risk"}[k], "score": r1(v), "weight": RISK_WEIGHTS[k], "contribution": r1(RISK_WEIGHTS[k] * v * 10)}
            for k, v in risk_factors.items()
        ],
        "vulnerability_score": r1(vuln),
        "vulnerability_parts": vuln_parts,
        "infrastructure_risk": r1(infra_risk),
        "infrastructure_items": infra_items,
        "disaster_history_score": r1(hist),
        "priority_score": priority_score,
        "priority_class": priority_class,
        "priority_factors": [
            {"factor": k, "label": {"hazard_risk": "Hazard risk", "population_exposure": "Population exposure", "vulnerability": "Vulnerability", "historical_hazard": "Historical hazard", "infrastructure_exposure": "Critical infrastructure exposure"}[k], "score": r1(v), "weight": PRIORITY_WEIGHTS[k], "contribution": r1(PRIORITY_WEIGHTS[k] * v * 10)}
            for k, v in priority_factors.items()
        ],
        "recommended_action": PRIORITY_ACTIONS[priority_class],
        "gis_layers": subs["flood"]["detail"],
        "hazard_detail": {k: v["detail"] for k, v in subs.items()},
        "hazard_data_status": {k: v["data_status"] for k, v in subs.items()},
        "gis": h["gis"],
        "social": h["social"],
        "infra": {**h["infra"], "road_label": ROAD_LABEL[h["infra"]["road_type"]]},
        "history": h["history"],
        "indicators": h["indicators"],
        "notes": h.get("notes", ""),
        "labels": {"model": MODEL_LABEL, "data": ILLUSTRATIVE_LABEL, "classification": "Prototype classification - not an official red-zone declaration"},
    }


def score_all_habitations() -> list[dict]:
    items = [score_habitation(hid) for hid in HABITATIONS]
    items.sort(key=lambda x: (-x["priority_score"], -x["risk_score"]))
    for i, it in enumerate(items, start=1):
        it["priority_rank"] = i
    return items


# ---------------------------------------------------------------------------
# Site scoring
# ---------------------------------------------------------------------------
def site_exposure(site: dict) -> tuple[float, dict]:
    gis = site["gis"]
    d = DISTRICTS[site["district"]]
    terrain = (slope_flood_score(gis["slope_deg"]) + SOIL_FLOOD.get(gis.get("soil", "loam"), 4)) / 2
    parts = {
        "historical_extent": {"label": "Historical inundation", "value": f'{gis["years_flooded_5yr"]} of last 5 yrs', "score": r1(history_score(gis["years_flooded_5yr"])), "weight": SITE_EXPOSURE_WEIGHTS["historical_extent"]},
        "distance_to_water": {"label": "Distance from river", "value": f'{gis["distance_to_water_km"]} km', "score": r1(distance_water_score(gis["distance_to_water_km"])), "weight": SITE_EXPOSURE_WEIGHTS["distance_to_water"]},
        "elevation": {"label": "Elevation", "value": f'{gis["elevation_m"]} m', "score": r1(elevation_flood_score(gis["elevation_m"])), "weight": SITE_EXPOSURE_WEIGHTS["elevation"]},
        "terrain_soil": {"label": "Terrain & soil drainage", "value": f'{gis["slope_deg"]} deg, {SOIL_LABEL.get(gis.get("soil"), gis.get("soil"))}', "score": r1(terrain), "weight": SITE_EXPOSURE_WEIGHTS["terrain_soil"]},
    }
    for p in parts.values():
        p["weighted"] = r2(p["score"] * p["weight"])
    flood_inundation = sum(p["score"] * p["weight"] for p in parts.values())
    landslide, _ = landslide_subscore(gis, 0)
    if d["hazard_profile"] == "foothill":
        exposure = max(flood_inundation, landslide)
    else:
        exposure = flood_inundation
    return clamp(exposure), {"parts": parts, "flood_inundation": r1(flood_inundation), "landslide": r1(landslide)}


def infra_readiness(site: dict) -> tuple[float, list[dict]]:
    f = site["facilities"]
    items = [
        {"facility": "Drinking water", "available": f.get("water", False), "points": 2.5},
        {"facility": "Sanitation", "available": f.get("sanitation", False), "points": 2.5},
        {"facility": "Power", "available": f.get("power", False), "points": 1.5},
        {"facility": "Medical facility within 5 km", "available": f.get("medical_within_5km", False), "points": 2.0},
        {"facility": "Community kitchen", "available": f.get("kitchen", False), "points": 1.5},
    ]
    total = sum(i["points"] for i in items if i["available"])
    return clamp(total), items


def base_site(site_id: str) -> dict:
    s = SITES[site_id]
    exposure, exp_detail = site_exposure(s)
    infra, infra_items = infra_readiness(s)
    available = max(0, s["total_capacity"] - s["current_occupancy"])
    return {
        "id": s["id"],
        "name": s["name"],
        "type": s["type"],
        "district": DISTRICTS[s["district"]]["name"],
        "district_id": s["district"],
        "lat": s["lat"],
        "lon": s["lon"],
        "total_capacity": s["total_capacity"],
        "current_occupancy": s["current_occupancy"],
        "available_capacity": available,
        "hazard_exposure": r1(exposure),
        "safety_score": r1(10 - exposure),
        "is_safe": exposure < SITE_UNSAFE_THRESHOLD,
        "exposure_detail": exp_detail,
        "infrastructure_readiness": r1(infra),
        "facilities": infra_items,
        "road_type": s["access"]["road_type"],
        "road_label": ROAD_LABEL[s["access"]["road_type"]],
        "road_name": s["access"].get("road_name", ""),
        "elevation_m": s["gis"]["elevation_m"],
        "notes": s.get("notes", ""),
    }


def all_sites() -> list[dict]:
    return [base_site(sid) for sid in SITES]


def rank_sites_for(hab_id: str) -> dict:
    hab = score_habitation(hab_id)
    required = hab["population_requiring_relocation"]
    hab_bank = DISTRICTS[hab["district_id"]].get("river_bank")
    candidates = []
    for sid in SITES:
        s = base_site(sid)
        # Crossing the Brahmaputra main channel during peak flow is not a viable relocation movement:
        # only sites on the same bank are considered.
        if hab_bank and DISTRICTS[s["district_id"]].get("river_bank") != hab_bank:
            continue
        dist = haversine_km(hab["lat"], hab["lon"], s["lat"], s["lon"])
        s["distance_km"] = round(dist, 1)
        candidates.append(s)
    candidates.sort(key=lambda x: x["distance_km"])
    within = [c for c in candidates if c["distance_km"] <= SITE_SEARCH_RADIUS_KM]
    search_extended = False
    if len(within) < 4:
        within = candidates[:4]
        search_extended = True

    ranked = []
    for s in within:
        safety = s["safety_score"]
        cap_ratio = s["available_capacity"] / max(1, required * 0.5)
        capacity_score = clamp(cap_ratio * 10)
        road_score = {"all_weather": 10, "fair_weather": 5, "track": 2}[s["road_type"]]
        accessibility = clamp(0.6 * road_score + 0.4 * (10 - min(s["distance_km"], 40) / 4))
        distance_score = clamp(10 - s["distance_km"] / 4)
        factors = {
            "safety": safety,
            "available_capacity": capacity_score,
            "accessibility": accessibility,
            "infrastructure_readiness": s["infrastructure_readiness"],
            "distance": distance_score,
        }
        suitability = sum(SUITABILITY_WEIGHTS[k] * v for k, v in factors.items())
        suitability = r1(clamp(suitability))

        reasons_for: list[str] = []
        reasons_against: list[str] = []
        gates: list[str] = []

        if not s["is_safe"]:
            gates.append(f'Unsafe: site hazard exposure {s["hazard_exposure"]}/10 exceeds the {SITE_UNSAFE_THRESHOLD}/10 safety threshold')
            reasons_against.append(f'Campus inundated in {SITES[s["id"]]["gis"]["years_flooded_5yr"]} of the last 5 monsoons; {s["elevation_m"]} m elevation, {SITES[s["id"]]["gis"]["distance_to_water_km"]} km from river')
            if s["available_capacity"] >= required * 0.5:
                reasons_against.append(f'Large capacity ({s["available_capacity"]:,} available) does NOT offset hazard exposure - relocating people here would move them into another hazard zone')
        else:
            reasons_for.append(f'Site hazard exposure {s["hazard_exposure"]}/10 is below the safety threshold ({SITES[s["id"]]["gis"]["years_flooded_5yr"]} of 5 yrs flooded, {s["elevation_m"]} m, {SITES[s["id"]]["gis"]["distance_to_water_km"]} km from river)')

        if s["available_capacity"] <= 0:
            gates.append("No available capacity - site is already full")
        elif s["available_capacity"] >= required:
            reasons_for.append(f'Can accommodate the full requirement ({s["available_capacity"]:,} available vs {required:,} required)')
        elif s["available_capacity"] >= required * 0.5:
            reasons_for.append(f'Can accommodate a major share ({s["available_capacity"]:,} of {required:,} required)')
        else:
            reasons_against.append(f'Limited capacity: {s["available_capacity"]:,} available vs {required:,} required - partial destination only')

        if s["infrastructure_readiness"] < SITE_MIN_INFRA:
            gates.append("Not habitable: no drinking water or sanitation facilities on site")
        elif s["infrastructure_readiness"] >= 8:
            reasons_for.append("Water, sanitation, power and medical access in place")
        else:
            missing = [f["facility"] for f in s["facilities"] if not f["available"]]
            if missing:
                reasons_against.append("Missing facilities: " + ", ".join(missing))

        if s["road_type"] == "all_weather":
            reasons_for.append(f'All-weather access via {s["road_name"] or "district road"}')
        else:
            reasons_against.append(f'{s["road_label"]} - access may be cut during peak flow')

        capped = False
        if s["distance_km"] > SITE_MAX_DISTANCE_KM:
            capped = True
            reasons_against.append(f'{s["distance_km"]} km transfer distance exceeds the {SITE_MAX_DISTANCE_KM:.0f} km planning radius - transport logistics required')
        elif s["distance_km"] <= 12:
            reasons_for.append(f'Short transfer distance ({s["distance_km"]} km)')

        if gates:
            status = "REJECTED"
        elif suitability >= SUITABILITY_THRESHOLDS["recommended"] and not capped:
            status = "RECOMMENDED"
        elif suitability >= SUITABILITY_THRESHOLDS["conditional"] or (capped and suitability >= SUITABILITY_THRESHOLDS["conditional"]):
            status = "CONDITIONAL"
        else:
            status = "REJECTED"
            reasons_against.append(f"Overall suitability {suitability}/10 below the {SUITABILITY_THRESHOLDS['conditional']} conditional threshold")

        ranked.append({
            **s,
            "required": required,
            "factors": [
                {"factor": k, "label": {"safety": "Safety", "available_capacity": "Available capacity", "accessibility": "Accessibility", "infrastructure_readiness": "Infrastructure readiness", "distance": "Distance"}[k], "score": r1(v), "weight": SUITABILITY_WEIGHTS[k], "weighted": r2(SUITABILITY_WEIGHTS[k] * v)}
                for k, v in factors.items()
            ],
            "suitability": suitability,
            "status": status,
            "gates": gates,
            "reasons_for": reasons_for,
            "reasons_against": reasons_against,
        })

    order = {"RECOMMENDED": 0, "CONDITIONAL": 1, "REJECTED": 2}
    ranked.sort(key=lambda x: (order[x["status"]], -x["suitability"]))
    for i, s in enumerate(ranked, start=1):
        s["rank"] = i

    return {
        "habitation": {k: hab[k] for k in ("id", "name", "district", "lat", "lon", "population", "population_exposed", "population_requiring_relocation", "risk_level", "risk_score", "priority_class", "priority_score")},
        "required": required,
        "sites": ranked,
        "search_rule": f"Candidate sites within {SITE_SEARCH_RADIUS_KM:.0f} km on the same bank of the Brahmaputra ({hab_bank} bank) - river crossing during peak flow is excluded from planning." + (" Fewer than 4 sites found in radius: search extended to the nearest 4 same-bank sites (distant sites are capped at CONDITIONAL)." if search_extended else ""),
        "search_extended": search_extended,
        "weights": SUITABILITY_WEIGHTS,
        "thresholds": {**SUITABILITY_THRESHOLDS, "unsafe_exposure": SITE_UNSAFE_THRESHOLD, "min_infra": SITE_MIN_INFRA, "max_distance_km": SITE_MAX_DISTANCE_KM},
        "labels": {"model": MODEL_LABEL, "data": ILLUSTRATIVE_LABEL},
    }


# ---------------------------------------------------------------------------
# Carrying capacity & allocation
# ---------------------------------------------------------------------------
def capacity_assessment(hab_id: str, utilization: float = 1.0) -> dict:
    ranking = rank_sites_for(hab_id)
    required = ranking["required"]
    usable = [s for s in ranking["sites"] if s["status"] in ("RECOMMENDED", "CONDITIONAL")]
    rejected = [s for s in ranking["sites"] if s["status"] == "REJECTED"]
    util = max(0.5, min(1.0, utilization))

    rows = []
    for s in usable + rejected:
        eff = int(math.floor(s["available_capacity"] * util)) if s["status"] != "REJECTED" else 0
        rows.append({
            "id": s["id"], "name": s["name"], "status": s["status"], "suitability": s["suitability"], "distance_km": s["distance_km"],
            "total_capacity": s["total_capacity"], "current_occupancy": s["current_occupancy"], "available_capacity": s["available_capacity"],
            "effective_capacity": eff, "hazard_exposure": s["hazard_exposure"], "gates": s["gates"],
        })

    total_capacity = sum(s["total_capacity"] for s in usable)
    total_occupancy = sum(s["current_occupancy"] for s in usable)
    total_available = sum(s["available_capacity"] for s in usable)
    effective = sum(r["effective_capacity"] for r in rows)
    excluded_capacity = sum(s["available_capacity"] for s in rejected)
    balance = effective - required
    return {
        "habitation": ranking["habitation"],
        "population_requiring_relocation": required,
        "total_site_capacity": total_capacity,
        "current_occupancy": total_occupancy,
        "available_capacity": total_available,
        "utilization_factor": util,
        "effective_safe_capacity": effective,
        "required_capacity": required,
        "balance": balance,
        "status": "SUFFICIENT" if balance >= 0 else "DEFICIT",
        "surplus": max(0, balance),
        "deficit": max(0, -balance),
        "excluded_unsafe_capacity": excluded_capacity,
        "sites": rows,
        "assumption": f"Effective safe capacity = sum over RECOMMENDED + CONDITIONAL sites of floor(available x utilization {util:.0%}). REJECTED sites contribute zero even if they have space. Configurable planning assumption - not a universal standard.",
        "labels": {"model": MODEL_LABEL},
    }


def relocation_plan(hab_id: str, utilization: float = 1.0) -> dict:
    cap = capacity_assessment(hab_id, utilization)
    required = cap["required_capacity"]
    remaining = required
    allocations = []
    for row in cap["sites"]:
        if row["status"] == "REJECTED":
            continue
        if remaining <= 0:
            break
        take = min(remaining, row["effective_capacity"])
        if take <= 0:
            continue
        remaining -= take
        allocations.append({
            "site_id": row["id"], "site_name": row["name"], "status": row["status"], "suitability": row["suitability"], "distance_km": row["distance_km"],
            "effective_capacity": row["effective_capacity"], "allocated": take,
            "share_pct": round(take / required * 100, 1) if required else 0,
            "remaining_after": row["effective_capacity"] - take,
        })
    total_alloc = sum(a["allocated"] for a in allocations)
    return {
        "habitation": cap["habitation"],
        "required": required,
        "utilization_factor": cap["utilization_factor"],
        "allocations": allocations,
        "total_allocated": total_alloc,
        "unallocated": remaining,
        "status": "CAPACITY SATISFIED" if remaining == 0 else "CAPACITY DEFICIT",
        "reconciles": total_alloc + remaining == required,
        "excluded_sites": [{"id": r["id"], "name": r["name"], "available_capacity": r["available_capacity"], "gates": r["gates"]} for r in cap["sites"] if r["status"] == "REJECTED"],
        "capacity": {k: cap[k] for k in ("effective_safe_capacity", "available_capacity", "total_site_capacity", "current_occupancy", "surplus", "deficit", "status")},
        "algorithm": "Greedy fill by suitability rank: RECOMMENDED sites first, then CONDITIONAL; each site filled up to its effective capacity; REJECTED sites never receive allocation. Explainable heuristic (no optimisation solver).",
        "labels": {"model": MODEL_LABEL},
    }


# ---------------------------------------------------------------------------
# Route hazard scoring (geometry supplied by routing.py)
# ---------------------------------------------------------------------------
def _resample(coords: list[list[float]], step_km: float = 0.5) -> list[list[float]]:
    if len(coords) < 2:
        return coords
    out = [coords[0]]
    carry = 0.0
    for (lat1, lon1), (lat2, lon2) in zip(coords[:-1], coords[1:]):
        seg = haversine_km(lat1, lon1, lat2, lon2)
        if seg == 0:
            continue
        pos = step_km - carry
        while pos < seg:
            t = pos / seg
            out.append([lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t])
            pos += step_km
        carry = seg - (pos - step_km)
    out.append(coords[-1])
    return out


def route_hazard_exposure(coords: list[list[float]], origin_hab_id: str, scored_habs: list[dict] | None = None) -> dict:
    habs = scored_habs or score_all_habitations()
    zones = [h for h in habs if h["risk_level"] in ("RED ZONE", "HIGH RISK")]
    origin = HABITATIONS[origin_hab_id]
    samples = _resample(coords)
    exposed = 0
    touched: dict[str, int] = {}
    for lat, lon in samples:
        if haversine_km(lat, lon, origin["lat"], origin["lon"]) <= 2.5:
            continue  # leaving the origin zone is unavoidable
        hit = None
        for z in zones:
            if z["id"] == origin_hab_id:
                continue
            if haversine_km(lat, lon, z["lat"], z["lon"]) <= ROUTE_HAZARD_BUFFER_KM:
                hit = z
                break
        if hit:
            exposed += 1
            touched[hit["name"]] = touched.get(hit["name"], 0) + 1
    considered = max(1, len([1 for lat, lon in samples if haversine_km(lat, lon, origin["lat"], origin["lon"]) > 2.5]))
    pct = exposed / considered
    return {
        "exposure_pct": round(pct * 100, 1),
        "exposed_km": round(exposed * 0.5, 1),
        "zones_crossed": [{"name": k, "km": round(v * 0.5, 1)} for k, v in touched.items()],
        "buffer_km": ROUTE_HAZARD_BUFFER_KM,
        "method": f"Share of 500 m route samples within {ROUTE_HAZARD_BUFFER_KM:.0f} km of another RED / HIGH-RISK habitation buffer (prototype proxy - not a live road-inundation feed)",
    }


def score_routes(routes: list[dict], site: dict) -> list[dict]:
    if not routes:
        return []
    max_d = max(r["distance_km"] for r in routes) or 1
    road_score = {"all_weather": 10, "fair_weather": 5, "track": 2}[site["road_type"]]
    scored = []
    for r in routes:
        dist_norm = r["distance_km"] / max_d * 10
        hz = r["hazard"]["exposure_pct"] / 10  # 0-10
        access_penalty = 10 - road_score
        cost = ROUTE_WEIGHTS["hazard_exposure"] * hz + ROUTE_WEIGHTS["distance"] * dist_norm + ROUTE_WEIGHTS["accessibility"] * access_penalty
        scored.append({**r, "accessibility_score": road_score, "route_cost": r2(cost)})
    scored.sort(key=lambda x: x["route_cost"])
    best = scored[0]
    for i, r in enumerate(scored):
        r["selected"] = i == 0
        r["rank"] = i + 1
    # explanation
    if len(scored) > 1:
        alt = scored[1]
        parts = []
        if best["distance_km"] > alt["distance_km"]:
            parts.append(f'{best["distance_km"] - alt["distance_km"]:.1f} km longer than {alt["label"]}')
        else:
            parts.append(f'{alt["distance_km"] - best["distance_km"]:.1f} km shorter than {alt["label"]}')
        if best["hazard"]["exposure_pct"] < alt["hazard"]["exposure_pct"]:
            parts.append(f'lower hazard exposure ({best["hazard"]["exposure_pct"]}% vs {alt["hazard"]["exposure_pct"]}% of route within red-zone buffers)')
        elif best["hazard"]["exposure_pct"] == alt["hazard"]["exposure_pct"]:
            parts.append(f'equal hazard exposure ({best["hazard"]["exposure_pct"]}%)')
        else:
            parts.append(f'higher hazard exposure ({best["hazard"]["exposure_pct"]}% vs {alt["hazard"]["exposure_pct"]}%) but shorter overall')
        best["selection_reason"] = f'{best["label"]}: ' + ", ".join(parts) + " - SELECTED"
        alt["selection_reason"] = f'{alt["label"]}: not selected (route cost {alt["route_cost"]} vs {best["route_cost"]})'
    else:
        best["selection_reason"] = f'{best["label"]}: only viable road route returned - SELECTED'
    return scored


# ---------------------------------------------------------------------------
# Aggregates: KPIs, districts, alerts
# ---------------------------------------------------------------------------
def kpis() -> dict:
    habs = score_all_habitations()
    sites = all_sites()
    red = [h for h in habs if h["risk_level"] == "RED ZONE"]
    high = [h for h in habs if h["risk_level"] == "HIGH RISK"]
    immediate = [h for h in habs if h["priority_class"] == "IMMEDIATE"]
    safe_sites = [s for s in sites if s["is_safe"] and s["infrastructure_readiness"] >= SITE_MIN_INFRA]
    safe_capacity = sum(s["available_capacity"] for s in safe_sites)
    required_immediate = sum(h["population_requiring_relocation"] for h in immediate)
    return {
        "critical_red_zones": len(red),
        "high_risk_habitations": len(red) + len(high),
        "population_at_risk": sum(h["population_exposed"] for h in red + high),
        "relocation_priority_immediate": len(immediate),
        "population_requiring_relocation_immediate": required_immediate,
        "available_safe_capacity": safe_capacity,
        "capacity_deficit": max(0, required_immediate - safe_capacity),
        "unsafe_capacity_excluded": sum(s["available_capacity"] for s in sites if not s["is_safe"]),
        "assessed_habitations": len(habs),
        "assessed_districts": len(DISTRICTS),
        "labels": {"data": ILLUSTRATIVE_LABEL, "model": MODEL_LABEL},
    }


def district_summaries() -> list[dict]:
    habs = score_all_habitations()
    out = []
    for d in DISTRICTS.values():
        dh = [h for h in habs if h["district_id"] == d["id"]]
        hz_avg = {}
        for hz in [t["id"] for t in HAZARD_TYPES]:
            vals = [h["hazard_subscores"][hz] for h in dh if h["hazard_subscores"].get(hz) is not None]
            hz_avg[hz] = r1(sum(vals) / len(vals)) if vals else None
        deaths_per_100k = round(d["deaths"] / d["total_affected"] * 100000, 1) if d["total_affected"] else 0
        out.append({
            "id": d["id"], "name": d["name"], "geo_match": d["geo_match"], "geo_note": d.get("geo_note"),
            "hazard_profile": d["hazard_profile"], "hazard_profile_label": get_profiles()[d["hazard_profile"]]["label"],
            "centroid": d["centroid"],
            "flood_events_5yr": d["flood_events_5yr"], "recurrence_count_5yr": d["flood_events_5yr"],
            "total_affected": d["total_affected"], "deaths": d["deaths"], "deaths_per_100k_affected": deaths_per_100k,
            "avg_severity_index": d["avg_severity_index"], "risk_category": d["risk_category"], "risk_note": d.get("risk_note"),
            "seismic_zone": d["seismic_zone"], "population_density_per_km2": d["population_density_per_km2"], "major_rivers": d["major_rivers"],
            "peak_day_snapshots": d["peak_day_snapshots"],
            "habitation_count": len(dh),
            "red_zone_count": len([h for h in dh if h["risk_level"] == "RED ZONE"]),
            "high_risk_count": len([h for h in dh if h["risk_level"] == "HIGH RISK"]),
            "population_exposed": sum(h["population_exposed"] for h in dh),
            "immediate_count": len([h for h in dh if h["priority_class"] == "IMMEDIATE"]),
            "max_risk_score": max([h["risk_score"] for h in dh], default=0),
            "avg_hazard_composite": r1(sum(h["hazard_composite"] for h in dh) / len(dh)) if dh else None,
            "hazard_avg": hz_avg,
        })
    order = {"Critical": 0, "Very High": 1, "High": 2, "Moderate": 3, "Low": 4}
    out.sort(key=lambda x: (order.get(x["risk_category"], 9), -x["avg_severity_index"]))
    return out


def severity_components() -> dict:
    """Show how a severity index can be composed from bulletin fields (normalised to max)."""
    fields = ["affected_population", "deaths", "displaced_population", "livestock_affected", "cropland_submerged_hectares"]
    weights = {"affected_population": 0.30, "deaths": 0.25, "displaced_population": 0.20, "livestock_affected": 0.10, "cropland_submerged_hectares": 0.15}
    snaps = []
    for d in DISTRICTS.values():
        for s in d["peak_day_snapshots"]:
            snaps.append({"district": d["name"], **s})
    maxes = {f: max(s[f] for s in snaps) or 1 for f in fields}
    rows = []
    for s in snaps:
        comp = {f: round(s[f] / maxes[f] * 10, 2) for f in fields}
        idx = sum(comp[f] * weights[f] for f in fields)
        rows.append({**s, "components": comp, "snapshot_severity_index": r1(idx)})
    rows.sort(key=lambda x: -x["snapshot_severity_index"])
    return {"weights": weights, "rows": rows, "label": MODEL_LABEL, "note": "Snapshot severity is computed from representative peak-day bulletin values normalised to the maximum across snapshots. District avg_severity_index in the seed table is the ASDMA-derived multi-year average."}


def enriched_geojson() -> dict:
    gj = deepcopy(GEOJSON_RAW)
    summaries = {d["geo_match"]: d for d in district_summaries()}
    for f in gj["features"]:
        name = f["properties"]["district"]
        s = summaries.get(name)
        if s:
            f["properties"].update({
                "assessed": True,
                "suraksha_id": s["id"],
                "display_name": s["name"],
                "risk_category": s["risk_category"],
                "avg_severity_index": s["avg_severity_index"],
                "flood_events_5yr": s["flood_events_5yr"],
                "total_affected": s["total_affected"],
                "deaths": s["deaths"],
                "red_zone_count": s["red_zone_count"],
                "population_exposed": s["population_exposed"],
                "hazard_avg": s["hazard_avg"],
                "geo_note": s.get("geo_note"),
            })
        else:
            f["properties"].update({"assessed": False, "display_name": name, "risk_category": "Not assessed"})
    return gj


def generate_alerts() -> list[dict]:
    habs = score_all_habitations()
    alerts = []
    for h in habs:
        if h["risk_level"] == "RED ZONE":
            sev = "CRITICAL"
        elif h["risk_level"] == "HIGH RISK":
            sev = "HIGH"
        elif h["risk_level"] == "WATCH":
            sev = "WATCH"
        else:
            continue
        alerts.append({
            "id": f"ALT-{h['id']}-RISK",
            "severity": sev,
            "type": "Habitation risk classification",
            "habitation_id": h["id"],
            "location": f'{h["name"]}, {h["district"]}',
            "lat": h["lat"], "lon": h["lon"],
            "message": f'{h["risk_level"]} - risk {h["risk_score"]}/100, {h["population_exposed"]:,} people exposed; dominant hazard: {h["dominant_hazard"]}',
            "recommended_action": h["recommended_action"],
            "priority_class": h["priority_class"],
        })
        if h["priority_class"] == "IMMEDIATE":
            cap = capacity_assessment(h["id"])
            if cap["status"] == "DEFICIT":
                alerts.append({
                    "id": f"ALT-{h['id']}-CAP",
                    "severity": "HIGH",
                    "type": "Carrying-capacity deficit",
                    "habitation_id": h["id"],
                    "location": f'{h["name"]}, {h["district"]}',
                    "lat": h["lat"], "lon": h["lon"],
                    "message": f'Effective safe capacity {cap["effective_safe_capacity"]:,} vs {cap["required_capacity"]:,} required - deficit of {cap["deficit"]:,}',
                    "recommended_action": "Identify additional safe sites or temporary shelter capacity before relocation is initiated",
                    "priority_class": h["priority_class"],
                })
    for s in all_sites():
        if not s["is_safe"]:
            alerts.append({
                "id": f"ALT-{s['id']}-UNSAFE",
                "severity": "INFORMATION",
                "type": "Shelter site flagged unsafe",
                "habitation_id": None,
                "location": f'{s["name"]}, {s["district"]}',
                "lat": s["lat"], "lon": s["lon"],
                "message": f'Site hazard exposure {s["hazard_exposure"]}/10 - excluded from relocation planning despite {s["available_capacity"]:,} available places',
                "recommended_action": "Do not assign relocated population to this site; review for flood-proofing",
                "priority_class": None,
            })
    order = {"CRITICAL": 0, "HIGH": 1, "WATCH": 2, "INFORMATION": 3}
    alerts.sort(key=lambda a: order[a["severity"]])
    return alerts


# ---------------------------------------------------------------------------
# Action plan
# ---------------------------------------------------------------------------
def resource_requirements(population: int, deficit: int, households: int) -> dict:
    a = RESOURCE_ASSUMPTIONS
    return {
        "bus_trips": math.ceil(population / a["persons_per_bus_trip"]),
        "drinking_water_l_per_day": population * a["drinking_water_l_per_person_day"],
        "dry_ration_kg_per_day": round(population * a["dry_ration_kg_per_person_day"]),
        "medical_teams": max(1, math.ceil(population / a["persons_per_medical_team"])),
        "relief_kits_households": households,
        "temporary_tents_for_deficit": math.ceil(deficit / a["persons_per_tent"]) if deficit > 0 else 0,
        "assumptions": a,
    }


def build_action_plan(hab_id: str, utilization: float, routes_by_site: dict[str, list[dict]] | None, incident: str) -> dict:
    hab = score_habitation(hab_id)
    ranking = rank_sites_for(hab_id)
    plan = relocation_plan(hab_id, utilization)
    cap = capacity_assessment(hab_id, utilization)

    recommended = [s for s in ranking["sites"] if s["status"] == "RECOMMENDED"]
    rejected = [s for s in ranking["sites"] if s["status"] == "REJECTED"]
    primary = plan["allocations"][0] if plan["allocations"] else None

    route_status = "Not computed"
    route_summary = []
    if routes_by_site:
        for sid, routes in routes_by_site.items():
            sel = next((r for r in routes if r.get("selected")), None)
            if sel:
                route_summary.append({"site_id": sid, "site_name": next((a["site_name"] for a in plan["allocations"] if a["site_id"] == sid), sid), "label": sel["label"], "distance_km": sel["distance_km"], "duration_min": sel.get("duration_min"), "hazard_exposure_pct": sel["hazard"]["exposure_pct"], "reason": sel.get("selection_reason"), "source": sel.get("source")})
        if route_summary:
            route_status = f'{len(route_summary)} hazard-aware route(s) selected'

    priority_label = {"IMMEDIATE": "High", "SHORT-TERM": "Medium-High", "MEDIUM-TERM": "Medium", "MONITOR": "Low"}[hab["priority_class"]]

    if hab["priority_class"] == "IMMEDIATE":
        if plan["status"] == "CAPACITY SATISFIED":
            action = f'Recommend that the DDMA consider initiating pre-emptive relocation of {plan["required"]:,} residents of {hab["name"]} to {len(plan["allocations"])} verified safe site(s) before the onset of peak flow, using the allocation below.'
        else:
            action = f'Recommend that the DDMA consider phased pre-emptive relocation of {hab["name"]}: {plan["total_allocated"]:,} residents can be accommodated at verified safe sites now; an additional {plan["unallocated"]:,} places must be secured (additional sites or temporary shelter) before full relocation is feasible.'
    elif hab["priority_class"] == "SHORT-TERM":
        action = f'Recommend preparing a relocation plan for {hab["name"]} within the current season, pre-positioning relief at the recommended sites and confirming shelter availability for {plan["required"]:,} exposed residents.'
    elif hab["priority_class"] == "MEDIUM-TERM":
        action = f'Recommend structural and early-warning measures for {hab["name"]} (embankment strengthening, flood-proofing of schools) with annual review; relocation not indicated at present.'
    else:
        action = f'Recommend continued monitoring of {hab["name"]}; no relocation action indicated.'

    reasons = [
        f'Risk score {hab["risk_score"]}/100 ({hab["risk_level"]}) driven mainly by {hab["dominant_hazard"]} (sub-score {hab["hazard_subscores"][hab["dominant_hazard"]]}/10)',
        f'{hab["population_exposed"]:,} of {hab["population"]:,} residents ({round(hab["exposed_pct"] * 100)}%) inside the hazard extent',
        f'Flooded in {hab["gis"]["years_flooded_5yr"]} of the last 5 years; {hab["history"]["embankment_breaches_5yr"]} embankment breach(es) nearby',
        f'Vulnerability {hab["vulnerability_score"]}/10 - {hab["social"]["kutcha_housing_pct"]}% kutcha housing, {hab["social"]["vulnerable_groups_pct"]}% children/elderly/PwD',
        f'Access: {hab["infra"]["road_label"]}; nearest hospital {hab["infra"]["hospital_distance_km"]} km',
    ]

    considerations = []
    if rejected:
        for s in rejected[:3]:
            considerations.append(f'{s["name"]} excluded: {s["gates"][0] if s["gates"] else "low suitability"} (would otherwise offer {s["available_capacity"]:,} places)')
    if plan["status"] == "CAPACITY DEFICIT":
        considerations.append(f'Capacity deficit of {plan["unallocated"]:,} - consider additional sites beyond the {SITE_SEARCH_RADIUS_KM:.0f} km search radius or temporary shelter (approx. {math.ceil(plan["unallocated"] / RESOURCE_ASSUMPTIONS["persons_per_tent"])} tents)')
    conditional = [a for a in plan["allocations"] if a["status"] == "CONDITIONAL"]
    if conditional:
        considerations.append("Conditional sites in the allocation require pre-deployment: " + "; ".join(f'{a["site_name"]}' for a in conditional))
    if hab["infra"]["road_type"] != "all_weather":
        considerations.append(f'Origin has {hab["infra"]["road_label"].lower()} - move before access is cut; boats may be required for the char stretch')
    considerations.append("Prioritise children, elderly, pregnant women and persons with disabilities in the first movement wave")
    considerations.append("Livestock and household assets: designate a separate high-ground holding area; ASDMA bulletins record large livestock losses in this basin")
    considerations.append("Verify current occupancy at destination sites on the day of movement - figures here are planning estimates")

    return {
        "incident": incident,
        "location": {"habitation": hab["name"], "district": hab["district"], "block": hab["block"], "lat": hab["lat"], "lon": hab["lon"]},
        "severity": {"risk_score": hab["risk_score"], "risk_level": hab["risk_level"], "hazard_composite": hab["hazard_composite"], "dominant_hazard": hab["dominant_hazard"], "hazard_subscores": hab["hazard_subscores"]},
        "population_at_risk": {"total": hab["population"], "exposed": hab["population_exposed"], "requiring_relocation": plan["required"], "households": hab["households"]},
        "relocation_priority": {"class": hab["priority_class"], "score": hab["priority_score"], "label": priority_label},
        "recommended_action": action,
        "priority_label": f"Priority: {priority_label}",
        "reasons": reasons,
        "recommended_sites": [{"id": s["id"], "name": s["name"], "suitability": s["suitability"], "available_capacity": s["available_capacity"], "distance_km": s["distance_km"]} for s in recommended],
        "rejected_sites": [{"id": s["id"], "name": s["name"], "available_capacity": s["available_capacity"], "reason": s["gates"][0] if s["gates"] else (s["reasons_against"][0] if s["reasons_against"] else "")} for s in rejected],
        "population_allocation": plan["allocations"],
        "allocation_totals": {"required": plan["required"], "allocated": plan["total_allocated"], "unallocated": plan["unallocated"], "status": plan["status"]},
        "capacity_status": {"status": cap["status"], "effective_safe_capacity": cap["effective_safe_capacity"], "required": cap["required_capacity"], "surplus": cap["surplus"], "deficit": cap["deficit"], "excluded_unsafe_capacity": cap["excluded_unsafe_capacity"]},
        "route_status": route_status,
        "routes": route_summary,
        "resource_requirements": resource_requirements(plan["required"], plan["unallocated"], hab["households"]),
        "key_considerations": considerations,
        "disclaimer": "Decision-support output generated by a prototype scoring model. This is a RECOMMENDATION for consideration by the competent authority (DDMA / SDMA). It is not an evacuation or relocation order, and the system has no authority to issue one.",
        "labels": {"model": MODEL_LABEL, "data": ILLUSTRATIVE_LABEL},
    }


def point_in_polygon(lat: float, lon: float, geometry: dict) -> bool:
    def _in_ring(x, y, ring):
        inside = False
        n = len(ring)
        j = n - 1
        for i in range(n):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi):
                inside = not inside
            j = i
        return inside

    polys = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    for poly in polys:
        if _in_ring(lon, lat, poly[0]):
            return True
    return False


def district_geometry(geo_match: str) -> dict | None:
    for f in GEOJSON_RAW["features"]:
        if f["properties"]["district"] == geo_match:
            return f["geometry"]
    return None
