"""
SURAKSHA core POC test - run from /app/backend:  python test_core.py
Validates: coordinate placement inside district polygons, demo narrative (Sialmari Char RED/IMMEDIATE,
Kharupetia REJECTED despite capacity, SUFFICIENT capacity), deficit case (Baghbar Char), allocation
reconciliation for every habitation, and OSRM routing with hazard-aware selection.
"""
import asyncio
import json
import sys

import engine
import routing

FAILS = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def test_geometry():
    print("\n== Coordinates inside district polygons ==")
    for h in engine.HABITATIONS.values():
        d = engine.DISTRICTS[h["district"]]
        geom = engine.district_geometry(d["geo_match"])
        check(geom is not None and engine.point_in_polygon(h["lat"], h["lon"], geom), f'{h["id"]} {h["name"]} inside {d["geo_match"]}')
    for s in engine.SITES.values():
        d = engine.DISTRICTS[s["district"]]
        geom = engine.district_geometry(d["geo_match"])
        check(geom is not None and engine.point_in_polygon(s["lat"], s["lon"], geom), f'{s["id"]} {s["name"]} inside {d["geo_match"]}')


def test_scores():
    print("\n== Habitation scores ==")
    habs = engine.score_all_habitations()
    for h in habs:
        print(f'  #{h["priority_rank"]:>2} {h["id"]} {h["name"]:<22} {h["district"]:<10} risk={h["risk_score"]:>3} {h["risk_level"]:<10} hazard={h["hazard_composite"]} flood={h["hazard_subscores"]["flood"]} vuln={h["vulnerability_score"]} prio={h["priority_score"]} {h["priority_class"]}')
    by_id = {h["id"]: h for h in habs}
    s = by_id["H-DRG-01"]
    check(s["risk_level"] == "RED ZONE", "Sialmari Char is RED ZONE")
    check(s["priority_class"] == "IMMEDIATE", "Sialmari Char is IMMEDIATE")
    check(by_id["H-DRG-04"]["risk_level"] in ("WATCH", "SAFER"), "Kalaigaon North is lower risk")
    check(by_id["H-DRG-04"]["priority_class"] in ("MONITOR", "MEDIUM-TERM"), "Kalaigaon North not IMMEDIATE")
    reds = [h for h in habs if h["risk_level"] == "RED ZONE"]
    check(3 <= len(reds) <= 7, f"Plausible number of RED zones ({len(reds)})")
    districts_red = {h["district"] for h in reds}
    check({"Darrang", "Barpeta", "Dhubri", "Morigaon"} <= districts_red, f"Darrang/Barpeta/Dhubri/Morigaon flagged red: {districts_red}")
    check(by_id["H-TMP-01"]["dominant_hazard"] in ("flood", "cloudburst", "landslide"), f'Kumarikata dominant hazard plausible ({by_id["H-TMP-01"]["dominant_hazard"]}, cloudburst={by_id["H-TMP-01"]["hazard_subscores"]["cloudburst"]})')
    levels = set(h["risk_level"] for h in habs)
    check(len(levels) >= 3, f"Risk levels are differentiated: {levels}")
    classes = set(h["priority_class"] for h in habs)
    check(len(classes) >= 3, f"Priority classes are differentiated: {classes}")


def test_sites():
    print("\n== Site ranking for Sialmari Char ==")
    r = engine.rank_sites_for("H-DRG-01")
    for s in r["sites"]:
        print(f'  {s["rank"]} {s["status"]:<12} {s["name"]:<48} suit={s["suitability"]} safety={s["safety_score"]} exp={s["hazard_exposure"]} avail={s["available_capacity"]:>5} dist={s["distance_km"]} infra={s["infrastructure_readiness"]}')
        for g in s["gates"]:
            print("       GATE:", g)
    by = {s["id"]: s for s in r["sites"]}
    check(by["S-DRG-02"]["status"] == "REJECTED", "Kharupetia HS (2,500 avail, flooded 3/5) REJECTED")
    check(by["S-DRG-02"]["available_capacity"] == max(s["available_capacity"] for s in r["sites"]), "Kharupetia has the largest capacity among candidates (rejection is not capacity-driven)")
    check(by["S-DRG-01"]["status"] == "RECOMMENDED", "Mangaldai HSS RECOMMENDED")
    check(by["S-DRG-03"]["status"] == "RECOMMENDED", "Sipajhar College RECOMMENDED")
    check(by["S-DRG-04"]["status"] == "CONDITIONAL", "Dhula Community Hall CONDITIONAL")
    check(by["S-DRG-06"]["status"] == "REJECTED", "NH-15 embankment ground REJECTED (no WASH)")
    check(r["sites"][0]["status"] == "RECOMMENDED", "Top-ranked site is RECOMMENDED")


def test_capacity_and_plan():
    print("\n== Capacity & plan: Sialmari Char ==")
    cap = engine.capacity_assessment("H-DRG-01")
    print(f'  required={cap["required_capacity"]} total={cap["total_site_capacity"]} occ={cap["current_occupancy"]} avail={cap["available_capacity"]} effective={cap["effective_safe_capacity"]} status={cap["status"]} balance={cap["balance"]} excluded_unsafe={cap["excluded_unsafe_capacity"]}')
    check(cap["status"] == "SUFFICIENT", "Sialmari capacity SUFFICIENT")
    check(cap["available_capacity"] == cap["total_site_capacity"] - cap["current_occupancy"], "available = total - occupancy")
    plan = engine.relocation_plan("H-DRG-01")
    for a in plan["allocations"]:
        print(f'  -> {a["site_name"]:<48} {a["status"]:<12} alloc={a["allocated"]:>5} of eff {a["effective_capacity"]}')
    print(f'  total_allocated={plan["total_allocated"]} unallocated={plan["unallocated"]} status={plan["status"]}')
    check(plan["status"] == "CAPACITY SATISFIED", "Sialmari plan CAPACITY SATISFIED")
    check(len(plan["allocations"]) >= 3, "Allocation spans multiple sites")
    check(plan["reconciles"], "Totals reconcile")
    check(all(a["allocated"] <= a["effective_capacity"] for a in plan["allocations"]), "No site over-allocated")
    check(all(a["status"] != "REJECTED" for a in plan["allocations"]), "No REJECTED site receives allocation")

    print("\n== Capacity & plan: Baghbar Char (deficit case) ==")
    cap2 = engine.capacity_assessment("H-BPT-01")
    plan2 = engine.relocation_plan("H-BPT-01")
    print(f'  required={cap2["required_capacity"]} effective={cap2["effective_safe_capacity"]} status={cap2["status"]} deficit={cap2["deficit"]}; plan={plan2["status"]} unallocated={plan2["unallocated"]}')
    check(cap2["status"] == "DEFICIT", "Baghbar Char capacity DEFICIT")
    check(plan2["status"] == "CAPACITY DEFICIT" and plan2["reconciles"], "Baghbar plan flags deficit and reconciles")

    print("\n== Reconciliation for all habitations ==")
    for hid in engine.HABITATIONS:
        p = engine.relocation_plan(hid)
        check(p["reconciles"] and all(a["allocated"] <= a["effective_capacity"] for a in p["allocations"]), f'{hid} reconciles ({p["status"]}, allocated {p["total_allocated"]}/{p["required"]})')

    print("\n== Utilization factor ==")
    cap90 = engine.capacity_assessment("H-DRG-01", 0.9)
    check(cap90["effective_safe_capacity"] < cap["effective_safe_capacity"], f'90% utilization reduces effective capacity ({cap90["effective_safe_capacity"]} < {cap["effective_safe_capacity"]})')


def test_aggregates():
    print("\n== KPIs / alerts / geojson ==")
    k = engine.kpis()
    print("  ", json.dumps({x: k[x] for x in k if x != "labels"}))
    check(k["critical_red_zones"] >= 3 and k["population_at_risk"] > 0, "KPIs populated")
    gj = engine.enriched_geojson()
    assessed = [f for f in gj["features"] if f["properties"].get("assessed")]
    check(len(assessed) == 7, f"7 assessed districts enriched in GeoJSON ({len(assessed)})")
    alerts = engine.generate_alerts()
    check(any(a["severity"] == "CRITICAL" for a in alerts), f"Alerts generated ({len(alerts)})")
    sev = engine.severity_components()
    check(len(sev["rows"]) >= 7, "Severity components computed from snapshots")
    ds = engine.district_summaries()
    check(ds[0]["risk_category"] in ("Critical",), f'District summaries sorted by category (top: {ds[0]["name"]} {ds[0]["risk_category"]})')


async def test_routes():
    print("\n== Routes: Sialmari Char -> Mangaldai HSS ==")
    res = await routing.route_candidates("H-DRG-01", "S-DRG-01", db=None)
    for r in res["routes"]:
        print(f'  {r["label"]} selected={r["selected"]} dist={r["distance_km"]} km dur={r.get("duration_min")} min hazard={r["hazard"]["exposure_pct"]}% cost={r["route_cost"]} via={r["via"]}')
        print("     ", r.get("selection_reason"))
    print("   source:", res["source"])
    check(len(res["routes"]) >= 1, "At least one route candidate")
    check(len(res["routes"]) == 2, "Two candidate routes to compare")
    check(sum(1 for r in res["routes"] if r["selected"]) == 1, "Exactly one route selected")
    check("OSRM" in res["source"], "Real OSRM road geometry used")
    check(all(len(r["geometry"]) > 5 for r in res["routes"]), "Route geometries have real vertices")


def test_action_plan():
    print("\n== Action plan ==")
    ap = engine.build_action_plan("H-DRG-01", 1.0, None, "Monsoon flood 2025 - Brahmaputra basin (prototype scenario)")
    print("  ", ap["priority_label"])
    print("  ", ap["recommended_action"])
    print("   sites:", [s["name"] for s in ap["recommended_sites"]])
    print("   rejected:", [(s["name"], s["reason"][:50]) for s in ap["rejected_sites"]])
    print("   allocation:", ap["allocation_totals"])
    print("   considerations:", len(ap["key_considerations"]))
    check("Recommend" in ap["recommended_action"] and "order" not in ap["recommended_action"].lower(), "Action phrased as recommendation")
    check(ap["allocation_totals"]["status"] == "CAPACITY SATISFIED", "Action plan reflects satisfied capacity")
    check(len(ap["rejected_sites"]) >= 1, "Action plan lists rejected sites with reasons")
    check(ap["resource_requirements"]["bus_trips"] > 0, "Resource requirements computed")


if __name__ == "__main__":
    test_geometry()
    test_scores()
    test_sites()
    test_capacity_and_plan()
    test_aggregates()
    test_action_plan()
    asyncio.run(test_routes())
    print("\n==============================")
    if FAILS:
        print(f"{len(FAILS)} FAILURE(S):")
        for f in FAILS:
            print(" -", f)
        sys.exit(1)
    print("ALL CORE CHECKS PASSED")
