from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone

import engine
import routing


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="SURAKSHA API", version="0.1.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("suraksha")

INCIDENT_NAME = "Monsoon flood season 2025 - Brahmaputra basin (prototype scenario)"
DATA_TIMESTAMP = "2025-07-05T06:00:00Z"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class FieldReportCreate(BaseModel):
    location_name: str
    incident_type: str
    severity: str
    description: str = ""
    lat: float
    lon: float
    reporter: str = "Field officer"
    photo_data_url: Optional[str] = None
    habitation_id: Optional[str] = None


class FieldReport(FieldReportCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=now_iso)
    status: str = "Open"


class PlanRequest(BaseModel):
    utilization: float = 1.0


class ActionPlanRequest(BaseModel):
    utilization: float = 1.0
    include_routes: bool = True
    notes: Optional[str] = None


class HazardConfigUpdate(BaseModel):
    profiles: Dict[str, dict]


class AckRequest(BaseModel):
    acknowledged_by: str = "Control room"


# ---------------------------------------------------------------------------
# Startup: load persisted hazard config
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def load_config():
    try:
        doc = await db.config.find_one({"key": "hazard_profiles"}, {"_id": 0})
        if doc and doc.get("profiles"):
            engine.set_profiles(doc["profiles"])
            logger.info("Loaded hazard profile overrides from MongoDB")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not load hazard config: %s", exc)


# ---------------------------------------------------------------------------
# Meta / KPIs
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "SURAKSHA API", "status": "ok"}


@api_router.get("/meta")
async def meta():
    osrm_ok = True
    return {
        "app": "SURAKSHA",
        "tagline": "From Hazard Intelligence to Safer Relocation.",
        "incident": INCIDENT_NAME,
        "data_timestamp": DATA_TIMESTAMP,
        "system_status": "Operational (prototype)",
        "routing_service": "OSRM public demo router" if osrm_ok else "unavailable",
        "labels": {
            "model": engine.MODEL_LABEL,
            "data": engine.ILLUSTRATIVE_LABEL,
            "seed": engine.DISTRICTS_RAW["_meta"]["label"],
            "classification": "Prototype classification - not an official red-zone declaration",
            "satellite": "Satellite imagery is a visual basemap for context only. Red-zone scoring is computed from tabular hazard / vulnerability data, not from image analysis.",
            "decision_support": "Decision support only. SURAKSHA recommends; the competent authority (DDMA / SDMA) decides.",
        },
        "emergency_contacts": [
            {"label": "State disaster helpline", "number": "1070"},
            {"label": "District disaster helpline", "number": "1077"},
            {"label": "National emergency number", "number": "112"},
            {"label": "Ambulance", "number": "108"},
            {"label": "Fire", "number": "101"},
        ],
    }


@api_router.get("/kpis")
async def get_kpis():
    return engine.kpis()


# ---------------------------------------------------------------------------
# Geo / districts / hazards
# ---------------------------------------------------------------------------
@api_router.get("/geo/districts")
async def geo_districts():
    return JSONResponse(engine.enriched_geojson())


@api_router.get("/districts")
async def districts():
    return {"meta": engine.DISTRICTS_RAW["_meta"], "districts": engine.district_summaries()}


@api_router.get("/districts/severity-components")
async def severity_components():
    return engine.severity_components()


@api_router.get("/hazards/types")
async def hazard_types():
    return {"hazard_types": engine.HAZARD_TYPES, "meta": engine.HAZARD_PROFILES_RAW["_meta"]}


@api_router.get("/hazards/config")
async def hazard_config():
    return {
        "profiles": engine.get_profiles(),
        "defaults": engine.DEFAULT_PROFILES,
        "gis_layer_weights": engine.GIS_LAYER_WEIGHTS,
        "gis_layer_meta": engine.GIS_LAYER_META,
        "risk_weights": engine.RISK_WEIGHTS,
        "priority_weights": engine.PRIORITY_WEIGHTS,
        "vulnerability_weights": engine.VULNERABILITY_WEIGHTS,
        "suitability_weights": engine.SUITABILITY_WEIGHTS,
        "site_exposure_weights": engine.SITE_EXPOSURE_WEIGHTS,
        "route_weights": engine.ROUTE_WEIGHTS,
        "thresholds": {
            "risk_levels": [{"min": t, "label": l} for t, l, _ in engine.RISK_LEVELS],
            "priority_classes": [{"min": t, "label": l} for t, l in engine.PRIORITY_CLASSES],
            "site_unsafe_exposure": engine.SITE_UNSAFE_THRESHOLD,
            "site_min_infra": engine.SITE_MIN_INFRA,
            "site_max_distance_km": engine.SITE_MAX_DISTANCE_KM,
            "site_search_radius_km": engine.SITE_SEARCH_RADIUS_KM,
            "suitability": engine.SUITABILITY_THRESHOLDS,
        },
        "label": engine.MODEL_LABEL,
    }


@api_router.put("/hazards/config")
async def update_hazard_config(body: HazardConfigUpdate):
    profiles = engine.get_profiles()
    for pid, p in body.profiles.items():
        if pid not in profiles:
            raise HTTPException(400, f"Unknown profile {pid}")
        weights = p.get("weights", {})
        cleaned = {}
        for hz, w in weights.items():
            if hz not in profiles[pid]["weights"]:
                raise HTTPException(400, f"Unknown hazard {hz}")
            cleaned[hz] = max(0.0, float(w))
        total = sum(cleaned.values())
        if total <= 0:
            raise HTTPException(400, "Weights must sum to a positive value")
        profiles[pid]["weights"] = {k: round(v / total, 3) for k, v in cleaned.items()}
    engine.set_profiles(profiles)
    await db.config.update_one({"key": "hazard_profiles"}, {"$set": {"key": "hazard_profiles", "profiles": profiles, "updated_at": now_iso()}}, upsert=True)
    return {"profiles": profiles, "normalised": True}


@api_router.post("/hazards/config/reset")
async def reset_hazard_config():
    engine.set_profiles(None)
    await db.config.delete_one({"key": "hazard_profiles"})
    return {"profiles": engine.get_profiles(), "reset": True}


@api_router.get("/infrastructure")
async def infrastructure():
    return engine.INFRASTRUCTURE_RAW


# ---------------------------------------------------------------------------
# Habitations & workflow
# ---------------------------------------------------------------------------
@api_router.get("/habitations")
async def habitations(district: Optional[str] = None, level: Optional[str] = None, priority: Optional[str] = None):
    items = engine.score_all_habitations()
    if district:
        items = [h for h in items if h["district_id"] == district or h["district"].lower() == district.lower()]
    if level:
        items = [h for h in items if h["risk_level"].lower() == level.lower().replace("_", " ")]
    if priority:
        items = [h for h in items if h["priority_class"].lower() == priority.lower()]
    slim_keys = ["id", "name", "district", "district_id", "block", "lat", "lon", "population", "households", "exposed_pct", "population_exposed", "population_requiring_relocation", "risk_score", "risk_level", "risk_color", "hazard_composite", "dominant_hazard", "hazard_subscores", "vulnerability_score", "infrastructure_risk", "disaster_history_score", "priority_score", "priority_class", "priority_rank", "recommended_action", "hazard_profile"]
    return {"count": len(items), "habitations": [{k: h[k] for k in slim_keys} for h in items], "labels": {"model": engine.MODEL_LABEL, "data": engine.ILLUSTRATIVE_LABEL}}


@api_router.get("/habitations/{hab_id}")
async def habitation_detail(hab_id: str):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    detail = engine.score_habitation(hab_id)
    ranked = engine.score_all_habitations()
    detail["priority_rank"] = next(h["priority_rank"] for h in ranked if h["id"] == hab_id)
    detail["total_habitations"] = len(ranked)
    return detail


@api_router.get("/habitations/{hab_id}/priority")
async def habitation_priority(hab_id: str):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    h = engine.score_habitation(hab_id)
    return {
        "habitation": {k: h[k] for k in ("id", "name", "district", "population", "population_exposed", "population_requiring_relocation", "risk_score", "risk_level")},
        "priority_score": h["priority_score"],
        "priority_class": h["priority_class"],
        "priority_factors": h["priority_factors"],
        "vulnerability_score": h["vulnerability_score"],
        "vulnerability_parts": h["vulnerability_parts"],
        "infrastructure_items": h["infrastructure_items"],
        "recommended_action": h["recommended_action"],
        "weights": engine.PRIORITY_WEIGHTS,
        "classes": [{"min": t, "label": l, "action": engine.PRIORITY_ACTIONS[l]} for t, l in engine.PRIORITY_CLASSES],
        "labels": {"model": "Prototype Relocation Priority Model - " + engine.MODEL_LABEL},
    }


@api_router.get("/habitations/{hab_id}/sites")
async def habitation_sites(hab_id: str):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    return engine.rank_sites_for(hab_id)


@api_router.get("/habitations/{hab_id}/capacity")
async def habitation_capacity(hab_id: str, utilization: float = Query(1.0, ge=0.5, le=1.0)):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    return engine.capacity_assessment(hab_id, utilization)


@api_router.post("/habitations/{hab_id}/plan")
async def habitation_plan(hab_id: str, body: PlanRequest):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    plan = engine.relocation_plan(hab_id, body.utilization)
    plan["generated_at"] = now_iso()
    return plan


@api_router.get("/habitations/{hab_id}/routes")
async def habitation_routes(hab_id: str, site_id: str):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    if site_id not in engine.SITES:
        raise HTTPException(404, "Site not found")
    return await routing.route_candidates(hab_id, site_id, db=db)


@api_router.post("/habitations/{hab_id}/action-plan")
async def habitation_action_plan(hab_id: str, body: ActionPlanRequest):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    plan = engine.relocation_plan(hab_id, body.utilization)
    routes_by_site = None
    if body.include_routes and plan["allocations"]:
        routes_by_site = {}
        scored = engine.score_all_habitations()
        for alloc in plan["allocations"]:
            try:
                res = await routing.route_candidates(hab_id, alloc["site_id"], db=db, scored_habs=scored)
                routes_by_site[alloc["site_id"]] = res["routes"]
            except Exception as exc:  # noqa: BLE001
                logger.warning("route failed for %s: %s", alloc["site_id"], exc)
    ap = engine.build_action_plan(hab_id, body.utilization, routes_by_site, INCIDENT_NAME)
    ap["id"] = f"AP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{hab_id}"
    ap["generated_at"] = now_iso()
    ap["habitation_id"] = hab_id
    ap["utilization_factor"] = body.utilization
    ap["officer_notes"] = body.notes
    ap["data_timestamp"] = DATA_TIMESTAMP
    await db.action_plans.insert_one({**ap})
    ap.pop("_id", None)
    return ap


@api_router.get("/action-plans")
async def list_action_plans(limit: int = 50):
    docs = await db.action_plans.find({}, {"_id": 0, "id": 1, "habitation_id": 1, "generated_at": 1, "location": 1, "relocation_priority": 1, "allocation_totals": 1, "capacity_status": 1, "priority_label": 1, "route_status": 1}).sort("generated_at", -1).to_list(limit)
    return {"count": len(docs), "action_plans": docs}


@api_router.get("/action-plans/{plan_id}")
async def get_action_plan(plan_id: str):
    doc = await db.action_plans.find_one({"id": plan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Action plan not found")
    return doc


# ---------------------------------------------------------------------------
# Sites
# ---------------------------------------------------------------------------
@api_router.get("/sites")
async def sites():
    items = engine.all_sites()
    return {"count": len(items), "sites": items, "thresholds": {"unsafe_exposure": engine.SITE_UNSAFE_THRESHOLD, "min_infra": engine.SITE_MIN_INFRA}, "meta": engine.SITES_RAW["_meta"]}


@api_router.get("/sites/{site_id}")
async def site_detail(site_id: str):
    if site_id not in engine.SITES:
        raise HTTPException(404, "Site not found")
    return engine.base_site(site_id)


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------
@api_router.get("/alerts")
async def alerts():
    items = engine.generate_alerts()
    acks = {a["alert_id"]: a async for a in db.alert_acks.find({}, {"_id": 0})}
    for a in items:
        ack = acks.get(a["id"])
        a["status"] = "Acknowledged" if ack else "Open"
        a["acknowledged_at"] = ack["acknowledged_at"] if ack else None
        a["acknowledged_by"] = ack["acknowledged_by"] if ack else None
        a["timestamp"] = DATA_TIMESTAMP
    return {"count": len(items), "alerts": items, "note": "Alerts are generated by the prototype's own scoring engine. Not linked to any national or state alert system."}


@api_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, body: AckRequest):
    valid_ids = {a["id"] for a in engine.generate_alerts()}
    if alert_id not in valid_ids:
        raise HTTPException(404, "Alert not found")
    doc = {"alert_id": alert_id, "acknowledged_at": now_iso(), "acknowledged_by": body.acknowledged_by}
    await db.alert_acks.update_one({"alert_id": alert_id}, {"$set": doc}, upsert=True)
    return {"status": "Acknowledged", **doc}


@api_router.delete("/alerts/{alert_id}/acknowledge")
async def unacknowledge_alert(alert_id: str):
    await db.alert_acks.delete_one({"alert_id": alert_id})
    return {"status": "Open", "alert_id": alert_id}


# ---------------------------------------------------------------------------
# Field reports
# ---------------------------------------------------------------------------
@api_router.post("/field-reports", response_model=FieldReport)
async def create_field_report(body: FieldReportCreate):
    if body.photo_data_url and len(body.photo_data_url) > 2_500_000:
        raise HTTPException(413, "Photo too large (max ~2.5 MB encoded)")
    if body.severity not in ("Critical", "High", "Watch", "Information"):
        raise HTTPException(400, "Severity must be one of Critical, High, Watch, Information")
    report = FieldReport(**body.model_dump())
    await db.field_reports.insert_one(report.model_dump())
    return report


@api_router.get("/field-reports")
async def list_field_reports(limit: int = 200):
    docs = await db.field_reports.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"count": len(docs), "field_reports": docs}


@api_router.delete("/field-reports/{report_id}")
async def delete_field_report(report_id: str):
    res = await db.field_reports.delete_one({"id": report_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Report not found")
    return {"deleted": report_id}


# ---------------------------------------------------------------------------
# Citizen view aggregate
# ---------------------------------------------------------------------------
@api_router.get("/citizen/{hab_id}")
async def citizen(hab_id: str):
    if hab_id not in engine.HABITATIONS:
        raise HTTPException(404, "Habitation not found")
    h = engine.score_habitation(hab_id)
    ranking = engine.rank_sites_for(hab_id)
    usable = [s for s in ranking["sites"] if s["status"] in ("RECOMMENDED", "CONDITIONAL")]
    nearest = usable[0] if usable else None
    route = None
    if nearest:
        try:
            res = await routing.route_candidates(hab_id, nearest["id"], db=db)
            route = next((r for r in res["routes"] if r["selected"]), None)
            if route:
                route = {"label": route["label"], "distance_km": route["distance_km"], "duration_min": route.get("duration_min"), "hazard_exposure_pct": route["hazard"]["exposure_pct"], "geometry": route["geometry"], "source": route["source"], "origin_access_km": res.get("origin_access_km", 0)}
        except Exception as exc:  # noqa: BLE001
            logger.warning("citizen route failed: %s", exc)
    return {
        "habitation": {k: h[k] for k in ("id", "name", "district", "lat", "lon", "risk_score", "risk_level", "risk_color", "priority_class", "dominant_hazard", "population")},
        "nearest_safe_site": ({k: nearest[k] for k in ("id", "name", "lat", "lon", "available_capacity", "total_capacity", "distance_km", "status", "road_label", "facilities")} if nearest else None),
        "route": route,
        "instructions": _citizen_instructions(h["risk_level"]),
        "labels": {"data": engine.ILLUSTRATIVE_LABEL, "classification": "Prototype classification - follow official instructions from your district administration"},
    }


def _citizen_instructions(level: str) -> list[str]:
    if level == "RED ZONE":
        return [
            "Keep documents, medicines and drinking water packed in a waterproof bag",
            "Move children, elderly and persons with disabilities first",
            "Do not attempt to cross flowing water; wait for boats or official transport",
            "Switch off electricity mains before leaving the house",
            "Follow instructions from the district administration and the village volunteer",
        ]
    if level == "HIGH RISK":
        return [
            "Prepare an emergency kit and keep mobile phones charged",
            "Identify the nearest safe site and route now",
            "Move livestock to higher ground",
            "Stay tuned to district administration announcements",
        ]
    return [
        "Stay alert to rainfall and river-level announcements",
        "Keep emergency contact numbers handy",
        "Report waterlogging or embankment damage to the local authority",
    ]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
