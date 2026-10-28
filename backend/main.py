"""
RescueGrid AI - FastAPI Application Server
Comprehensive REST and offline synchronization endpoints for disaster search and rescue operations.
"""

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uuid
import json
from datetime import datetime, timezone

from .database import get_connection, init_db, DB_PATH
from .schemas import (
    Incident, IncidentCreate,
    SearchZone, ZonePriorityOverride,
    EvidenceClue, EvidenceClueCreate,
    MissingPerson, MissingPersonCreate,
    Hazard, HazardCreate,
    RoadRestriction, RoadRestrictionCreate,
    RescueTeam, RescueTeamCreate,
    MissionAssignment, MissionAssignmentCreate, MissionAssignmentUpdate,
    AuditLog, OfflineSyncRequest, OfflineSyncResponse, OfflineSyncResultItem
)
from .nlp_fusion import ClueFusionEngine
from .prioritization import PrioritizationEngine
from .mission_planner import MissionPlannerEngine
from .situation_summary import SituationSummaryEngine
from .demo_scenario import seed_landslide_scenario

app = FastAPI(
    title="RescueGrid AI - Intelligent Disaster Prioritization System",
    description="Explainable, offline-first decision-support platform for the first 72 hours of disaster search and rescue.",
    version="1.0.0"
)

# Enable CORS for local Vite development and mobile access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM incidents;")
    if c.fetchone()[0] == 0:
        seed_landslide_scenario()
    conn.close()

# -------------------------------------------------------------
# Incident Endpoints
# -------------------------------------------------------------
@app.get("/api/incident", response_model=Optional[Incident])
def get_current_incident():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1;")
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

@app.post("/api/demo/seed")
def seed_demo_data():
    """Resets the database and populates the Western Ghats landslide simulated scenario."""
    res = seed_landslide_scenario()
    return {"message": "Simulated landslide scenario loaded successfully", "details": res}

# -------------------------------------------------------------
# Search Zones & Prioritization Endpoints
# -------------------------------------------------------------
@app.get("/api/zones")
def get_zones_with_priorities():
    """
    Returns all search zones enriched with:
    - Real-time calculated priority score
    - Multi-factor breakdown (evidence, occupancy, urgency, temporal, access)
    - Plain-language explanation
    - Missing intel alerts and verified facts
    """
    conn = get_connection()
    c = conn.cursor()
    
    # Fetch incident
    c.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1;")
    inc_row = c.fetchone()
    if not inc_row:
        conn.close()
        return []
    inc_id = inc_row["id"]

    c.execute("SELECT * FROM search_zones WHERE incident_id = ?;", (inc_id,))
    zone_rows = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM evidence_clues WHERE incident_id = ?;", (inc_id,))
    clue_rows = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM missing_persons WHERE incident_id = ?;", (inc_id,))
    mp_rows = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM hazards WHERE incident_id = ? AND active = 1;", (inc_id,))
    hazard_rows = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM road_restrictions WHERE incident_id = ? AND active = 1;", (inc_id,))
    road_rows = [dict(r) for r in c.fetchall()]

    # Organize clues and missing persons by zone
    clues_by_zone = {}
    for cl in clue_rows:
        zid = cl.get("zone_id")
        if zid:
            clues_by_zone.setdefault(zid, []).append(cl)

    mp_by_zone = {}
    for mp in mp_rows:
        zid = mp.get("last_seen_zone_id")
        if zid:
            mp_by_zone.setdefault(zid, []).append(mp)

    enriched_zones = []
    for z in zone_rows:
        zid = z["id"]
        z_clues = clues_by_zone.get(zid, [])
        z_mps = mp_by_zone.get(zid, [])

        eval_result = PrioritizationEngine.calculate_zone_priority(
            zone=z,
            clues=z_clues,
            missing_persons=z_mps,
            hazards=hazard_rows,
            road_restrictions=road_rows
        )

        # Merge calculation into zone dict
        z_enriched = dict(z)
        z_enriched["current_priority_score"] = eval_result["calculated_priority_score"]
        z_enriched["active_priority_score"] = eval_result["active_priority_score"]
        z_enriched["is_overridden"] = eval_result["is_overridden"]
        z_enriched["score_breakdown"] = eval_result["score_breakdown"]
        z_enriched["explanation"] = eval_result["explanation"]
        z_enriched["verified_facts"] = eval_result["verified_facts"]
        z_enriched["user_reports"] = eval_result["user_reports"]
        z_enriched["assumptions_made"] = eval_result["assumptions_made"]
        z_enriched["missing_information"] = eval_result["missing_information"]
        z_enriched["evidence_count"] = len(z_clues)
        enriched_zones.append(z_enriched)

    # Sort descending by active score and assign dynamic ranks
    enriched_zones.sort(key=lambda item: item["active_priority_score"], reverse=True)
    for idx, item in enumerate(enriched_zones):
        item["rank"] = idx + 1

    conn.close()
    return enriched_zones

@app.post("/api/zones/{zone_id}/override")
def override_zone_priority(zone_id: str, payload: ZonePriorityOverride):
    """Allows an authorized rescue coordinator to override priority score with mandatory reason."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM search_zones WHERE id = ?;", (zone_id,))
    zone = c.fetchone()
    if not zone:
        conn.close()
        raise HTTPException(status_code=404, detail="Zone not found")

    now = datetime.now(timezone.utc).isoformat()
    c.execute("""
    UPDATE search_zones
    SET override_priority_score = ?, override_author = ?, override_reason = ?, override_timestamp = ?, last_updated = ?
    WHERE id = ?;
    """, (payload.override_priority_score, payload.override_author, payload.override_reason, now, now, zone_id))

    # Record in Audit Log
    c.execute("""
    INSERT INTO audit_logs (id, incident_id, action_type, entity_type, entity_id, actor, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        str(uuid.uuid4()), zone["incident_id"], "COORDINATOR_PRIORITY_OVERRIDE", "SEARCH_ZONE", zone_id,
        payload.override_author,
        f"Overrode priority score to {payload.override_priority_score:.1f}. Justification: {payload.override_reason}",
        now
    ))

    conn.commit()
    conn.close()
    return {"message": "Priority override recorded successfully", "zone_id": zone_id, "score": payload.override_priority_score}

# -------------------------------------------------------------
# Evidence Clues & AI Fusion Endpoints
# -------------------------------------------------------------
def fetch_clues_db(zone_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    if zone_id and isinstance(zone_id, str):
        c.execute("SELECT * FROM evidence_clues WHERE zone_id = ? ORDER BY timestamp DESC;", (zone_id,))
    else:
        c.execute("SELECT * FROM evidence_clues ORDER BY timestamp DESC;")
    rows = c.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("extracted_entities") and isinstance(d["extracted_entities"], str):
            try:
                d["extracted_entities"] = json.loads(d["extracted_entities"])
            except Exception:
                d["extracted_entities"] = {}
        if d.get("conflict_details") and isinstance(d["conflict_details"], str):
            try:
                d["conflict_details"] = json.loads(d["conflict_details"])
            except Exception:
                d["conflict_details"] = {}
        d["conflict_flag"] = bool(d["conflict_flag"])
        results.append(d)
    return results

@app.get("/api/clues", response_model=List[EvidenceClue])
def get_clues(zone_id: Optional[str] = Query(None)):
    zid = zone_id if isinstance(zone_id, str) else None
    return fetch_clues_db(zid)

@app.post("/api/clues", response_model=EvidenceClue)
def create_clue(clue: EvidenceClueCreate):
    """
    Submits a clue, executes NLP entity extraction, checks for duplicate reports,
    and runs contradiction detection against existing evidence.
    """
    conn = get_connection()
    c = conn.cursor()

    # 1. NLP Entity Extraction
    extracted = ClueFusionEngine.extract_entities(clue.raw_text)

    # 2. Fetch existing clues for duplication and conflict checks
    c.execute("SELECT * FROM evidence_clues WHERE incident_id = ?;", (clue.incident_id,))
    existing_clues = [dict(r) for r in c.fetchall()]

    # 3. Duplicate Detection
    dup_match = ClueFusionEngine.detect_duplicates(
        incoming_text=clue.raw_text,
        incoming_lat=clue.lat,
        incoming_lng=clue.lng,
        existing_clues=existing_clues
    )
    duplicate_of_id = dup_match[0] if dup_match else None

    # 4. Conflict / Contradiction Detection
    has_conflict, conflict_details = ClueFusionEngine.detect_conflicts(
        incoming_extracted=extracted,
        incoming_text=clue.raw_text,
        incoming_zone_id=clue.zone_id,
        existing_clues=existing_clues
    )

    # 5. Reliability Calculation
    reliability = ClueFusionEngine.calculate_reliability(
        source_type=clue.source_type,
        has_details=bool(extracted.get("trapped_count") or extracted.get("has_signs_of_life")),
        verified_physically=(clue.verification_status == "VERIFIED_PHYSICALLY")
    )

    clue_id = f"CLUE-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    c.execute("""
    INSERT INTO evidence_clues (
        id, incident_id, zone_id, source_type, reporter_info, raw_text,
        extracted_entities, lat, lng, uncertainty_meters, reliability_score,
        verification_status, timestamp, duplicate_of_id, conflict_flag, conflict_details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        clue_id, clue.incident_id, clue.zone_id, clue.source_type, clue.reporter_info,
        clue.raw_text, json.dumps(extracted), clue.lat, clue.lng, clue.uncertainty_meters,
        reliability, clue.verification_status, now, duplicate_of_id,
        1 if has_conflict else 0, json.dumps(conflict_details) if conflict_details else None
    ))

    # Audit log
    c.execute("""
    INSERT INTO audit_logs (id, incident_id, action_type, entity_type, entity_id, actor, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        str(uuid.uuid4()), clue.incident_id, "CLUE_SUBMITTED", "EVIDENCE_CLUE", clue_id,
        clue.reporter_info or "Anonymous Field Reporter",
        f"Submitted clue: '{clue.raw_text[:60]}...' (Duplicate: {duplicate_of_id}, Conflict: {has_conflict})",
        now
    ))

    conn.commit()
    conn.close()

    return {
        "id": clue_id,
        "incident_id": clue.incident_id,
        "zone_id": clue.zone_id,
        "source_type": clue.source_type,
        "reporter_info": clue.reporter_info,
        "raw_text": clue.raw_text,
        "extracted_entities": extracted,
        "lat": clue.lat,
        "lng": clue.lng,
        "uncertainty_meters": clue.uncertainty_meters,
        "reliability_score": reliability,
        "verification_status": clue.verification_status,
        "timestamp": now,
        "duplicate_of_id": duplicate_of_id,
        "conflict_flag": has_conflict,
        "conflict_details": conflict_details
    }

def fetch_missing_persons_db(zone_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    if zone_id and isinstance(zone_id, str):
        c.execute("SELECT * FROM missing_persons WHERE last_seen_zone_id = ? ORDER BY report_time DESC;", (zone_id,))
    else:
        c.execute("SELECT * FROM missing_persons ORDER BY report_time DESC;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/missing-persons", response_model=List[MissingPerson])
def get_missing_persons(zone_id: Optional[str] = Query(None)):
    zid = zone_id if isinstance(zone_id, str) else None
    return fetch_missing_persons_db(zid)

@app.post("/api/missing-persons", response_model=MissingPerson)
def create_missing_person(mp: MissingPersonCreate):
    conn = get_connection()
    c = conn.cursor()
    mp_id = f"MP-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    c.execute("""
    INSERT INTO missing_persons (
        id, incident_id, full_name, age, gender, last_seen_zone_id, last_seen_location_desc,
        contact_phone, physical_description, medical_needs, reporter_name, reporter_contact, status, report_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        mp_id, mp.incident_id, mp.full_name, mp.age, mp.gender, mp.last_seen_zone_id,
        mp.last_seen_location_desc, mp.contact_phone, mp.physical_description,
        mp.medical_needs, mp.reporter_name, mp.reporter_contact, mp.status, now
    ))

    # Audit log
    c.execute("""
    INSERT INTO audit_logs (id, incident_id, action_type, entity_type, entity_id, actor, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        str(uuid.uuid4()), mp.incident_id, "MISSING_PERSON_REPORTED", "MISSING_PERSON", mp_id,
        mp.reporter_name or "Family Member",
        f"Missing person registered: {mp.full_name} (Age: {mp.age}, Zone: {mp.last_seen_zone_id})",
        now
    ))

    conn.commit()
    conn.close()
    return {
        "id": mp_id,
        **mp.dict(),
        "report_time": now
    }

# -------------------------------------------------------------
# Hazards & Roads Endpoints
# -------------------------------------------------------------
@app.get("/api/hazards", response_model=List[Hazard])
def get_hazards():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM hazards WHERE active = 1 ORDER BY reported_time DESC;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        r["active"] = bool(r["active"])
    return rows

@app.post("/api/hazards", response_model=Hazard)
def create_hazard(h: HazardCreate):
    conn = get_connection()
    c = conn.cursor()
    h_id = f"HAZ-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    c.execute("""
    INSERT INTO hazards (id, incident_id, hazard_type, severity, lat, lng, radius_meters, description, reported_time, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (h_id, h.incident_id, h.hazard_type, h.severity, h.lat, h.lng, h.radius_meters, h.description, now, 1 if h.active else 0))
    conn.commit()
    conn.close()
    return {"id": h_id, **h.dict(), "reported_time": now}

@app.get("/api/roads", response_model=List[RoadRestriction])
def get_road_restrictions():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM road_restrictions WHERE active = 1 ORDER BY reported_time DESC;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        r["active"] = bool(r["active"])
    return rows

# -------------------------------------------------------------
# Rescue Teams & Mission Assignments
# -------------------------------------------------------------
@app.get("/api/teams", response_model=List[RescueTeam])
def get_rescue_teams():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM rescue_teams;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        if isinstance(r["capabilities"], str):
            try:
                r["capabilities"] = json.loads(r["capabilities"])
            except Exception:
                r["capabilities"] = [r["capabilities"]]
    return rows

@app.get("/api/missions/recommendations")
def get_mission_recommendations():
    """Calculates capability-matched, hazard-safe rescue mission recommendations."""
    zones = get_zones_with_priorities()
    teams = get_rescue_teams()
    hazards = get_hazards()
    roads = get_road_restrictions()
    clues = fetch_clues_db()

    clues_by_zone = {}
    for cl in clues:
        zid = cl.get("zone_id")
        if zid:
            clues_by_zone.setdefault(zid, []).append(cl)

    recs = MissionPlannerEngine.generate_recommendations(
        zones=zones,
        teams=teams,
        hazards=hazards,
        road_restrictions=roads,
        clues_by_zone=clues_by_zone
    )
    return recs

@app.get("/api/missions")
def get_missions():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT m.*, t.name as team_name, t.organization as team_org, z.name as zone_name, z.code as zone_code
    FROM mission_assignments m
    JOIN rescue_teams t ON m.team_id = t.id
    JOIN search_zones z ON m.zone_id = z.id
    ORDER BY m.created_at DESC;
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        if isinstance(r.get("recommended_equipment"), str):
            try:
                r["recommended_equipment"] = json.loads(r["recommended_equipment"])
            except Exception:
                r["recommended_equipment"] = []
        if isinstance(r.get("missing_intel"), str):
            try:
                r["missing_intel"] = json.loads(r["missing_intel"])
            except Exception:
                r["missing_intel"] = []
    return rows

@app.post("/api/missions/approve")
def approve_mission(payload: Dict[str, Any] = Body(...)):
    """Human-in-the-Loop approval for mission dispatch."""
    conn = get_connection()
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    mission_id = payload.get("mission_id")
    if not mission_id:
        # Create new mission assignment from recommendation
        mission_id = f"MSN-{uuid.uuid4().hex[:6].upper()}"
        c.execute("""
        INSERT INTO mission_assignments (
            id, incident_id, team_id, zone_id, status, priority_rank,
            recommended_equipment, rationale, risk_warning, missing_intel,
            approved_by, approved_timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            mission_id,
            payload.get("incident_id", "INC-WAYANAD-2026-SIM"),
            payload.get("team_id"),
            payload.get("zone_id"),
            "COORDINATOR_APPROVED",
            payload.get("priority_rank", 1),
            json.dumps(payload.get("recommended_equipment", [])),
            payload.get("rationale", "Approved by human coordinator."),
            payload.get("risk_warning", ""),
            json.dumps(payload.get("missing_intel", [])),
            payload.get("approved_by", "Chief Rescue Coordinator"),
            now,
            now
        ))
    else:
        c.execute("""
        UPDATE mission_assignments
        SET status = 'COORDINATOR_APPROVED', approved_by = ?, approved_timestamp = ?
        WHERE id = ?;
        """, (payload.get("approved_by", "Chief Rescue Coordinator"), now, mission_id))

    # Update team status to EN_ROUTE and assigned_zone_id
    if payload.get("team_id"):
        c.execute("""
        UPDATE rescue_teams
        SET current_status = 'EN_ROUTE', assigned_zone_id = ?
        WHERE id = ?;
        """, (payload.get("zone_id"), payload.get("team_id")))

    # Audit log
    c.execute("""
    INSERT INTO audit_logs (id, incident_id, action_type, entity_type, entity_id, actor, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        str(uuid.uuid4()), payload.get("incident_id", "INC-WAYANAD-2026-SIM"),
        "MISSION_APPROVED", "MISSION_ASSIGNMENT", mission_id,
        payload.get("approved_by", "Chief Rescue Coordinator"),
        f"Approved search & rescue mission for Team {payload.get('team_id')} to Zone {payload.get('zone_id')}",
        now
    ))

    conn.commit()
    conn.close()
    return {"message": "Mission approved and team dispatched", "mission_id": mission_id, "status": "COORDINATOR_APPROVED"}

# -------------------------------------------------------------
# Situation Summary (SitRep)
# -------------------------------------------------------------
@app.get("/api/situation-summary")
def get_situation_summary():
    """Generates an operational situation report compliant with 72-hour disaster response protocol."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1;")
    inc = c.fetchone()
    if not inc:
        conn.close()
        raise HTTPException(status_code=404, detail="No incident active")
    incident_dict = dict(inc)
    inc_id = incident_dict["id"]

    zones = get_zones_with_priorities()
    clues = fetch_clues_db()
    missing_persons = fetch_missing_persons_db()
    hazards = get_hazards()
    roads = get_road_restrictions()
    teams = get_rescue_teams()
    missions = get_missions()

    conn.close()

    sitrep = SituationSummaryEngine.generate_sitrep(
        incident=incident_dict,
        zones=zones,
        clues=clues,
        missing_persons=missing_persons,
        hazards=hazards,
        road_restrictions=roads,
        rescue_teams=teams,
        mission_assignments=missions
    )
    return sitrep

# -------------------------------------------------------------
# Offline Batch Synchronization Endpoint
# -------------------------------------------------------------
@app.post("/api/sync", response_model=OfflineSyncResponse)
def sync_offline_mutations(req: OfflineSyncRequest):
    """
    Synchronizes locally queued mutations from offline clients.
    Detects version conflicts, executes NLP fusion on offline clues, and logs sync transactions.
    """
    conn = get_connection()
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    results: List[OfflineSyncResultItem] = []
    synced_count = 0
    conflict_count = 0

    for action_item in req.actions:
        mutation_id = action_item.client_mutation_id
        entity_type = action_item.entity_type
        action = action_item.action
        payload = action_item.payload

        try:
            if entity_type == "EVIDENCE_CLUE" and action == "CREATE":
                # Process offline-created clue
                raw_text = payload.get("raw_text", "")
                zone_id = payload.get("zone_id")
                incident_id = payload.get("incident_id", "INC-WAYANAD-2026-SIM")

                extracted = ClueFusionEngine.extract_entities(raw_text)

                # Fetch existing clues for conflict check
                c.execute("SELECT * FROM evidence_clues WHERE incident_id = ?;", (incident_id,))
                existing = [dict(r) for r in c.fetchall()]

                dup_match = ClueFusionEngine.detect_duplicates(
                    incoming_text=raw_text,
                    incoming_lat=payload.get("lat"),
                    incoming_lng=payload.get("lng"),
                    existing_clues=existing
                )
                duplicate_of = dup_match[0] if dup_match else None

                has_conflict, conflict_details = ClueFusionEngine.detect_conflicts(
                    incoming_extracted=extracted,
                    incoming_text=raw_text,
                    incoming_zone_id=zone_id,
                    existing_clues=existing
                )

                clue_id = f"CLUE-OFFLINE-{uuid.uuid4().hex[:5].upper()}"
                rel = ClueFusionEngine.calculate_reliability(payload.get("source_type", "EYEWITNESS_DIRECT"), bool(extracted))

                c.execute("""
                INSERT INTO evidence_clues (
                    id, incident_id, zone_id, source_type, reporter_info, raw_text,
                    extracted_entities, lat, lng, uncertainty_meters, reliability_score,
                    verification_status, timestamp, duplicate_of_id, conflict_flag, conflict_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    clue_id, incident_id, zone_id, payload.get("source_type", "EYEWITNESS_DIRECT"),
                    payload.get("reporter_info", "Offline First Responder"),
                    raw_text, json.dumps(extracted), payload.get("lat"), payload.get("lng"),
                    payload.get("uncertainty_meters", 50.0), rel, "UNVERIFIED",
                    action_item.client_timestamp, duplicate_of,
                    1 if has_conflict else 0, json.dumps(conflict_details) if conflict_details else None
                ))

                c.execute("""
                INSERT INTO sync_logs (id, client_id, entity_type, entity_id, action, client_timestamp, server_timestamp, status, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (str(uuid.uuid4()), req.client_id, entity_type, clue_id, action, action_item.client_timestamp, now, "SYNCED", f"Offline clue reconciled. Conflict: {has_conflict}"))

                synced_count += 1
                results.append(OfflineSyncResultItem(
                    client_mutation_id=mutation_id,
                    entity_id=clue_id,
                    status="SYNCED",
                    message="Offline clue reconciled and integrated into zone intelligence"
                ))

            elif entity_type == "MISSING_PERSON" and action == "CREATE":
                mp_id = f"MP-OFFLINE-{uuid.uuid4().hex[:5].upper()}"
                c.execute("""
                INSERT INTO missing_persons (
                    id, incident_id, full_name, age, gender, last_seen_zone_id, last_seen_location_desc,
                    contact_phone, physical_description, medical_needs, reporter_name, reporter_contact, status, report_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    mp_id, payload.get("incident_id", "INC-WAYANAD-2026-SIM"), payload.get("full_name"),
                    payload.get("age"), payload.get("gender"), payload.get("last_seen_zone_id"),
                    payload.get("last_seen_location_desc"), payload.get("contact_phone"),
                    payload.get("physical_description"), payload.get("medical_needs"),
                    payload.get("reporter_name"), payload.get("reporter_contact"), "REPORTED",
                    action_item.client_timestamp
                ))

                synced_count += 1
                results.append(OfflineSyncResultItem(
                    client_mutation_id=mutation_id,
                    entity_id=mp_id,
                    status="SYNCED",
                    message="Offline missing person report synchronized successfully"
                ))

            elif entity_type == "SEARCH_ZONE" and action == "OVERRIDE":
                zid = payload.get("zone_id")
                c.execute("SELECT override_timestamp FROM search_zones WHERE id = ?;", (zid,))
                z_row = c.fetchone()
                # Check for newer server override conflict
                if z_row and z_row["override_timestamp"] and z_row["override_timestamp"] > action_item.client_timestamp:
                    conflict_count += 1
                    results.append(OfflineSyncResultItem(
                        client_mutation_id=mutation_id,
                        entity_id=zid,
                        status="CONFLICT",
                        message="Server already has a newer coordinator override. Client override was not applied to avoid overwriting newer data."
                    ))
                else:
                    c.execute("""
                    UPDATE search_zones
                    SET override_priority_score = ?, override_author = ?, override_reason = ?, override_timestamp = ?, last_updated = ?
                    WHERE id = ?;
                    """, (payload.get("override_priority_score"), payload.get("override_author"), payload.get("override_reason"), action_item.client_timestamp, now, zid))
                    synced_count += 1
                    results.append(OfflineSyncResultItem(
                        client_mutation_id=mutation_id,
                        entity_id=zid,
                        status="SYNCED",
                        message="Zone priority override synchronized"
                    ))

            else:
                results.append(OfflineSyncResultItem(
                    client_mutation_id=mutation_id,
                    status="REJECTED",
                    message=f"Unsupported entity type or action: {entity_type}/{action}"
                ))

        except Exception as e:
            conflict_count += 1
            results.append(OfflineSyncResultItem(
                client_mutation_id=mutation_id,
                status="ERROR",
                message=f"Failed to process mutation: {str(e)}"
            ))

    conn.commit()
    conn.close()

    return OfflineSyncResponse(
        success=True,
        synced_count=synced_count,
        conflict_count=conflict_count,
        results=results,
        server_timestamp=now
    )

# -------------------------------------------------------------
# Audit Logs
# -------------------------------------------------------------
@app.get("/api/audit-logs", response_model=List[AuditLog])
def get_audit_logs():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# -------------------------------------------------------------
# Static Frontend Serving (Single-Port Production & Demo Mode)
# -------------------------------------------------------------
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
presentation_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "presentation"))

@app.get("/api/download/pptx")
def download_pptx():
    pptx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "RescueGrid_Presentation.pptx"))
    if not os.path.exists(pptx_path):
        raise HTTPException(status_code=404, detail="Presentation PPTX not found.")
    return FileResponse(
        path=pptx_path,
        filename="RescueGrid_Presentation.pptx",
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

if os.path.exists(presentation_dir):
    app.mount("/presentation", StaticFiles(directory=presentation_dir, html=True), name="presentation")

if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")


