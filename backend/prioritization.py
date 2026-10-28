"""
RescueGrid AI - Explainable Search-Zone Prioritization Engine
Calculates transparent, defensible search priority scores based on:
1. Evidence Strength (E): Reliability of reports, sensor corroboration, physical verification.
2. Potential Occupancy (O): Missing persons registered, estimated building occupants, vulnerable lives.
3. Environmental Urgency (U): Active hazards, slope movement, weather, medical severity.
4. Temporal Recency (T): Calibrated contact freshness (does NOT treat time as death).
5. Access Impedance (A): Blocked roads and route restrictions.

Adheres strictly to Humanitarian AI Principles:
- Never declares an area safe/clear without physical verification.
- Clearly flags assumptions, missing data, and model uncertainties.
- Enables human coordinator overrides with full audit trail.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import json

class PrioritizationEngine:
    # Default explicit weights (sum = 1.0)
    DEFAULT_WEIGHTS = {
        "evidence_weight": 0.30,
        "occupancy_weight": 0.25,
        "urgency_weight": 0.25,
        "temporal_weight": 0.15,
        "access_penalty_weight": 0.05
    }

    @staticmethod
    def calculate_zone_priority(
        zone: Dict[str, Any],
        clues: List[Dict[str, Any]],
        missing_persons: List[Dict[str, Any]],
        hazards: List[Dict[str, Any]],
        road_restrictions: List[Dict[str, Any]],
        weights: Optional[Dict[str, float]] = None,
        reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Computes the explainable priority score (0.0 to 100.0) for a search zone.
        """
        w = weights or PrioritizationEngine.DEFAULT_WEIGHTS
        ref_time = reference_time or datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # 1. Evidence Strength Factor (0 - 100)
        # -------------------------------------------------------------
        evidence_score = 0.0
        verified_count = 0
        corroborated_count = 0
        acoustic_or_drone_count = 0
        signs_of_life_found = False
        assumptions_made = []
        missing_intel = []
        verified_facts = []
        user_reports = []

        if not clues:
            assumptions_made.append("Zero direct clues received yet. Baseline zone occupancy is an estimate from census/building typology.")
            missing_intel.append("No eyewitness or sensor reconnaissance available for this grid cell.")
            evidence_score = 15.0  # Base uncertainty score (never 0, area is NOT clear!)
        else:
            total_rel = 0.0
            for c in clues:
                user_reports.append(f"Clue #{c.get('id')}: {c.get('raw_text', '')[:65]}... (Source: {c.get('source_type')})")
                rel = c.get("reliability_score", 0.5)
                v_stat = c.get("verification_status", "UNVERIFIED")
                s_type = c.get("source_type", "")

                if v_stat == "VERIFIED_PHYSICALLY":
                    verified_count += 1
                    rel = 1.0
                    verified_facts.append(f"Physically verified by responder: Clue #{c.get('id')}")
                elif v_stat == "CORROBORATED":
                    corroborated_count += 1
                    rel = min(1.0, rel + 0.15)

                if s_type in ["ACOUSTIC_SENSOR", "DRONE_RECON"]:
                    acoustic_or_drone_count += 1

                # Check signs of life
                entities = c.get("extracted_entities")
                if isinstance(entities, str):
                    try:
                        entities = json.loads(entities)
                    except Exception:
                        entities = {}
                elif not isinstance(entities, dict):
                    entities = {}

                if entities.get("has_signs_of_life"):
                    signs_of_life_found = True

                total_rel += rel

            avg_rel = total_rel / len(clues)
            # Bonus for corroboration and sensor telemetry
            corroboration_bonus = min(25.0, (corroborated_count * 8.0) + (acoustic_or_drone_count * 10.0))
            signs_bonus = 20.0 if signs_of_life_found else 0.0
            evidence_score = min(100.0, (avg_rel * 55.0) + corroboration_bonus + signs_bonus)

        # -------------------------------------------------------------
        # 2. Potential Occupancy & Vulnerability Factor (0 - 100)
        # -------------------------------------------------------------
        # Gather headcount from registered missing persons in this zone
        registered_missing = len(missing_persons)
        reported_trapped_in_clues = 0
        vulnerable_count = 0

        for mp in missing_persons:
            user_reports.append(f"Missing Person: {mp.get('full_name')} (Age: {mp.get('age')})")
            age = mp.get("age")
            if age is not None and (age <= 12 or age >= 65):
                vulnerable_count += 1
            if mp.get("medical_needs"):
                vulnerable_count += 1

        for c in clues:
            entities = c.get("extracted_entities")
            if isinstance(entities, str):
                try:
                    entities = json.loads(entities)
                except Exception:
                    entities = {}
            elif not isinstance(entities, dict):
                entities = {}

            c_trapped = entities.get("trapped_count", 0)
            if c_trapped > reported_trapped_in_clues:
                reported_trapped_in_clues = c_trapped
            v_list = entities.get("vulnerable_people", [])
            vulnerable_count += len(v_list)

        base_estimated_occupancy = zone.get("estimated_occupants", 0)
        effective_occupancy = max(base_estimated_occupancy, registered_missing, reported_trapped_in_clues)

        if effective_occupancy == 0:
            occupancy_score = 15.0
            assumptions_made.append("No missing persons registered in this sector; maintaining 15% vigilance baseline.")
        else:
            # Scaled score: 1 person -> ~30, 5 people -> ~65, 10+ people -> ~90+
            raw_occ = min(75.0, effective_occupancy * 12.0)
            vuln_bonus = min(25.0, vulnerable_count * 8.0)
            occupancy_score = min(100.0, raw_occ + vuln_bonus)

        # -------------------------------------------------------------
        # 3. Urgency & Hazard Exposure Factor (0 - 100)
        # -------------------------------------------------------------
        urgency_score = 30.0  # Baseline disaster urgency in 72h window
        zone_hazards = [h for h in hazards if h.get("active", True)]
        
        has_critical_hazard = any(h.get("severity") == "CRITICAL" for h in zone_hazards)
        has_high_hazard = any(h.get("severity") == "HIGH" for h in zone_hazards)
        
        if has_critical_hazard:
            urgency_score += 45.0
            verified_facts.append("Active CRITICAL hazard (e.g. secondary landslide creep or toxic leak) threatening sector.")
        elif has_high_hazard:
            urgency_score += 30.0

        # Check clues for immediate life threats
        urgent_medical_found = False
        battery_critical = False
        for c in clues:
            entities = c.get("extracted_entities")
            if isinstance(entities, str):
                try:
                    entities = json.loads(entities)
                except Exception:
                    entities = {}
            elif isinstance(entities, dict):
                if entities.get("urgency_keywords"):
                    urgent_medical_found = True
                batt = entities.get("battery_percent")
                if batt is not None and batt <= 15:
                    battery_critical = True

        if urgent_medical_found:
            urgency_score += 20.0
        if battery_critical:
            urgency_score += 15.0
            user_reports.append("Survivor mobile phone battery is critically low (<=15%). Time window to re-establish contact is closing.")

        urgency_score = min(100.0, urgency_score)

        # -------------------------------------------------------------
        # 4. Temporal Recency Factor (0 - 100)
        # -------------------------------------------------------------
        # In disaster search and rescue (INSARAG / NDMA guidelines):
        # 0-12 hours: Fresh signals, highest search return.
        # 12-48 hours: High void survival probability.
        # 48-72 hours: Golden window remains open; do NOT drop score to zero!
        temporal_score = 60.0  # Default moderate temporal factor
        latest_clue_time = None
        for c in clues:
            t_str = c.get("timestamp")
            if t_str:
                try:
                    t_val = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
                    if latest_clue_time is None or t_val > latest_clue_time:
                        latest_clue_time = t_val
                except Exception:
                    pass

        if latest_clue_time:
            hours_elapsed = max(0.1, (ref_time - latest_clue_time).total_seconds() / 3600.0)
            if hours_elapsed <= 6:
                temporal_score = 95.0
                verified_facts.append(f"Recent communication/observation received {hours_elapsed:.1f}h ago.")
            elif hours_elapsed <= 24:
                temporal_score = 80.0
            elif hours_elapsed <= 48:
                temporal_score = 65.0
            elif hours_elapsed <= 72:
                temporal_score = 50.0
            else:
                temporal_score = 35.0  # Even > 72h, survivals occur in structural voids
        else:
            missing_intel.append("Timestamp of last confirmed contact is unknown.")
            temporal_score = 40.0

        # -------------------------------------------------------------
        # 5. Access Impedance Penalty (0 - 100)
        # -------------------------------------------------------------
        # Access constraints should penalize or guide logistics, not cancel out human life priority
        access_penalty = 0.0
        blocked_routes = [r for r in road_restrictions if r.get("active", True) and r.get("passable_by") == "NONE"]
        if blocked_routes:
            access_penalty = 35.0
            missing_intel.append(f"{len(blocked_routes)} primary access route(s) completely blocked by landslide debris. Specialized equipment or foot patrol required.")

        # -------------------------------------------------------------
        # Multi-Factor Weighted Formulation
        # -------------------------------------------------------------
        raw_priority = (
            (w["evidence_weight"] * evidence_score) +
            (w["occupancy_weight"] * occupancy_score) +
            (w["urgency_weight"] * urgency_score) +
            (w["temporal_weight"] * temporal_score) -
            (w["access_penalty_weight"] * access_penalty)
        )
        final_priority = round(max(5.0, min(100.0, raw_priority)), 1)

        # Check Coordinator Override
        override_score = zone.get("override_priority_score")
        if override_score is not None:
            active_score = round(override_score, 1)
            is_overridden = True
        else:
            active_score = final_priority
            is_overridden = False

        # Build Plain-Language Rationale
        explanation_parts = []
        if active_score >= 75.0:
            urgency_label = "CRITICAL RESCUE PRIORITY"
        elif active_score >= 50.0:
            urgency_label = "HIGH SEARCH PRIORITY"
        else:
            urgency_label = "MONITORED INVESTIGATION ZONE"

        explanation_parts.append(f"[{urgency_label}] Zone '{zone.get('name')}' (Score: {active_score}/100).")
        
        if signs_of_life_found:
            explanation_parts.append("Auditory/visual signs of life detected under rubble.")
        if effective_occupancy > 0:
            explanation_parts.append(f"Estimated {effective_occupancy} individual(s) at risk ({vulnerable_count} vulnerable).")
        if has_critical_hazard or has_high_hazard:
            explanation_parts.append("Threatened by active secondary landslide hazard.")
        if is_overridden:
            explanation_parts.append(f"MANUAL OVERRIDE APPLIED by {zone.get('override_author')}: '{zone.get('override_reason')}'.")

        explanation_text = " ".join(explanation_parts)

        return {
            "calculated_priority_score": final_priority,
            "active_priority_score": active_score,
            "is_overridden": is_overridden,
            "score_breakdown": {
                "evidence_strength": round(evidence_score, 1),
                "potential_occupancy": round(occupancy_score, 1),
                "urgency_threat": round(urgency_score, 1),
                "temporal_recency": round(temporal_score, 1),
                "access_impedance_penalty": round(access_penalty, 1),
                "weights_used": w
            },
            "explanation": explanation_text,
            "verified_facts": verified_facts,
            "user_reports": user_reports[:6],
            "assumptions_made": assumptions_made,
            "missing_information": missing_intel,
            "effective_occupancy": effective_occupancy,
            "vulnerable_count": vulnerable_count,
            "clue_count": len(clues)
        }
