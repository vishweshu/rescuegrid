export interface Incident {
  id: string;
  title: string;
  incident_type: string;
  location_name: string;
  center_lat: number;
  center_lng: number;
  start_time: string;
  description: string;
  status: string;
  created_at: string;
}

export interface ScoreBreakdown {
  evidence_strength: number;
  potential_occupancy: number;
  urgency_threat: number;
  temporal_recency: number;
  access_impedance_penalty: number;
  weights_used?: Record<string, number>;
}

export interface SearchZone {
  id: string;
  incident_id: string;
  code: string;
  name: string;
  boundary_geojson: string;
  center_lat: number;
  center_lng: number;
  estimated_occupants: number;
  baseline_hazard_level: string;
  current_priority_score: number;
  active_priority_score: number;
  rank: number;
  override_priority_score?: number | null;
  override_author?: string | null;
  override_reason?: string | null;
  override_timestamp?: string | null;
  last_updated: string;
  is_overridden?: boolean;
  score_breakdown?: ScoreBreakdown;
  explanation?: string;
  verified_facts?: string[];
  user_reports?: string[];
  assumptions_made?: string[];
  missing_information?: string[];
  evidence_count?: number;
  effective_occupancy?: number;
  vulnerable_count?: number;
}

export interface ExtractedEntities {
  trapped_count: number;
  has_signs_of_life: boolean;
  signs_of_life_details?: string[];
  urgency_keywords?: string[];
  evacuated_claimed?: boolean;
  vulnerable_people?: string[];
  battery_percent?: number | null;
}

export interface ConflictDetails {
  conflict_type: string;
  competing_clue_id?: string;
  severity: string;
  explanation: string;
  recommended_action: string;
}

export interface EvidenceClue {
  id: string;
  incident_id: string;
  zone_id?: string | null;
  source_type: string;
  reporter_info?: string;
  raw_text: string;
  extracted_entities?: ExtractedEntities;
  lat?: number | null;
  lng?: number | null;
  uncertainty_meters: number;
  reliability_score: number;
  verification_status: string;
  timestamp: string;
  duplicate_of_id?: string | null;
  conflict_flag: boolean;
  conflict_details?: ConflictDetails | null;
}

export interface MissingPerson {
  id: string;
  incident_id: string;
  full_name: string;
  age?: number | null;
  gender?: string | null;
  last_seen_zone_id?: string | null;
  last_seen_location_desc?: string | null;
  contact_phone?: string | null;
  physical_description?: string | null;
  medical_needs?: string | null;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  status: string;
  report_time: string;
}

export interface Hazard {
  id: string;
  incident_id: string;
  hazard_type: string;
  severity: string;
  lat: number;
  lng: number;
  radius_meters: number;
  description: string;
  reported_time: string;
  active: boolean;
}

export interface RoadRestriction {
  id: string;
  incident_id: string;
  road_name: string;
  restriction_type: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  passable_by: string;
  reported_time: string;
  active: boolean;
}

export interface RescueTeam {
  id: string;
  incident_id: string;
  name: string;
  organization: string;
  capabilities: string[];
  current_status: string;
  current_lat: number;
  current_lng: number;
  assigned_zone_id?: string | null;
  contact_radio?: string | null;
}

export interface MissionRecommendation {
  zone_id: string;
  zone_name: string;
  zone_code: string;
  priority_score: number;
  priority_rank: number;
  team_id?: string | null;
  team_name: string;
  team_organization: string;
  recommended_equipment: string[];
  rationale: string;
  risk_warning: string;
  missing_intel: string[];
  status: string;
}

export interface MissionAssignment {
  id: string;
  incident_id: string;
  team_id: string;
  team_name?: string;
  team_org?: string;
  zone_id: string;
  zone_name?: string;
  zone_code?: string;
  status: string;
  priority_rank: number;
  recommended_equipment: string[];
  rationale: string;
  risk_warning?: string;
  missing_intel: string[];
  approved_by?: string;
  approved_timestamp?: string;
  completed_timestamp?: string;
  created_at: string;
}

export interface SituationSummary {
  incident_title: string;
  incident_type: string;
  location: string;
  generated_at: string;
  metrics: {
    total_missing_persons: number;
    unresolved_missing: number;
    located_alive: number;
    deceased: number;
    total_evidence_clues: number;
    unverified_clues: number;
    corroborated_clues: number;
    active_conflicts_count: number;
    active_hazards_count: number;
    critical_hazards_count: number;
    blocked_roads_count: number;
    total_rescue_teams: number;
    deployed_teams_count: number;
    available_teams_count: number;
  };
  top_priority_zones: Array<{
    id: string;
    code: string;
    name: string;
    priority_score: number;
    is_overridden: boolean;
    estimated_occupants: number;
  }>;
  critical_hazards: Array<{
    hazard_type: string;
    severity: string;
    description: string;
    radius_meters: number;
  }>;
  blocked_routes: Array<{
    road_name: string;
    restriction_type: string;
    passable_by: string;
  }>;
  rescue_teams_summary: {
    available: string[];
    deployed: string[];
    resting: string[];
  };
  active_conflicts: Array<{
    clue_id: string;
    zone_id: string;
    conflict_type: string;
    explanation: string;
    action: string;
  }>;
  recommended_next_actions: string[];
}

export interface AuditLog {
  id: string;
  incident_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface OfflineActionItem {
  client_mutation_id: string;
  entity_type: string;
  action: string;
  client_timestamp: string;
  payload: Record<string, any>;
}
