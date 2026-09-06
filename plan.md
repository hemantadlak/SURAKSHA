# plan.md — SURAKSHA MVP (end-to-end relocation decision workflow)

## 1) Objectives
- Deliver a **working, polished, demoable** end-to-end authority workflow: **Command Center → Map → Habitation → Risk/Vulnerability → Relocation Priority → Alternative Sites (reject unsafe) → Carrying Capacity → Relocation Plan → Safe Route → Action Plan**.
- Keep **GIS map as centerpiece** (Leaflet, OSM + Esri satellite basemap, GeoJSON overlays, layer toggles).
- Use **only** the Assam ASDMA-derived district seed table + **prototype/illustrative** disaggregation to ~15 habitations + ~10–12 sites; label all simulated values.
- Implement transparent **explainable scoring** (no black-box, no fake accuracy, no fake official claims).
- Persist operational artifacts in MongoDB: **field reports, saved action plans, alert acknowledgements, route cache**.

## 2) Implementation Steps

### Phase 1 — Core Workflow POC (isolation, fix-until-works)
**Goal:** prove the 3 failure-prone cores before UI build-out: scoring, allocation, routing.

User stories:
1. As an officer, I can select a habitation and get a deterministic **risk score + explainability breakdown**.
2. As an officer, I can request relocation and get a clear **priority class** with factor contributions.
3. As an officer, I can compare candidate sites and see **RECOMMENDED vs REJECTED** with reasons.
4. As an officer, I can generate an allocation that **reconciles totals** and flags deficit/surplus.
5. As an officer, I can compute a route between habitation and destination and get geometry + metrics.

Steps:
- **Dataset scaffolding (small, coherent):**
  - Create `backend/data/assam_district_seed.json` from spec table.
  - Add `backend/data/assam_districts.geojson` (validated source); map Tamulpur → Baksa polygon w/ label note.
  - Create `backend/data/habitations.json` (~15 points across 7 districts) with: `id, name, district, lat, lon, pop_total, vulnerability_index(0-10), infra_exposure(0-10), pop_density_proxy, exposure_weight`.
  - Create `backend/data/sites.json` (~10–12 sites) with: `id, name, type(shelter/school), lat, lon, total_capacity, current_occupancy, infra_readiness(0-10), accessibility(0-10), hazard_exposure(0-10), notes`.
- **POC scripts (run via backend/ scripts):**
  - `poc_scoring.py`: compute Flood severity (from seed), simulate 8 GIS layer inputs per habitation (labeled), compute Flood/Landslide subscores + multi-hazard composite + relocation priority.
  - `poc_sites.py`: compute suitability; enforce rule: **high-capacity + high hazard exposure => REJECTED**; output reasons.
  - `poc_allocation.py`: allocate required relocation population across recommended/conditional sites by available safe capacity; output reconciliation + deficit.
  - `poc_routing.py`: call OSRM; cache in Mongo; fallback to illustrative polyline if OSRM unavailable and label source.
- **Web search (best practice check):**
  - Confirm Leaflet + CRA + React 19 setup patterns; OSRM public usage limits + caching guidance.
- Exit criteria: scripts produce stable JSON outputs for one demo habitation in Darrang and one in Baksa/Tamulpur.

### Phase 2 — V1 App Development (full MVP UI + API)
**Goal:** implement the end-to-end flow with connected UI interactions; no dead buttons.

User stories:
1. As an officer, I can launch Command Center and see **Assam map + layers + KPIs**.
2. As an officer, clicking a habitation opens a right panel with **risk score + “Why high risk”** (hazard + 8 GIS inputs).
3. As an officer, I can click **Assess Relocation** and immediately see priority + recommended action category.
4. As an officer, I can compare 2–3 candidate sites and see one **explicitly REJECTED**.
5. As an officer, I can generate a relocation plan + route + action plan in one guided flow and **save** it.

Backend (FastAPI + Mongo):
- Replace placeholder endpoints with core APIs:
  - `GET /api/geo/assam-districts` (GeoJSON)
  - `GET /api/hazards/weights` + `POST /api/hazards/weights` (configurable, stored)
  - `GET /api/habitations?district=&risk=` (list with computed scores)
  - `GET /api/habitations/{id}` (detail + explainability payload)
  - `POST /api/relocation/assess` (habitation_id → priority + required_relocation_pop)
  - `POST /api/sites/rank` (habitation_id → ranked sites w/ status + reasons)
  - `POST /api/capacity/check` (habitation_id + candidate_site_ids → sufficiency/deficit)
  - `POST /api/relocation/plan` (habitation_id + ranked sites → allocations + totals)
  - `POST /api/routes/compare` (origin + destination(s) → 2 alternatives w/ hazard exposure; OSRM-backed)
  - `POST /api/action-plan/generate` (uses prior outputs → structured “Recommended Action”)
  - Persistence:
    - `POST/GET /api/field-reports`
    - `POST/GET /api/action-plans` (save/view)
    - `POST/GET /api/alerts` + `POST /api/alerts/{id}/ack`
    - `GET /api/routes/cache?key=` (internal use)
- Implement scoring as transparent functions (pandas/numpy) with explicit labeling in payloads:
  - Flood severity index (0–10) + recurrence + risk_category from seed.
  - Habitation-level disaggregation (prototype) using density proxy + exposure weight.
  - Multi-hazard composite with visible weights; include hazard breakdown in response.
  - Relocation priority model: hazard risk + exposure + vulnerability + history + infra.

Frontend (React + Tailwind + React-Leaflet):
- App shell: entry screen with **Launch Command Center** + **Citizen Safety View**.
- Command Center layout (matches spec): left nav, top bar, central map, right intelligence panel, KPI strip.
- Map:
  - Basemap switcher: OSM + Esri World Imagery (label “visual context only”).
  - Layer toggles: composite zones, per-hazard markers, habitations, sites, routes, field reports.
  - Click interactions: district polygon → filter; habitation marker → open panel.
- Right panel (guided workflow): tabs/steps: **Risk → Priority → Sites → Capacity → Plan → Route → Action Plan**.
- Tables:
  - Vulnerable habitations ranked table w/ filters (Critical/Immediate/etc).
  - Alternative site comparison table with RECOMMENDED/CONDITIONAL/REJECTED chips + reasons drawer.
- Citizen view:
  - Simplified: current zone/risk, nearest recommended site, capacity available, safe route, contacts; language toggle.

Phase 2 testing (agent-driven):
- Add a deterministic **demo script seed**: default to Darrang habitation preselected if none.
- Run one full end-to-end test for the **10-step demo flow**; fix all broken interactions before Phase 3.

### Phase 3 — Add Remaining Modules + Hardening
**Goal:** complete all nav modules (lightweight screens) without breaking core flow.

User stories:
1. As an officer, I can open **Hazard Intelligence** and adjust hazard weights with immediate recompute.
2. As an officer, I can view **Red Zones** as a district summary and drill down to habitations.
3. As an officer, I can log a **Field Report with photo** and see it appear on the map.
4. As an officer, I can view **Alerts**, acknowledge them, and track status.
5. As an officer, I can revisit **saved Action Plans** and re-run route/plan if conditions change.

Steps:
- Implement remaining nav pages as functional, data-backed views (not marketing pages).
- Add route cache TTL + request deduping; add graceful OSRM failure messaging + fallback labeling.
- Add small UI polish: consistent color semantics, badges, monospace coords/timestamps, dense tables.
- Testing agent: rerun full demo flow + smoke test each nav module.

## 3) Next Actions (immediate)
1. Create seed JSON datasets (district seed, habitations, sites) + store Assam districts GeoJSON in backend.
2. Implement Phase 1 POC scripts and run them until stable outputs match the primary demo narrative.
3. Build FastAPI endpoints around the proven functions; add Mongo persistence collections.
4. Build Command Center UI with map, layer toggles, and right-panel guided workflow.
5. Run the testing agent through the 10-step demo; fix regressions; then add remaining modules.

## 4) Success Criteria
- **End-to-end demo works** with no dead ends: click habitation → priority → sites (with rejection) → capacity → allocation reconciles → route selected/explained → action plan generated and saved.
- GIS map is central and interactive: basemap switcher + overlays + click-to-drilldown works.
- All simulated values are clearly labeled **Prototype/Illustrative**; no fake official claims/logos/accuracy.
- Capacity math is consistent: available = total - occupancy; allocation never exceeds available; deficit flagged.
- Routing: OSRM geometry shown and cached; fallback clearly labeled if OSRM unavailable.
- All nav modules exist and show meaningful data tied back to the core workflow; citizen view is simplified and functional.
