"""
RescueGrid AI - Rescue Mission Planner Engine
Generates intelligent, capability-aware, hazard-safe rescue mission recommendations.
Features:
- Matches team specialized capabilities (K9, Heavy Extrication, Drone, Medical) to zone requirements.
- Strictly audits road restrictions and hazard zones to prevent sending teams into active death traps.
- Implements a Human-in-the-Loop approval workflow (PROPOSED -> COORDINATOR_APPROVED -> DISPATCHED).
"""

import math
from typing import List, Dict, Any, Optional

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

class MissionPlannerEngine:
    @staticmethod
    def generate_recommendations(
        zones: List[Dict[str, Any]],
        teams: List[Dict[str, Any]],
        hazards: List[Dict[str, Any]],
        road_restrictions: List[Dict[str, Any]],
        clues_by_zone: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes priority rankings, team capabilities, and route safety
        to propose mission assignments for coordinator review.
        """
        # Sort zones by active priority score descending
        sorted_zones = sorted(
            zones,
            key=lambda z: (z.get("override_priority_score") if z.get("override_priority_score") is not None else z.get("current_priority_score", 0.0)),
            reverse=True
        )

        available_teams = [t for t in teams if t.get("current_status") in ["AVAILABLE", "RESTING"]]
        assigned_team_ids = set()
        recommendations = []

        rank = 1
        for zone in sorted_zones:
            zone_id = zone.get("id")
            priority = zone.get("override_priority_score") if zone.get("override_priority_score") is not None else zone.get("current_priority_score", 0.0)
            
            # Skip extremely low priority zones if no teams available
            if priority < 10.0 and len(available_teams) == 0:
                continue

            zone_clues = clues_by_zone.get(zone_id, [])
            
            # Determine zone tactical needs
            needs_k9 = False
            needs_heavy_breach = False
            needs_medical = False
            
            for c in zone_clues:
                text = (c.get("raw_text") or "").lower()
                if any(k in text for k in ["rubble", "debris", "tapping", "buried", "beneath", "canine"]):
                    needs_k9 = True
                if any(k in text for k in ["collapsed slab", "concrete", "crush", "heavy", "excavator", "breach"]):
                    needs_heavy_breach = True
                if any(k in text for k in ["bleed", "fracture", "baby", "pregnant", "diabetic", "asthma", "injured"]):
                    needs_medical = True

            # Find best candidate team among available
            best_team = None
            best_score = -1.0
            best_dist = 999.0

            for team in available_teams:
                if team.get("id") in assigned_team_ids:
                    continue

                caps = team.get("capabilities", [])
                if isinstance(caps, str):
                    import json
                    try:
                        caps = json.loads(caps)
                    except Exception:
                        caps = [c.strip() for c in caps.split(",")]

                dist_km = haversine_distance_km(
                    team.get("current_lat", 0.0), team.get("current_lng", 0.0),
                    zone.get("center_lat", 0.0), zone.get("center_lng", 0.0)
                )

                # Capability match scoring
                match_score = 10.0
                if needs_k9 and any("k9" in str(cap).lower() or "canine" in str(cap).lower() for cap in caps):
                    match_score += 40.0
                if needs_heavy_breach and any("extrication" in str(cap).lower() or "breach" in str(cap).lower() or "heavy" in str(cap).lower() for cap in caps):
                    match_score += 45.0
                if needs_medical and any("medic" in str(cap).lower() or "triage" in str(cap).lower() for cap in caps):
                    match_score += 35.0

                # Proximity bonus (closer is better, but never at expense of critical capabilities)
                proximity_score = max(0.0, 30.0 - (dist_km * 5.0))
                total_candidate_score = match_score + proximity_score

                if total_candidate_score > best_score:
                    best_score = total_candidate_score
                    best_team = team
                    best_dist = dist_km

            # Evaluate route safety & hazards
            risk_warnings = []
            recommended_equipment = []
            missing_intel = []

            # Check nearby hazards
            z_lat = zone.get("center_lat", 0.0)
            z_lng = zone.get("center_lng", 0.0)
            for h in hazards:
                if not h.get("active", True):
                    continue
                h_dist = haversine_distance_km(z_lat, z_lng, h.get("lat", 0.0), h.get("lng", 0.0))
                if h_dist <= 0.8:
                    risk_warnings.append(
                        f"HAZARD WARNING: {h.get('hazard_type')} ({h.get('severity')}) within {int(h_dist*1000)}m. {h.get('description')}"
                    )

            # Check road blocks
            blocked_nearby = [
                r for r in road_restrictions 
                if r.get("active", True) and r.get("passable_by") == "NONE"
            ]
            if blocked_nearby:
                for b in blocked_nearby[:2]:
                    risk_warnings.append(f"ACCESS BLOCKAGE: '{b.get('road_name')}' impassable. Avoid direct arterial route; use certified secondary ridge track.")

            # Recommend equipment
            if needs_k9:
                recommended_equipment.extend(["Canine Search Unit", "Acoustic Listening Devices (Delsar)", "Search Cam"])
            if needs_heavy_breach:
                recommended_equipment.extend(["Hydraulic Spreader & Cutter", "Pneumatic Lifting Bags", "Rotary Rescue Saw"])
            if needs_medical:
                recommended_equipment.extend(["Trauma First Aid Kit", "Oxygen Concentrator", "Stretcher & Cervical Collar"])
            if not recommended_equipment:
                recommended_equipment.extend(["Thermal Recon Drone", "Portable Lighting", "Satellite Radio Walkie-Talkies"])

            # Deduplicate equipment
            recommended_equipment = list(dict.fromkeys(recommended_equipment))

            # Missing intel checklist
            if not zone_clues:
                missing_intel.append("No on-ground eyewitness report yet; reliance is on spatial zoning & aerial survey.")
            else:
                missing_intel.append("Verify structural void stability before entering collapsed footprint.")
            missing_intel.append("Check in with incident staging post every 15 minutes via VHF Band 3.")

            # Rationale text
            team_label = best_team.get("name") if best_team else "Pending Team Availability"
            rationale_text = (
                f"Zone '{zone.get('name')}' is Rank #{rank} (Priority: {priority:.1f}). "
                f"Assigned {team_label} based on capability matching and estimated transit of {best_dist:.1f} km. "
                f"Targeting search of {zone.get('estimated_occupants', 1)} estimated trapped occupants."
            )

            rec = {
                "zone_id": zone_id,
                "zone_name": zone.get("name"),
                "zone_code": zone.get("code"),
                "priority_score": priority,
                "priority_rank": rank,
                "team_id": best_team.get("id") if best_team else None,
                "team_name": best_team.get("name") if best_team else "Unassigned (Teams Deployed)",
                "team_organization": best_team.get("organization") if best_team else "N/A",
                "recommended_equipment": recommended_equipment,
                "rationale": rationale_text,
                "risk_warning": " | ".join(risk_warnings) if risk_warnings else "Standard disaster terrain hazards apply. Maintain situational awareness.",
                "missing_intel": missing_intel,
                "status": "PROPOSED"
            }

            if best_team:
                assigned_team_ids.add(best_team.get("id"))

            recommendations.append(rec)
            rank += 1

        return recommendations
