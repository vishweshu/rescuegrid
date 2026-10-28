"""
RescueGrid AI - REST API and Offline Sync Integration Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import init_db
from backend.demo_scenario import seed_landslide_scenario
from datetime import datetime, timezone

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    seed_landslide_scenario()

def test_api_incident():
    response = client.get("/api/incident")
    assert response.status_code == 200
    data = response.json()
    assert "Western Ghats" in data["title"]
    assert data["status"] == "ACTIVE"

def test_api_zones_with_priorities():
    response = client.get("/api/zones")
    assert response.status_code == 200
    zones = response.json()
    assert len(zones) == 6
    # Zones must be ranked
    ranks = [z["rank"] for z in zones]
    assert ranks == [1, 2, 3, 4, 5, 6]
    # Check that highest priority zone has score >= 75
    assert zones[0]["active_priority_score"] >= 75.0
    assert "score_breakdown" in zones[0]
    assert "explanation" in zones[0]

def test_api_coordinator_override():
    response = client.get("/api/zones")
    zones = response.json()
    target_zone_id = zones[-1]["id"]  # lowest ranked

    override_payload = {
        "override_priority_score": 98.5,
        "override_author": "Commander Rajesh Nair",
        "override_reason": "Direct radio message from trapped village panchayat member confirming 6 children in basement."
    }
    post_res = client.post(f"/api/zones/{target_zone_id}/override", json=override_payload)
    assert post_res.status_code == 200

    # Verify updated
    get_res = client.get("/api/zones")
    new_zones = get_res.json()
    assert new_zones[0]["id"] == target_zone_id
    assert new_zones[0]["active_priority_score"] == 98.5
    assert new_zones[0]["is_overridden"] is True

def test_api_clue_creation_and_nlp():
    payload = {
        "incident_id": "INC-WAYANAD-2026-SIM",
        "zone_id": "ZONE-ALPHA",
        "source_type": "SOS_MESSAGE",
        "reporter_info": "+91-98470XXXX8",
        "raw_text": "Help! 2 people trapped under collapsed wall. Battery is 5% and water rising fast!",
        "lat": 11.5366,
        "lng": 76.1526,
        "uncertainty_meters": 20.0,
        "reliability_score": 0.85,
        "verification_status": "UNVERIFIED"
    }
    res = client.post("/api/clues", json=payload)
    assert res.status_code == 200
    clue = res.json()
    assert clue["extracted_entities"]["trapped_count"] == 2
    assert clue["extracted_entities"]["battery_percent"] == 5
    assert any("water" in u.lower() for u in clue["extracted_entities"]["urgency_keywords"])

def test_api_mission_recommendations():
    res = client.get("/api/missions/recommendations")
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) > 0
    assert recs[0]["status"] == "PROPOSED"
    assert "recommended_equipment" in recs[0]

def test_api_situation_summary():
    res = client.get("/api/situation-summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["metrics"]["total_missing_persons"] >= 5
    assert len(summary["top_priority_zones"]) > 0
    assert len(summary["recommended_next_actions"]) > 0

def test_offline_sync_mutations():
    sync_payload = {
        "client_id": "FIELD-TABLET-ALPHA-01",
        "actions": [
            {
                "client_mutation_id": "MUT-001",
                "entity_type": "EVIDENCE_CLUE",
                "action": "CREATE",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "incident_id": "INC-WAYANAD-2026-SIM",
                    "zone_id": "ZONE-BRAVO",
                    "source_type": "FIRST_RESPONDER",
                    "reporter_info": "Offline Squad Lead",
                    "raw_text": "Scouted rear school yard offline; no signs of life, clearing perimeter.",
                    "lat": 11.5361,
                    "lng": 76.1561
                }
            }
        ]
    }
    res = client.post("/api/sync", json=sync_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["synced_count"] == 1
    assert data["conflict_count"] == 0
