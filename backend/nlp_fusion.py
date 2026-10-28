"""
RescueGrid AI - AI-Powered Survivor Clue Fusion Engine
Features:
- Regex and NLP information extraction for trapped headcounts, noises, conditions, and caller status.
- Source reliability calculation and uncertainty estimation.
- Semantic duplicate detection to corroborate evidence without inflating headcounts.
- Contradiction & conflict detection to prevent silent merging of uncertain clues.
"""

import re
import math
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime

# Credibility weights by information source type
SOURCE_RELIABILITY_MAP = {
    "ACOUSTIC_SENSOR": 0.95,
    "DRONE_RECON": 0.90,
    "FIRST_RESPONDER": 0.88,
    "EYEWITNESS_DIRECT": 0.78,
    "SOS_MESSAGE": 0.75,
    "FAMILY_REPORT": 0.65,
    "SOCIAL_MEDIA_CHATTER": 0.40,
    "UNKNOWN": 0.50
}

# Number words to digit mapping
NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "single": 1, "pair": 2, "couple": 2, "few": 3, "several": 4,
    "family": 4
}

class ClueFusionEngine:
    """
    Intelligent Clue Fusion Engine for Disaster Response.
    Processes unstructured text into structured rescue intelligence.
    """

    @staticmethod
    def extract_entities(text: str) -> Dict[str, Any]:
        """
        Extract key disaster clues using rule-based and semantic pattern matching:
        - Trapped headcount
        - Signs of life / audio cues (tapping, screaming, crying)
        - Urgency factors (gas leak, flooding, mud creep, injury, battery level)
        - Evacuation / survival claims
        """
        text_lower = text.lower()
        extracted: Dict[str, Any] = {
            "trapped_count": 0,
            "has_signs_of_life": False,
            "signs_of_life_details": [],
            "urgency_keywords": [],
            "evacuated_claimed": False,
            "vulnerable_people": [],
            "battery_percent": None,
            "raw_keywords": []
        }

        # 1. Trapped Headcount Extraction
        # Look for numbers near 'people', 'trapped', 'inside', 'persons', 'family'
        trapped_patterns = [
            r'(\d+)\s*(?:people|persons|individuals|members|souls|kids|children|adults)?\s*(?:are\s*)?trapped',
            r'trapped\s*(?:count:?\s*)?(\d+)',
            r'(\d+)\s*(?:people|persons|inside|under|beneath)',
            r'family of\s*(\d+)',
            r'around\s*(\d+)\s*people',
            r'about\s*(\d+)\s*people'
        ]
        
        found_count = None
        for pattern in trapped_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    found_count = int(match.group(1))
                    break
                except (ValueError, IndexError):
                    pass

        if found_count is None:
            # Check number words
            for word, val in NUMBER_WORDS.items():
                if f"{word} people trapped" in text_lower or f"{word} trapped" in text_lower or f"family of {word}" in text_lower:
                    found_count = val
                    break

        if found_count is not None:
            extracted["trapped_count"] = found_count

        # 2. Signs of Life / Audio Cues
        life_indicators = [
            ("tapping", "Tapping / knocking sounds heard under debris"),
            ("knocking", "Knocking sounds detected beneath rubble"),
            ("screaming", "Screaming or distress calls audible"),
            ("crying", "Crying detected (possible child/infant)"),
            ("calling out", "Calling for help"),
            ("voice", "Human voices audible"),
            ("phone ringing", "Phone ringing audible from rubble"),
            ("moving", "Movement detected"),
            ("flashlight", "Flashlight or SOS light signal observed")
        ]
        for term, desc in life_indicators:
            if term in text_lower:
                extracted["has_signs_of_life"] = True
                extracted["signs_of_life_details"].append(desc)

        # 3. Urgency Factors & Environmental Threats
        urgency_terms = [
            ("gas", "Gas smell / potential leak hazard"),
            ("water rising", "Rising water / flash flood risk"),
            ("mud sliding", "Active mudflow / slope creep"),
            ("bleeding", "Severe bleeding / medical trauma"),
            ("fracture", "Fracture or crush injury"),
            ("asthma", "Respiratory distress / asthma"),
            ("diabetic", "Critical medication need (insulin)"),
            ("unconscious", "Unconscious survivor reported"),
            ("suffocating", "Air pocket collapsing / smoke inhalation")
        ]
        for term, desc in urgency_terms:
            if term in text_lower:
                extracted["urgency_keywords"].append(desc)

        # 4. Battery Level Extraction (e.g. "battery at 8%", "phone 12%")
        battery_match = re.search(r'(?:battery|phone)\s*(?:at|is|has)?\s*(\d+)%', text_lower)
        if battery_match:
            try:
                extracted["battery_percent"] = int(battery_match.group(1))
            except ValueError:
                pass

        # 5. Evacuation / Clear claims
        evac_patterns = [
            "evacuated", "safely left", "fled", "escaped", "not inside", "empty building",
            "everyone out", "no one left", "shifted to temple", "shifted to camp"
        ]
        for ep in evac_patterns:
            if ep in text_lower:
                extracted["evacuated_claimed"] = True
                break

        # 6. Vulnerable Individuals
        vulnerabilities = [
            ("infant", "Infant / baby"),
            ("baby", "Infant / baby"),
            ("child", "Child / minor"),
            ("children", "Children"),
            ("pregnant", "Pregnant woman"),
            ("elderly", "Elderly citizen"),
            ("grandmother", "Elderly woman"),
            ("grandfather", "Elderly man"),
            ("disabled", "Person with disability")
        ]
        for v_key, v_label in vulnerabilities:
            if v_key in text_lower and v_label not in extracted["vulnerable_people"]:
                extracted["vulnerable_people"].append(v_label)

        return extracted

    @staticmethod
    def calculate_reliability(source_type: str, has_details: bool, verified_physically: bool = False) -> float:
        """
        Calculate clue reliability score [0.0 - 1.0].
        """
        base = SOURCE_RELIABILITY_MAP.get(source_type.upper(), 0.50)
        if verified_physically:
            return 0.98
        if has_details:
            base = min(1.0, base + 0.05)
        return round(base, 2)

    @staticmethod
    def _tokenize(text: str) -> set:
        """Extract clean word tokens for similarity comparison."""
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        tokens = set(word for word in cleaned.split() if len(word) > 2)
        # remove high-frequency stop words
        stopwords = {"the", "and", "that", "this", "with", "from", "for", "are", "was", "has", "have"}
        return tokens - stopwords

    @staticmethod
    def detect_duplicates(
        incoming_text: str,
        incoming_lat: Optional[float],
        incoming_lng: Optional[float],
        existing_clues: List[Dict[str, Any]],
        distance_threshold_meters: float = 120.0
    ) -> Optional[Tuple[str, float]]:
        """
        Detect if an incoming clue is a duplicate of an existing clue.
        Returns: Tuple of (existing_clue_id, similarity_score) or None.
        """
        in_tokens = ClueFusionEngine._tokenize(incoming_text)
        if not in_tokens:
            return None

        best_match_id = None
        highest_sim = 0.0

        for clue in existing_clues:
            ex_text = clue.get("raw_text", "")
            ex_tokens = ClueFusionEngine._tokenize(ex_text)
            if not ex_tokens:
                continue

            # Jaccard Token Similarity
            intersection = len(in_tokens.intersection(ex_tokens))
            union = len(in_tokens.union(ex_tokens))
            jaccard = intersection / union if union > 0 else 0.0

            # Spatial Proximity check if coordinates exist
            spatial_match = False
            c_lat = clue.get("lat")
            c_lng = clue.get("lng")
            if incoming_lat and incoming_lng and c_lat and c_lng:
                # Approximate distance in meters
                d_lat = (incoming_lat - c_lat) * 111000
                d_lng = (incoming_lng - c_lng) * 111000 * math.cos(math.radians(c_lat))
                dist = math.sqrt(d_lat**2 + d_lng**2)
                if dist <= distance_threshold_meters:
                    spatial_match = True

            # If strong textual similarity (>= 0.60) or moderate similarity + same location
            if jaccard >= 0.65 or (spatial_match and jaccard >= 0.40):
                if jaccard > highest_sim:
                    highest_sim = jaccard
                    best_match_id = clue.get("id")

        if best_match_id and highest_sim >= 0.40:
            return (best_match_id, round(highest_sim, 2))
        return None

    @staticmethod
    def detect_conflicts(
        incoming_extracted: Dict[str, Any],
        incoming_text: str,
        incoming_zone_id: Optional[str],
        existing_clues: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Detect critical contradictions instead of silently merging uncertain records.
        Example conflicts:
        1. Report A says 'all evacuated to temple' vs Report B says '4 people trapped inside'.
        2. Report A says 'building completely empty' vs Report B says 'screaming heard from basement'.
        3. Severely conflicting headcounts (e.g., 10 people trapped vs 1 person).
        """
        if not incoming_zone_id:
            return (False, None)

        in_evac = incoming_extracted.get("evacuated_claimed", False)
        in_trapped = incoming_extracted.get("trapped_count", 0)
        in_signs = incoming_extracted.get("has_signs_of_life", False)

        for clue in existing_clues:
            # Check within same zone
            if clue.get("zone_id") != incoming_zone_id:
                continue

            ex_entities = clue.get("extracted_entities") or {}
            if isinstance(ex_entities, str):
                import json
                try:
                    ex_entities = json.loads(ex_entities)
                except Exception:
                    ex_entities = {}

            ex_evac = ex_entities.get("evacuated_claimed", False)
            ex_trapped = ex_entities.get("trapped_count", 0)
            ex_signs = ex_entities.get("has_signs_of_life", False)

            # Conflict Scenario 1: Evacuated vs Trapped
            if in_evac and (ex_trapped > 0 or ex_signs):
                return (True, {
                    "conflict_type": "EVACUATION_VS_TRAPPED_CONTRADICTION",
                    "competing_clue_id": clue.get("id"),
                    "severity": "CRITICAL",
                    "explanation": f"Incoming report claims zone was evacuated, but Clue #{clue.get('id')} reported {ex_trapped} people trapped with signs of life.",
                    "recommended_action": "Do NOT lower search priority. Dispatch K9 / Acoustic team to physically verify before demoting zone."
                })

            if ex_evac and (in_trapped > 0 or in_signs):
                return (True, {
                    "conflict_type": "TRAPPED_REPORTED_IN_REPORTEDLY_EVACUATED_ZONE",
                    "competing_clue_id": clue.get("id"),
                    "severity": "CRITICAL",
                    "explanation": f"Incoming report claims {in_trapped} trapped / signs of life, contradicting Clue #{clue.get('id')} which claimed the structure was empty/evacuated.",
                    "recommended_action": "Elevate zone priority immediately for reconnaissance verification."
                })

            # Conflict Scenario 2: Discrepancy in reported victim count (> 4 difference)
            if in_trapped > 0 and ex_trapped > 0 and abs(in_trapped - ex_trapped) >= 4:
                return (True, {
                    "conflict_type": "HEADCOUNT_DISCREPANCY",
                    "competing_clue_id": clue.get("id"),
                    "severity": "HIGH",
                    "explanation": f"Discrepancy in reported victim count: Current clue reports {in_trapped} persons vs previous Clue #{clue.get('id')} reporting {ex_trapped} persons.",
                    "recommended_action": "Audit both reporting sources. Treat search area with maximum capacity assumption pending on-scene confirmation."
                })

        return (False, None)
