"""
Hazard-aware route candidates for SURAKSHA.

Road geometry comes from the public OSRM demo router (OpenStreetMap data). Results are cached
in MongoDB (and in-process). If OSRM is unreachable, an illustrative straight-line + offset
geometry is returned and clearly labelled as such.
"""
from __future__ import annotations

import asyncio
import logging
import math
import os
from datetime import datetime, timezone
from typing import Any

import requests

import engine

logger = logging.getLogger("suraksha.routing")

OSRM_URL = os.environ.get("OSRM_URL", "https://router.project-osrm.org")
_mem_cache: dict[str, Any] = {}


def _key(points: list[tuple[float, float]], alternatives: bool) -> str:
    return "osrm:" + ";".join(f"{lat:.4f},{lon:.4f}" for lat, lon in points) + f":alt={int(alternatives)}"


def _osrm_sync(points: list[tuple[float, float]], alternatives: bool) -> dict | None:
    coords = ";".join(f"{lon},{lat}" for lat, lon in points)
    url = f"{OSRM_URL}/route/v1/driving/{coords}"
    params = {"overview": "full", "geometries": "geojson", "alternatives": "true" if alternatives else "false", "steps": "false"}
    try:
        resp = requests.get(url, params=params, timeout=12, headers={"User-Agent": "SURAKSHA-prototype/1.0"})
        if resp.status_code != 200:
            logger.warning("OSRM status %s: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        if data.get("code") != "Ok":
            return None
        return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("OSRM request failed: %s", exc)
        return None


async def osrm_route(points: list[tuple[float, float]], alternatives: bool, db=None) -> dict | None:
    key = _key(points, alternatives)
    if key in _mem_cache:
        return _mem_cache[key]
    if db is not None:
        try:
            doc = await db.route_cache.find_one({"key": key}, {"_id": 0})
            if doc:
                _mem_cache[key] = doc["response"]
                return doc["response"]
        except Exception as exc:  # noqa: BLE001
            logger.warning("route cache read failed: %s", exc)
    data = await asyncio.to_thread(_osrm_sync, points, alternatives)
    if data is None:
        return None
    slim = {
        "routes": [{"distance": r["distance"], "duration": r["duration"], "geometry": r["geometry"]} for r in data.get("routes", [])],
        "waypoints": [{"distance": w.get("distance", 0), "location": w.get("location")} for w in data.get("waypoints", [])],
    }
    _mem_cache[key] = slim
    if db is not None:
        try:
            await db.route_cache.update_one({"key": key}, {"$set": {"key": key, "response": slim, "created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("route cache write failed: %s", exc)
    return slim


def _offset_waypoint(a: tuple[float, float], b: tuple[float, float], km: float, side: int) -> tuple[float, float]:
    mid_lat = (a[0] + b[0]) / 2
    mid_lon = (a[1] + b[1]) / 2
    dlat = b[0] - a[0]
    dlon = (b[1] - a[1]) * math.cos(math.radians(mid_lat))
    norm = math.hypot(dlat, dlon) or 1e-9
    # perpendicular unit vector (in degree-ish space)
    px, py = -dlon / norm, dlat / norm
    deg = km / 111.0
    return (mid_lat + side * px * deg, mid_lon + side * py * deg / max(0.2, math.cos(math.radians(mid_lat))))


def _illustrative_geometry(a: tuple[float, float], b: tuple[float, float], bulge_km: float) -> list[list[float]]:
    pts = []
    n = 24
    mid = _offset_waypoint(a, b, bulge_km, 1) if bulge_km else ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    for i in range(n + 1):
        t = i / n
        # quadratic bezier through offset midpoint
        lat = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mid[0] + t**2 * b[0]
        lon = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * mid[1] + t**2 * b[1]
        pts.append([round(lat, 5), round(lon, 5)])
    return pts


def _length_km(coords: list[list[float]]) -> float:
    return sum(engine.haversine_km(c1[0], c1[1], c2[0], c2[1]) for c1, c2 in zip(coords[:-1], coords[1:]))


def _to_latlon(geometry: dict) -> list[list[float]]:
    return [[round(c[1], 5), round(c[0], 5)] for c in geometry["coordinates"]]


async def route_candidates(hab_id: str, site_id: str, db=None, scored_habs: list[dict] | None = None) -> dict:
    hab = engine.HABITATIONS[hab_id]
    site = engine.base_site(site_id)
    origin = (hab["lat"], hab["lon"])
    dest = (site["lat"], site["lon"])

    candidates: list[dict] = []
    source = "OSRM (OpenStreetMap road network, public demo router)"
    origin_access_km = 0.0
    dest_access_km = 0.0

    direct = await osrm_route([origin, dest], alternatives=True, db=db)
    if direct and direct.get("routes"):
        wps = direct.get("waypoints") or []
        if wps:
            origin_access_km = round(wps[0].get("distance", 0) / 1000, 1)
            dest_access_km = round(wps[-1].get("distance", 0) / 1000, 1)
        for r in direct["routes"][:2]:
            candidates.append({"geometry": _to_latlon(r["geometry"]), "distance_km": round(r["distance"] / 1000, 1), "duration_min": round(r["duration"] / 60), "via": "direct road network"})
    if direct and len(candidates) < 2:
        # request a second candidate through an offset waypoint (both sides, keep the first distinct result)
        for side in (1, -1):
            wp = _offset_waypoint(origin, dest, 4.0, side)
            alt = await osrm_route([origin, wp, dest], alternatives=False, db=db)
            if alt and alt.get("routes"):
                r = alt["routes"][0]
                geom = _to_latlon(r["geometry"])
                dist = round(r["distance"] / 1000, 1)
                if all(abs(dist - c["distance_km"]) > 0.3 for c in candidates):
                    candidates.append({"geometry": geom, "distance_km": dist, "duration_min": round(r["duration"] / 60), "via": "alternate corridor (via offset waypoint)"})
                    break

    if not candidates:
        source = "Illustrative geometry (routing service unavailable) - not a road-network route"
        g1 = _illustrative_geometry(origin, dest, 0)
        g2 = _illustrative_geometry(origin, dest, 3.5)
        for g, via in ((g1, "direct (illustrative)"), (g2, "alternate corridor (illustrative)")):
            d = _length_km(g) * 1.25
            candidates.append({"geometry": g, "distance_km": round(d, 1), "duration_min": round(d / 35 * 60), "via": via})

    routes = []
    for i, c in enumerate(candidates):
        # prepend the settlement itself so the line visibly starts at the habitation
        geom = c["geometry"]
        if geom and (abs(geom[0][0] - origin[0]) > 1e-4 or abs(geom[0][1] - origin[1]) > 1e-4):
            geom = [[origin[0], origin[1]]] + geom
        if geom and (abs(geom[-1][0] - dest[0]) > 1e-4 or abs(geom[-1][1] - dest[1]) > 1e-4):
            geom = geom + [[dest[0], dest[1]]]
        c["geometry"] = geom
        hz = engine.route_hazard_exposure(c["geometry"], hab_id, scored_habs)
        routes.append({"id": f"R{i + 1}", "label": f"Route {i + 1}", "source": source, "hazard": hz, "origin_access_km": origin_access_km, **c})
    scored = engine.score_routes(routes, site)
    access_note = None
    if origin_access_km >= 0.5:
        access_note = f"Nearest mapped road is {origin_access_km} km from the settlement - this first stretch is by boat / earthen track (no road on the char in OpenStreetMap)."
    return {
        "habitation": {"id": hab_id, "name": hab["name"], "lat": hab["lat"], "lon": hab["lon"]},
        "site": {"id": site["id"], "name": site["name"], "lat": site["lat"], "lon": site["lon"], "road_label": site["road_label"], "road_name": site["road_name"]},
        "routes": scored,
        "origin_access_km": origin_access_km,
        "destination_access_km": dest_access_km,
        "access_note": access_note,
        "weights": engine.ROUTE_WEIGHTS,
        "source": source,
        "labels": {"model": engine.MODEL_LABEL, "geometry": source},
    }
