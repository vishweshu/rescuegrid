"""
RescueGrid AI - Pydantic Data Schemas
Data contracts for API validation, offline serialization, and explainability.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Incidents -----------------
class IncidentBase(BaseModel):
    title: str
    incident_type: str = "LANDSLIDE"
    location_name: str
    center_lat: float
    center_lng: float
    start_time: str
    description: Optional[str] = None
    status: str = "ACTIVE"

class IncidentCreate(IncidentBase):
    pass

class Incident(IncidentBase):
    id: str
    created_at: str

# ----------------- Search Zones -----------------
class SearchZoneBase(BaseModel):
    incident_id: str
    code: str
    name: str
    boundary_geojson: str
    center_lat: float
    center_lng: float
    estimated_occupants: int = 0
    baseline_hazard_level: str = "MEDIUM"

class ZonePriorityOverride(BaseModel):
    override_priority_score: float = Field(..., ge=0.0, le=100.0)
    override_author: str
    override_reason: str

class SearchZone(SearchZoneBase):
    id: str
    current_priority_score: float = 0.0
    rank: int = 0
    override_priority_score: Optional[float] = None
    override_author: Optional[str] = None
    override_reason: Optional[str] = None
    override_timestamp: Optional[str] = None
    last_updated: str
    # Enriched explainability fields
    score_breakdown: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    missing_information: Optional[List[str]] = None
    contradictions: Optional[List[str]] = None
    evidence_count: int = 0

# ----------------- Missing Persons -----------------
class MissingPersonBase(BaseModel):
    incident_id: str
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    last_seen_zone_id: Optional[str] = None
    last_seen_location_desc: Optional[str] = None
    contact_phone: Optional[str] = None
    physical_description: Optional[str] = None
    medical_needs: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    status: str = "REPORTED"

class MissingPersonCreate(MissingPersonBase):
    pass

class MissingPerson(MissingPersonBase):
    id: str
    report_time: str

# ----------------- Evidence Clues -----------------
class EvidenceClueBase(BaseModel):
    incident_id: str
    zone_id: Optional[str] = None
    source_type: str = "EYEWITNESS"
    reporter_info: Optional[str] = None
    raw_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    uncertainty_meters: float = 50.0
    reliability_score: float = 0.7
    verification_status: str = "UNVERIFIED"

class EvidenceClueCreate(EvidenceClueBase):
    pass

class EvidenceClue(EvidenceClueBase):
    id: str
    extracted_entities: Optional[Dict[str, Any]] = None
    timestamp: str
    duplicate_of_id: Optional[str] = None
    conflict_flag: bool = False
    conflict_details: Optional[Dict[str, Any]] = None

# ----------------- Hazards -----------------
class HazardBase(BaseModel):
    incident_id: str
    hazard_type: str
    severity: str
    lat: float
    lng: float
    radius_meters: float = 50.0
    description: str
    active: bool = True

class HazardCreate(HazardBase):
    pass

class Hazard(HazardBase):
    id: str
    reported_time: str

# ----------------- Road Restrictions -----------------
class RoadRestrictionBase(BaseModel):
    incident_id: str
    road_name: str
    restriction_type: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    passable_by: str = "NONE"
    active: bool = True

class RoadRestrictionCreate(RoadRestrictionBase):
    pass

class RoadRestriction(RoadRestrictionBase):
    id: str
    reported_time: str

# ----------------- Rescue Teams -----------------
class RescueTeamBase(BaseModel):
    incident_id: str
    name: str
    organization: str
    capabilities: List[str]
    current_status: str = "AVAILABLE"
    current_lat: float
    current_lng: float
    assigned_zone_id: Optional[str] = None
    contact_radio: Optional[str] = None

class RescueTeamCreate(RescueTeamBase):
    pass

class RescueTeam(RescueTeamBase):
    id: str

# ----------------- Mission Assignments -----------------
class MissionAssignmentBase(BaseModel):
    incident_id: str
    team_id: str
    zone_id: str
    priority_rank: int = 1
    recommended_equipment: List[str] = []
    rationale: str
    risk_warning: Optional[str] = None
    missing_intel: List[str] = []

class MissionAssignmentCreate(MissionAssignmentBase):
    pass

class MissionAssignmentUpdate(BaseModel):
    status: str
    approved_by: Optional[str] = None

class MissionAssignment(MissionAssignmentBase):
    id: str
    status: str
    approved_by: Optional[str] = None
    approved_timestamp: Optional[str] = None
    completed_timestamp: Optional[str] = None
    created_at: str

# ----------------- Audit Logs -----------------
class AuditLog(BaseModel):
    id: str
    incident_id: str
    action_type: str
    entity_type: str
    entity_id: str
    actor: str
    details: str
    timestamp: str

# ----------------- Offline Sync -----------------
class OfflineActionItem(BaseModel):
    client_mutation_id: str
    entity_type: str
    action: str  # CREATE, UPDATE, DELETE
    client_timestamp: str
    payload: Dict[str, Any]

class OfflineSyncRequest(BaseModel):
    client_id: str
    actions: List[OfflineActionItem]

class OfflineSyncResultItem(BaseModel):
    client_mutation_id: str
    entity_id: Optional[str] = None
    status: str  # SYNCED, CONFLICT, REJECTED
    message: str
    server_entity: Optional[Dict[str, Any]] = None

class OfflineSyncResponse(BaseModel):
    success: bool
    synced_count: int
    conflict_count: int
    results: List[OfflineSyncResultItem]
    server_timestamp: str
