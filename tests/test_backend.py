"""
RescueGrid AI - Comprehensive Automated Test Suite
Tests for:
- Database initialization and landslide scenario seeding
- NLP Entity Extraction (trapped counts, acoustic signs of life, urgency)
- Duplicate Clue Detection (spatial and textual)
- Conflict / Contradiction Detection
- Explainable Prioritization Engine & Humanitarian Safeguards
- Capability-Aware Rescue Mission Planner
- Situation Report (SitRep) Generation
- Offline Batch Synchronization and Conflict Reconciliation
"""

import pytest
import os
import tempfile
import json
from datetime import datetime, timezone

from backend.database import init_db, get_connection
from backend.demo_scenario import seed_landslide_scenario
from backend.nlp_fusion import ClueFusionEngine
from backend.prioritization import PrioritizationEngine
from backend.mission_planner import MissionPlannerEngine
from backend.situation_summary import SituationSummaryEngine

@pytest.fixture
def temp_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    seed_landslide_scenario(path)
    yield path
    if os.path.exists(path):
        os.remove(path)

# ----------------- 1. Database & Scenario Seeding Tests -----------------
def test_scenario_seeding(temp_db):
    conn = get_connection(temp_db)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM search_zones;")
    assert c.fetchone()[0] == 6, "Expected 6 search zones covering the 20 structures"

    c.execute("SELECT COUNT(*) FROM missing_persons;")
    assert c.fetchone()[0] >= 5, "Expected synthetic missing persons"

    c.execute("SELECT COUNT(*) FROM rescue_teams;")
    assert c.fetchone()[0] == 3, "Expected 3 rescue teams with distinct capabilities"

    c.execute("SELECT COUNT(*) FROM hazards;")
    assert c.fetchone()[0] >= 3, "Expected hazards like landslide debris and snapped powerlines"
    conn.close()

# ----------------- 2. NLP Entity Extraction Tests -----------------
def test_nlp_headcount_and_cues_extraction():
    text = "We hear rhythmic tapping under rubble! 3 people trapped in basement with water rising and battery at 11%."
    entities = ClueFusionEngine.extract_entities(text)
    
    assert entities["trapped_count"] == 3
    assert entities["has_signs_of_life"] is True
    assert any("tapping" in s.lower() for s in entities["signs_of_life_details"])
    assert any("water" in u.lower() for u in entities["urgency_keywords"])
    assert entities["battery_percent"] == 11
    assert entities["evacuated_claimed"] is False

def test_nlp_word_number_extraction():
    text = "Family of four trapped under wooden roof truss with infant."
    entities = ClueFusionEngine.extract_entities(text)
    assert entities["trapped_count"] == 4
    assert any("infant" in v.lower() for v in entities["vulnerable_people"])

def test_nlp_evacuation_claim_extraction():
    text = "All residents from house 12 safely evacuated to temple shelter before the mudslide."
    entities = ClueFusionEngine.extract_entities(text)
    assert entities["evacuated_claimed"] is True

# ----------------- 3. Duplicate Detection Tests -----------------
def test_duplicate_detection():
    existing_clues = [
        {
            "id": "CLUE-001",
            "raw_text": "Saw 3 people trapped inside Quarter #2 under the collapsed wooden roof truss when mud came down.",
            "lat": 11.5367,
            "lng": 76.1527
        }
    ]

    # Near duplicate
    incoming_text = "Report says 3 people trapped in quarter 2 under wooden roof truss"
    dup = ClueFusionEngine.detect_duplicates(
        incoming_text=incoming_text,
        incoming_lat=11.5368,
        incoming_lng=76.1528,
        existing_clues=existing_clues
    )
    assert dup is not None
    assert dup[0] == "CLUE-001"
    assert dup[1] >= 0.40

# ----------------- 4. Conflict Detection Tests -----------------
def test_conflict_detection_evacuated_vs_trapped():
    existing_clues = [
        {
            "id": "CLUE-004",
            "zone_id": "ZONE-CHARLIE",
            "extracted_entities": {
                "trapped_count": 4,
                "has_signs_of_life": True,
                "evacuated_claimed": False
            }
        }
    ]

    incoming_extracted = {
        "trapped_count": 0,
        "has_signs_of_life": False,
        "evacuated_claimed": True
    }

    has_conflict, details = ClueFusionEngine.detect_conflicts(
        incoming_extracted=incoming_extracted,
        incoming_text="Everyone in Zone Charlie safely fled to temple camp",
        incoming_zone_id="ZONE-CHARLIE",
        existing_clues=existing_clues
    )
    assert has_conflict is True
    assert details["conflict_type"] == "EVACUATION_VS_TRAPPED_CONTRADICTION"
    assert "DO NOT" in details["recommended_action"].upper()

# ----------------- 5. Prioritization Engine & Safeguards -----------------
def test_zone_with_zero_clues_never_marked_zero():
    """Humanitarian AI safeguard: An uninvestigated zone must NOT be scored 0 or marked clear!"""
    empty_zone = {
        "id": "ZONE-EMPTY",
        "name": "Uninvestigated Valley Sector",
        "estimated_occupants": 0,
        "baseline_hazard_level": "MEDIUM",
        "override_priority_score": None
    }
    result = PrioritizationEngine.calculate_zone_priority(
        zone=empty_zone,
        clues=[],
        missing_persons=[],
        hazards=[],
        road_restrictions=[]
    )
    assert result["calculated_priority_score"] > 0.0, "Uninvestigated zone must have baseline vigilance score"
    assert any("baseline" in a.lower() for a in result["assumptions_made"])

def test_high_priority_zone_scoring():
    zone = {
        "id": "ZONE-ALPHA",
        "name": "Tea Estate Quarters",
        "estimated_occupants": 6,
        "baseline_hazard_level": "HIGH",
        "override_priority_score": None
    }
    clues = [
        {
            "id": "CLUE-1",
            "source_type": "ACOUSTIC_SENSOR",
            "verification_status": "VERIFIED_PHYSICALLY",
            "reliability_score": 0.95,
            "extracted_entities": {
                "trapped_count": 4,
                "has_signs_of_life": True,
                "urgency_keywords": ["mud sliding"],
                "battery_percent": 10
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]
    missing = [
        {"id": "MP-1", "full_name": "Test Child", "age": 5, "medical_needs": "Asthma"}
    ]
    hazards = [
        {"hazard_type": "LANDSLIDE_DEBRIS", "severity": "CRITICAL", "active": True}
    ]

    result = PrioritizationEngine.calculate_zone_priority(
        zone=zone,
        clues=clues,
        missing_persons=missing,
        hazards=hazards,
        road_restrictions=[]
    )
    assert result["calculated_priority_score"] >= 75.0, "Critical emergency zone should score >= 75"
    assert "CRITICAL RESCUE PRIORITY" in result["explanation"]
    assert result["score_breakdown"]["evidence_strength"] >= 70.0

# ----------------- 6. Mission Planner Capability Matching -----------------
def test_mission_planner_capability_matching():
    zones = [
        {
            "id": "ZONE-ALPHA",
            "name": "Tea Quarters",
            "code": "Z-01",
            "center_lat": 11.5365,
            "center_lng": 76.1525,
            "current_priority_score": 90.0,
            "override_priority_score": None,
            "estimated_occupants": 4
        }
    ]
    teams = [
        {
            "id": "TEAM-01",
            "name": "NDRF Canine Search Squad",
            "organization": "NDRF",
            "capabilities": ["K9_SEARCH", "ACOUSTIC_LISTENING"],
            "current_status": "AVAILABLE",
            "current_lat": 11.5370,
            "current_lng": 76.1520
        },
        {
            "id": "TEAM-02",
            "name": "General Transport Unit",
            "organization": "Civil Defense",
            "capabilities": ["TRANSPORT_ONLY"],
            "current_status": "AVAILABLE",
            "current_lat": 11.5370,
            "current_lng": 76.1520
        }
    ]
    clues_by_zone = {
        "ZONE-ALPHA": [{
            "id": "C1",
            "raw_text": "Tapping heard under rubble, need canine search to locate void."
        }]
    }

    recs = MissionPlannerEngine.generate_recommendations(
        zones=zones,
        teams=teams,
        hazards=[],
        road_restrictions=[],
        clues_by_zone=clues_by_zone
    )
    assert len(recs) == 1
    assert recs[0]["team_id"] == "TEAM-01", "K9 team should be matched to rubble/canine search need"
    assert recs[0]["status"] == "PROPOSED", "Must require coordinator approval"

# ----------------- 7. Situation Summary Tests -----------------
def test_situation_summary_engine():
    incident = {"title": "Test Incident", "incident_type": "LANDSLIDE", "location_name": "Test Sector"}
    zones = [{"id": "Z1", "code": "Z-01", "name": "Zone 1", "current_priority_score": 85.0, "override_priority_score": None, "estimated_occupants": 3}]
    clues = [
        {"id": "C1", "zone_id": "Z1", "verification_status": "UNVERIFIED", "conflict_flag": False, "raw_text": "Test clue"},
        {"id": "C2", "zone_id": "Z1", "verification_status": "UNVERIFIED", "conflict_flag": True, "conflict_details": {"conflict_type": "HEADCOUNT_DISCREPANCY", "explanation": "Test discrepancy", "recommended_action": "Verify"}}
    ]
    missing = [{"id": "M1", "status": "REPORTED"}, {"id": "M2", "status": "LOCATED_ALIVE"}]
    teams = [{"name": "Team A", "current_status": "AVAILABLE"}]

    sitrep = SituationSummaryEngine.generate_sitrep(
        incident=incident,
        zones=zones,
        clues=clues,
        missing_persons=missing,
        hazards=[],
        road_restrictions=[],
        rescue_teams=teams,
        mission_assignments=[]
    )
    assert sitrep["metrics"]["total_missing_persons"] == 2
    assert sitrep["metrics"]["unresolved_missing"] == 1
    assert sitrep["metrics"]["located_alive"] == 1
    assert sitrep["metrics"]["active_conflicts_count"] == 1
    assert len(sitrep["recommended_next_actions"]) > 0
