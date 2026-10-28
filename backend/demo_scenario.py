"""
RescueGrid AI - Simulated Landslide Disaster Scenario Generator
Generates a fully reproducible, realistic 72-hour landslide search & rescue scenario.
Modeled after Western Ghats monsoon landslide dynamics (20 structures, 6 search zones, 14 clues).
All data is explicitly marked SIMULATED for hackathon / training demonstration.
"""

import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from .database import get_connection

def seed_landslide_scenario(db_path: str = None) -> Dict[str, Any]:
    from .database import get_connection, DB_PATH
    conn = get_connection(db_path or DB_PATH)
    cursor = conn.cursor()

    # Clear existing data for clean demo state
    tables = [
        "sync_logs", "audit_logs", "mission_assignments", "rescue_teams",
        "road_restrictions", "hazards", "evidence_clues", "missing_persons",
        "search_zones", "incidents"
    ]
    for tbl in tables:
        cursor.execute(f"DELETE FROM {tbl};")

    now = datetime.now(timezone.utc)
    t_minus_12h = (now - timedelta(hours=12)).isoformat()
    t_minus_6h = (now - timedelta(hours=6)).isoformat()
    t_minus_3h = (now - timedelta(hours=3)).isoformat()
    t_minus_1h = (now - timedelta(hours=1)).isoformat()
    t_minus_20m = (now - timedelta(minutes=20)).isoformat()

    # 1. Incident
    incident_id = "INC-WAYANAD-2026-SIM"
    cursor.execute("""
    INSERT INTO incidents (id, title, incident_type, location_name, center_lat, center_lng, start_time, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incident_id,
        "SIMULATED: Western Ghats Hillside Landslide Sector 4",
        "LANDSLIDE",
        "Meppadi - Chooralmala Hills (Simulated)",
        11.5350, 76.1550,
        t_minus_12h,
        "Heavy monsoon cloudburst triggered extensive debris flow affecting 20 structures across 6 search sectors. Roads cut off by mud deposits and snapped utilities.",
        "ACTIVE",
        now.isoformat()
    ))

    # 2. Search Zones (6 Zones covering 20 structures)
    zones = [
        (
            "ZONE-ALPHA", incident_id, "Z-01", "Tea Estate Staff Quarters (Structures #1-#4)",
            json.dumps({"type": "Polygon", "coordinates": [[[76.1510, 11.5380], [76.1540, 11.5380], [76.1540, 11.5350], [76.1510, 11.5350], [76.1510, 11.5380]]]}),
            11.5365, 76.1525, 6, "HIGH", 88.5, 1, t_minus_1h
        ),
        (
            "ZONE-BRAVO", incident_id, "Z-02", "Market Junction & Primary School (Structures #5-#8)",
            json.dumps({"type": "Polygon", "coordinates": [[[76.1545, 11.5380], [76.1580, 11.5380], [76.1580, 11.5345], [76.1545, 11.5345], [76.1545, 11.5380]]]}),
            11.5362, 76.1562, 4, "MEDIUM", 62.0, 3, t_minus_3h
        ),
        (
            "ZONE-CHARLIE", incident_id, "Z-03", "Hillside Residential Enclave (Structures #9-#12) [CONFLICT ZONE]",
            json.dumps({"type": "Polygon", "coordinates": [[[76.1515, 11.5345], [76.1555, 11.5345], [76.1555, 11.5315], [76.1515, 11.5315], [76.1515, 11.5345]]]}),
            11.5330, 76.1535, 7, "CRITICAL", 92.0, 1, t_minus_20m
        ),
        (
            "ZONE-DELTA", incident_id, "Z-04", "Sri Krishna Temple Relief Shelter (Structures #13-#15)",
            json.dumps({"type": "Polygon", "coordinates": [[[76.1585, 11.5375], [76.1620, 11.5375], [76.1620, 11.5335], [76.1585, 11.5335], [76.1585, 11.5375]]]}),
            11.5355, 76.1602, 35, "LOW", 28.0, 6, t_minus_6h
        ),
        (
            "ZONE-ECHO", incident_id, "Z-05", "Forest Depot & Timber Yard (Structures #16-#17)",
            json.dumps({"type": "Polygon", "coordinates": [[[76.1480, 11.5340], [76.1510, 11.5340], [76.1510, 11.5305], [76.1480, 11.5305], [76.1480, 11.5340]]]}),
            11.5322, 76.1495, 2, "HIGH", 54.0, 4, t_minus_3h
        ),
        (
            "ZONE-FOXTROT", incident_id, "Z-06", "Valley Road Bridgehead & Auto Stand (Structures #18-#20)",
            json.dumps({"type": "Polygon", "coordinates": [[[76.1540, 11.5310], [76.1580, 11.5310], [76.1580, 11.5275], [76.1540, 11.5275], [76.1540, 11.5310]]]}),
            11.5292, 76.1560, 3, "MEDIUM", 46.5, 5, t_minus_1h
        )
    ]
    cursor.executemany("""
    INSERT INTO search_zones (id, incident_id, code, name, boundary_geojson, center_lat, center_lng, estimated_occupants, baseline_hazard_level, current_priority_score, rank, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, zones)

    # 3. Missing Persons (Synthetic names and profiles)
    missing_persons = [
        ("MP-001", incident_id, "Aarav Pillai", 34, "Male", "ZONE-ALPHA", "Quarter #2 Kitchen Area", "+91-98470XXXX1", "Blue shirt, scar on left eyebrow", "None", "Priya Pillai", "+91-98470XXXX2", "REPORTED", t_minus_6h),
        ("MP-002", incident_id, "Meenakshi Pillai", 31, "Female", "ZONE-ALPHA", "Quarter #2", "+91-98470XXXX2", "Yellow saree", "Asthma inhaler needed", "Priya Pillai", "+91-98470XXXX2", "REPORTED", t_minus_6h),
        ("MP-003", incident_id, "Ananya Pillai", 6, "Female", "ZONE-ALPHA", "Quarter #2 Bedroom", None, "Child, red dress", "Pediatric care", "Priya Pillai", "+91-98470XXXX2", "REPORTED", t_minus_6h),
        ("MP-004", incident_id, "Kalyani Amma", 72, "Female", "ZONE-CHARLIE", "House #11 Attic", None, "Elderly woman, walking stick", "Diabetic insulin dependence, mobility impaired", "Harish Nair", "+91-94470XXXX3", "REPORTED", t_minus_3h),
        ("MP-005", incident_id, "Harish Nair", 42, "Male", "ZONE-CHARLIE", "House #11", "+91-94470XXXX3", "Grey tracks", "Crush injury suspected", "Self SOS", "+91-94470XXXX3", "REPORTED", t_minus_1h),
        ("MP-006", incident_id, "Rajesh Kumar", 54, "Male", "ZONE-ECHO", "Forest Depot Watch Tower", "+91-94950XXXX4", "Khaki uniform", "Hypertension", "Ranger Officer", "+91-94950XXXX5", "REPORTED", t_minus_6h),
        ("MP-007", incident_id, "Suresh Babu", 29, "Male", "ZONE-FOXTROT", "Auto Stand Driver Shed", "+91-97440XXXX6", "Auto driver khaki shirt", "None", "Auto Union Head", "+91-97440XXXX7", "REPORTED", t_minus_3h)
    ]
    cursor.executemany("""
    INSERT INTO missing_persons (id, incident_id, full_name, age, gender, last_seen_zone_id, last_seen_location_desc, contact_phone, physical_description, medical_needs, reporter_name, reporter_contact, status, report_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, missing_persons)

    # 4. Evidence Clues (Demonstrating Corroboration, Duplicates, and Conflicts)
    clues = [
        # Clue 1: Direct Eyewitness in Zone Alpha
        (
            "CLUE-001", incident_id, "ZONE-ALPHA", "EYEWITNESS_DIRECT", "Neighbor Suresh (+91-98470XXXX9)",
            "Saw 3 people trapped inside Quarter #2 under the collapsed wooden roof truss when mud came down.",
            json.dumps({"trapped_count": 3, "has_signs_of_life": True, "signs_of_life_details": ["Visual confirmation before fleeing"], "urgency_keywords": ["mud sliding"], "vulnerable_people": ["Child / minor"]}),
            11.5367, 76.1527, 25.0, 0.85, "CORROBORATED", t_minus_6h, None, 0, None
        ),
        # Clue 2: Acoustic Sensor corroborating Clue 1
        (
            "CLUE-002", incident_id, "ZONE-ALPHA", "ACOUSTIC_SENSOR", "Delsar Acoustic Sensor Node 4B",
            "Rhythmic tapping detected under debris pile at Quarter #2 footprint. Distinct 4-beat cadence, depth estimated 1.8 meters.",
            json.dumps({"trapped_count": 3, "has_signs_of_life": True, "signs_of_life_details": ["Tapping / knocking sounds heard under debris"], "urgency_keywords": []}),
            11.5366, 76.1526, 10.0, 0.95, "VERIFIED_PHYSICALLY", t_minus_1h, None, 0, None
        ),
        # Clue 3: Duplicate report of Clue 1
        (
            "CLUE-003", incident_id, "ZONE-ALPHA", "FAMILY_REPORT", "Relative via Control Room (+91-98470XXXX2)",
            "Priya reports family of 3 people trapped in estate quarter 2 bedroom, need immediate rescue.",
            json.dumps({"trapped_count": 3, "has_signs_of_life": True, "signs_of_life_details": [], "urgency_keywords": []}),
            11.5365, 76.1525, 30.0, 0.75, "CORROBORATED", t_minus_3h, "CLUE-001", 0, None
        ),
        # Clue 4: SOS Emergency Message in Zone Charlie
        (
            "CLUE-004", incident_id, "ZONE-CHARLIE", "SOS_MESSAGE", "Harish Nair (+91-94470XXXX3)",
            "URGENT SOS: Battery at 12%. 4 people trapped in House #11 attic space. Water rising from broken culvert, grandmother has severe asthma and bleeding.",
            json.dumps({"trapped_count": 4, "has_signs_of_life": True, "signs_of_life_details": ["Direct voice/SMS"], "urgency_keywords": ["Severe bleeding / medical trauma", "Respiratory distress / asthma", "Rising water / flash flood risk"], "battery_percent": 12, "vulnerable_people": ["Elderly woman"]}),
            11.5332, 76.1537, 15.0, 0.90, "UNVERIFIED", t_minus_1h, None, 0, None
        ),
        # Clue 5: HIGH TENSION CONFLICT with Clue 4 in Zone Charlie
        (
            "CLUE-005", incident_id, "ZONE-CHARLIE", "SOCIAL_MEDIA_CHATTER", "Local Community WhatsApp Group Admin",
            "All residents of Hillside House #11 have safely evacuated to Sri Krishna Temple camp at 04:30 AM before the slide hit.",
            json.dumps({"trapped_count": 0, "evacuated_claimed": True, "has_signs_of_life": False}),
            11.5335, 76.1539, 80.0, 0.45, "UNVERIFIED", t_minus_20m, None, 1,
            json.dumps({
                "conflict_type": "EVACUATION_VS_TRAPPED_CONTRADICTION",
                "competing_clue_id": "CLUE-004",
                "severity": "CRITICAL",
                "explanation": "WhatsApp message claims House #11 evacuated, but direct Clue #CLUE-004 from trapped occupant Harish at battery 12% reported 4 people trapped with asthma.",
                "recommended_action": "DO NOT DEMOTE PRIORITY. Dispatch reconnaissance unit to physically verify House #11 attic."
            })
        ),
        # Clue 6: Market School Report
        (
            "CLUE-006", incident_id, "ZONE-BRAVO", "FIRST_RESPONDER", "Civil Defense Warden #12",
            "Primary School main building structural integrity stable, but rear store room roof partially breached by landslide mud slip.",
            json.dumps({"trapped_count": 0, "has_signs_of_life": False, "urgency_keywords": []}),
            11.5360, 76.1560, 20.0, 0.88, "CORROBORATED", t_minus_3h, None, 0, None
        ),
        # Clue 7: Drone Thermal Recon in Zone Bravo
        (
            "CLUE-007", incident_id, "ZONE-BRAVO", "DRONE_RECON", "NDRF Recon Quadcopter Thermal-1",
            "Thermal anomaly detected in school rear store room debris. Heat signature consistent with human or animal, depth 1.2m.",
            json.dumps({"trapped_count": 1, "has_signs_of_life": True, "signs_of_life_details": ["Thermal hotspot detected by FLIR camera"], "urgency_keywords": []}),
            11.5363, 76.1564, 15.0, 0.92, "CORROBORATED", t_minus_1h, None, 0, None
        ),
        # Clue 8: Forest Depot Clue
        (
            "CLUE-008", incident_id, "ZONE-ECHO", "FAMILY_REPORT", "Depot Manager",
            "Two forest watchmen were on night shift in timber yard depot. Wireless handset stopped transmitting at 05:15 AM.",
            json.dumps({"trapped_count": 2, "has_signs_of_life": False, "urgency_keywords": []}),
            11.5320, 76.1492, 60.0, 0.70, "UNVERIFIED", t_minus_6h, None, 0, None
        ),
        # Clue 9: Valley Bridgehead Auto Stand
        (
            "CLUE-009", incident_id, "ZONE-FOXTROT", "EYEWITNESS_DIRECT", "Local Auto Driver Vinod",
            "Saw three auto rickshaws buried under bridge embankment mud. Suresh's auto was parked there during the cloudburst.",
            json.dumps({"trapped_count": 1, "has_signs_of_life": False, "urgency_keywords": ["mud sliding"]}),
            11.5290, 76.1558, 40.0, 0.75, "UNVERIFIED", t_minus_3h, None, 0, None
        )
    ]
    cursor.executemany("""
    INSERT INTO evidence_clues (id, incident_id, zone_id, source_type, reporter_info, raw_text, extracted_entities, lat, lng, uncertainty_meters, reliability_score, verification_status, timestamp, duplicate_of_id, conflict_flag, conflict_details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, clues)

    # 5. Hazards (Landslide debris, powerline, mudflow)
    hazards = [
        ("HAZ-001", incident_id, "LANDSLIDE_DEBRIS", "CRITICAL", 11.5340, 76.1540, 120.0, "Active slope creep on Upper Hillside ridge. High risk of secondary mudslide during rainfall.", t_minus_6h, 1),
        ("HAZ-002", incident_id, "POWERLINE_DOWN", "HIGH", 11.5358, 76.1550, 45.0, "Snapped 11kV high-tension cable lying across Market road culvert. KSEB grid isolation pending.", t_minus_3h, 1),
        ("HAZ-003", incident_id, "GAS_LEAK", "MEDIUM", 11.5368, 76.1565, 30.0, "Strong commercial LPG odor reported from collapsed bakery kitchen storage.", t_minus_1h, 1)
    ]
    cursor.executemany("""
    INSERT INTO hazards (id, incident_id, hazard_type, severity, lat, lng, radius_meters, description, reported_time, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, hazards)

    # 6. Road Restrictions
    roads = [
        ("ROAD-001", incident_id, "Meppadi-Estate Arterial Road", "BLOCKED_DEBRIS", 11.5352, 76.1530, 11.5355, 76.1548, "NONE", t_minus_6h, 1),
        ("ROAD-002", incident_id, "Valley Bridgehead Causeway", "BRIDGE_COLLAPSED", 11.5298, 76.1555, 11.5290, 76.1565, "FOOT_ONLY", t_minus_6h, 1),
        ("ROAD-003", incident_id, "Temple Ridge Bypass Track", "RESTRICTED_EMERGENCY_ONLY", 11.5340, 76.1580, 11.5360, 76.1600, "4X4_ONLY", t_minus_3h, 1)
    ]
    cursor.executemany("""
    INSERT INTO road_restrictions (id, incident_id, road_name, restriction_type, start_lat, start_lng, end_lat, end_lng, passable_by, reported_time, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, roads)

    # 7. Rescue Teams with Different Capabilities
    teams = [
        (
            "TEAM-01", incident_id, "NDRF Team 04 (Bravo Alpha)", "NDRF 4th Battalion",
            json.dumps(["K9_SEARCH", "ACOUSTIC_LISTENING", "CANINE_SEARCH", "LIGHT_EXTRICATION", "SATELLITE_COMMS"]),
            "AVAILABLE", 11.5385, 76.1510, None, "VHF Channel 16 / 156.8 MHz"
        ),
        (
            "TEAM-02", incident_id, "SDRF Heavy Breach Squad 11", "Kerala SDRF",
            json.dumps(["HEAVY_EXTRICATION", "HYDRAULIC_CUTTERS", "PNEUMATIC_LIFTING", "STRUCTURAL_SHORING", "EXCAVATOR_OPS"]),
            "AVAILABLE", 11.5390, 76.1560, None, "VHF Channel 08 / 156.4 MHz"
        ),
        (
            "TEAM-03", incident_id, "Civil Defense & 108 Advanced Medical Unit", "Health Dept & Civil Defense",
            json.dumps(["TRAUMA_TRIAGE", "ADVANCED_LIFE_SUPPORT", "PEDIATRIC_CARE", "OXYGEN_THERAPY", "AMBULANCE_EVAC"]),
            "AVAILABLE", 11.5360, 76.1610, "ZONE-DELTA", "VHF Channel 12 / 156.6 MHz"
        )
    ]
    cursor.executemany("""
    INSERT INTO rescue_teams (id, incident_id, name, organization, capabilities, current_status, current_lat, current_lng, assigned_zone_id, contact_radio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, teams)

    # 8. Initial Audit Log Entry
    cursor.execute("""
    INSERT INTO audit_logs (id, incident_id, action_type, entity_type, entity_id, actor, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "AUDIT-001", incident_id, "SYSTEM_SEED", "INCIDENT", incident_id,
        "System Administrator (Simulation Controller)",
        "Loaded baseline competition dataset: Meppadi-Chooralmala simulated landslide with 20 structures, 6 zones, 9 clues, 3 hazards, and 3 rescue teams.",
        now.isoformat()
    ))

    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "incident_id": incident_id, "structures_modeled": 20, "zones_count": 6}
