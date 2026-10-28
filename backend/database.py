"""
RescueGrid AI - Database Engine
SQLite-backed storage with ACID compliance, WAL mode for concurrent operations,
and schema initialization for disaster response data entities.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "rescuegrid.db")

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high performance concurrency
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: str = DB_PATH):
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # 1. Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        location_name TEXT NOT NULL,
        center_lat REAL NOT NULL,
        center_lng REAL NOT NULL,
        start_time TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL
    );
    """)

    # 2. Search Zones Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS search_zones (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        boundary_geojson TEXT NOT NULL,
        center_lat REAL NOT NULL,
        center_lng REAL NOT NULL,
        estimated_occupants INTEGER DEFAULT 0,
        baseline_hazard_level TEXT DEFAULT 'MEDIUM',
        current_priority_score REAL DEFAULT 0.0,
        rank INTEGER DEFAULT 0,
        override_priority_score REAL,
        override_author TEXT,
        override_reason TEXT,
        override_timestamp TEXT,
        last_updated TEXT NOT NULL,
        FOREIGN KEY(incident_id) REFERENCES incidents(id)
    );
    """)

    # 3. Missing Persons Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS missing_persons (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        last_seen_zone_id TEXT,
        last_seen_location_desc TEXT,
        contact_phone TEXT,
        physical_description TEXT,
        medical_needs TEXT,
        reporter_name TEXT,
        reporter_contact TEXT,
        status TEXT DEFAULT 'REPORTED',
        report_time TEXT NOT NULL,
        FOREIGN KEY(incident_id) REFERENCES incidents(id)
    );
    """)

    # 4. Evidence Clues Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evidence_clues (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        zone_id TEXT,
        source_type TEXT NOT NULL,
        reporter_info TEXT,
        raw_text TEXT NOT NULL,
        extracted_entities TEXT,
        lat REAL,
        lng REAL,
        uncertainty_meters REAL DEFAULT 50.0,
        reliability_score REAL DEFAULT 0.7,
        verification_status TEXT DEFAULT 'UNVERIFIED',
        timestamp TEXT NOT NULL,
        duplicate_of_id TEXT,
        conflict_flag INTEGER DEFAULT 0,
        conflict_details TEXT,
        FOREIGN KEY(incident_id) REFERENCES incidents(id)
    );
    """)

    # 5. Hazards Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hazards (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        radius_meters REAL DEFAULT 50.0,
        description TEXT NOT NULL,
        reported_time TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        FOREIGN KEY(incident_id) REFERENCES incidents(id)
    );
    """)

    # 6. Road Restrictions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_restrictions (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        road_name TEXT NOT NULL,
        restriction_type TEXT NOT NULL,
        start_lat REAL NOT NULL,
        start_lng REAL NOT NULL,
        end_lat REAL NOT NULL,
        end_lng REAL NOT NULL,
        passable_by TEXT DEFAULT 'NONE',
        reported_time TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        FOREIGN KEY(incident_id) REFERENCES incidents(id)
    );
    """)

    # 7. Rescue Teams Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rescue_teams (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        name TEXT NOT NULL,
        organization TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        current_status TEXT DEFAULT 'AVAILABLE',
        current_lat REAL NOT NULL,
        current_lng REAL NOT NULL,
        assigned_zone_id TEXT,
        contact_radio TEXT,
        FOREIGN KEY(incident_id) REFERENCES incidents(id)
    );
    """)

    # 8. Mission Assignments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mission_assignments (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        status TEXT DEFAULT 'PROPOSED',
        priority_rank INTEGER DEFAULT 1,
        recommended_equipment TEXT,
        rationale TEXT NOT NULL,
        risk_warning TEXT,
        missing_intel TEXT,
        approved_by TEXT,
        approved_timestamp TEXT,
        completed_timestamp TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(incident_id) REFERENCES incidents(id),
        FOREIGN KEY(team_id) REFERENCES rescue_teams(id),
        FOREIGN KEY(zone_id) REFERENCES search_zones(id)
    );
    """)

    # 9. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );
    """)

    # 10. Sync Log Table (for offline client reconciliation)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        client_timestamp TEXT NOT NULL,
        server_timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("RescueGrid database initialized successfully.")
