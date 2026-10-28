"""
RescueGrid AI - Operational Situation Summary Generator (SitRep)
Generates structured, professional 72-Hour Golden Window disaster intelligence reports.
Strictly evidence-bounded: Reports only confirmed data and explicitly marks unverified assumptions.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone
import json

class SituationSummaryEngine:
    @staticmethod
    def generate_sitrep(
        incident: Dict[str, Any],
        zones: List[Dict[str, Any]],
        clues: List[Dict[str, Any]],
        missing_persons: List[Dict[str, Any]],
        hazards: List[Dict[str, Any]],
        road_restrictions: List[Dict[str, Any]],
        rescue_teams: List[Dict[str, Any]],
        mission_assignments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes active disaster state into an executive SitRep for incident command.
        """
        now = datetime.now(timezone.utc)
        
        # 1. Missing Persons Breakdown
        total_missing = len(missing_persons)
        unresolved_missing = len([m for m in missing_persons if m.get("status") in ["REPORTED", "INVESTIGATING"]])
        located_alive = len([m for m in missing_persons if m.get("status") in ["LOCATED_ALIVE", "EVACUATED"]])
        deceased = len([m for m in missing_persons if m.get("status") == "DECEASED"])

        # 2. Clues & Evidence Quality
        total_clues = len(clues)
        unverified_clues = len([c for c in clues if c.get("verification_status") == "UNVERIFIED"])
        corroborated_clues = len([c for c in clues if c.get("verification_status") in ["CORROBORATED", "VERIFIED_PHYSICALLY"]])
        conflicting_clues = [c for c in clues if c.get("conflict_flag")]
        duplicate_clues = len([c for c in clues if c.get("duplicate_of_id")])

        # 3. High-Priority Zones
        sorted_zones = sorted(
            zones,
            key=lambda z: (z.get("override_priority_score") if z.get("override_priority_score") is not None else z.get("current_priority_score", 0.0)),
            reverse=True
        )
        top_zones = []
        for z in sorted_zones[:4]:
            score = z.get("override_priority_score") if z.get("override_priority_score") is not None else z.get("current_priority_score", 0.0)
            top_zones.append({
                "id": z.get("id"),
                "code": z.get("code"),
                "name": z.get("name"),
                "priority_score": round(score, 1),
                "is_overridden": z.get("override_priority_score") is not None,
                "estimated_occupants": z.get("estimated_occupants", 0)
            })

        # 4. Hazards & Road Restrictions
        active_hazards = [h for h in hazards if h.get("active", True)]
        critical_hazards = [h for h in active_hazards if h.get("severity") in ["CRITICAL", "HIGH"]]
        blocked_routes = [r for r in road_restrictions if r.get("active", True) and r.get("passable_by") == "NONE"]

        # 5. Rescue Teams Status
        total_teams = len(rescue_teams)
        available_teams = [t for t in rescue_teams if t.get("current_status") == "AVAILABLE"]
        deployed_teams = [t for t in rescue_teams if t.get("current_status") in ["EN_ROUTE", "ON_SCENE"]]
        resting_teams = [t for t in rescue_teams if t.get("current_status") == "RESTING"]

        # 6. Active Conflicts Summary
        conflict_summaries = []
        for c in conflicting_clues:
            cd = c.get("conflict_details")
            if isinstance(cd, str):
                try:
                    cd = json.loads(cd)
                except Exception:
                    cd = {}
            conflict_summaries.append({
                "clue_id": c.get("id"),
                "zone_id": c.get("zone_id"),
                "conflict_type": cd.get("conflict_type", "CONTRADICTION"),
                "explanation": cd.get("explanation", c.get("raw_text")),
                "action": cd.get("recommended_action", "Physical on-ground reconnaissance required.")
            })

        # 7. Recommended Next Actions (Executive Decisions)
        next_actions = []
        if conflicting_clues:
            next_actions.append(
                f"Resolve {len(conflicting_clues)} contradictory intelligence clue(s) before committing heavy earthmoving equipment."
            )
        if top_zones:
            top_name = top_zones[0]["name"]
            next_actions.append(
                f"Dispatch high-priority reconnaissance to {top_name} (Priority {top_zones[0]['priority_score']}/100) with acoustic sensors and K9."
            )
        if blocked_routes:
            next_actions.append(
                f"SDRF logistics to clear critical artery '{blocked_routes[0].get('road_name')}' to establish medical evacuation corridor."
            )
        if available_teams:
            next_actions.append(
                f"Assign {len(available_teams)} standing-by rescue team(s) to second-tier search zones."
            )
        else:
            next_actions.append("All rescue teams currently committed. Request regional NDRF mutual aid reinforcements.")

        return {
            "incident_title": incident.get("title", "Disaster Search & Rescue Operation"),
            "incident_type": incident.get("incident_type", "LANDSLIDE"),
            "location": incident.get("location_name", "Disaster Sector"),
            "generated_at": now.isoformat(),
            "metrics": {
                "total_missing_persons": total_missing,
                "unresolved_missing": unresolved_missing,
                "located_alive": located_alive,
                "deceased": deceased,
                "total_evidence_clues": total_clues,
                "unverified_clues": unverified_clues,
                "corroborated_clues": corroborated_clues,
                "active_conflicts_count": len(conflicting_clues),
                "active_hazards_count": len(active_hazards),
                "critical_hazards_count": len(critical_hazards),
                "blocked_roads_count": len(blocked_routes),
                "total_rescue_teams": total_teams,
                "deployed_teams_count": len(deployed_teams),
                "available_teams_count": len(available_teams)
            },
            "top_priority_zones": top_zones,
            "critical_hazards": [
                {
                    "hazard_type": h.get("hazard_type"),
                    "severity": h.get("severity"),
                    "description": h.get("description"),
                    "radius_meters": h.get("radius_meters")
                }
                for h in critical_hazards
            ],
            "blocked_routes": [
                {
                    "road_name": r.get("road_name"),
                    "restriction_type": r.get("restriction_type"),
                    "passable_by": r.get("passable_by")
                }
                for r in blocked_routes
            ],
            "rescue_teams_summary": {
                "available": [t.get("name") for t in available_teams],
                "deployed": [t.get("name") for t in deployed_teams],
                "resting": [t.get("name") for t in resting_teams]
            },
            "active_conflicts": conflict_summaries,
            "recommended_next_actions": next_actions
        }
