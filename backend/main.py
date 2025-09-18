from __future__ import annotations

import json
from pathlib import Path
import os
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Run: cd backend && source ../.venv/bin/activate && uvicorn main:app --reload --port 8000
DATA_PATH = Path(__file__).parent / "data" / "internships.json"

load_dotenv()  # loads variables from backend/.env if present
GCLOUD_API_KEY = os.getenv("GCLOUD_API_KEY")  # do NOT hardcode; read from env


def load_internships() -> List[Dict[str, Any]]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Internship data not found at {DATA_PATH}")
    with DATA_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _norm_text(x: Optional[str]) -> Optional[str]:
    return x.lower().strip() if isinstance(x, str) else None


def _to_flat(item: Dict[str, Any]) -> Dict[str, Any]:
    loc = item.get("location") or {}
    flat = dict(item)
    flat["state"] = flat.get("state") or loc.get("state")
    flat["district"] = flat.get("district") or loc.get("district")
    flat["city"] = flat.get("city") or loc.get("city")
    if "women_empowerment" not in flat:
        flat["women_empowerment"] = bool(flat.get("gender_empowerment", False))
    return flat


INTERNSHIPS_RAW = load_internships()
INTERNSHIPS = [_to_flat(item) for item in INTERNSHIPS_RAW]

app = FastAPI(
    title="Hackathon AI Internship Recommender",
    description=(
        "Rule-based internship matching engine. "
        "Sample persona: Priya Sharma, a B.Tech student from Pune who loves Frontend and Social Impact."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup_log():
    has_key = "yes" if GCLOUD_API_KEY else "no"
    print(f"[startup] API running on :8000 | GCLOUD_API_KEY configured: {has_key}")

LOCATION_WEIGHT = 0.25
SKILL_WEIGHT = 0.35
EDUCATION_WEIGHT = 0.20
SECTOR_WEIGHT = 0.20
BONUS_WOMEN = 0.05
BONUS_STIPEND = 0.05


def jaccard_similarity(a: List[str], b: List[str]) -> float:
    sa = {x.lower().strip() for x in a or [] if isinstance(x, str)}
    sb = {x.lower().strip() for x in b or [] if isinstance(x, str)}
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def compute_location_score(cand: Dict[str, Any], internship: Dict[str, Any]) -> Tuple[float, List[str]]:
    why: List[str] = []
    score = 0.0

    if _norm_text(cand.get("state")) == _norm_text(internship.get("state")):
        score += LOCATION_WEIGHT * 0.4
        if internship.get("state"):
            why.append(f"State match: {internship.get('state')}")
    if _norm_text(cand.get("district")) == _norm_text(internship.get("district")):
        score += LOCATION_WEIGHT * 0.35
        if internship.get("district"):
            why.append(f"District match: {internship.get('district')}")
    if _norm_text(cand.get("city")) == _norm_text(internship.get("city")):
        score += LOCATION_WEIGHT * 0.25
        if internship.get("city"):
            why.append(f"City match: {internship.get('city')}")

    return score, why


def score_item(cand: Dict[str, Any], internship: Dict[str, Any]) -> Dict[str, Any]:
    total = 0.0
    why: List[str] = []

    location_score, location_why = compute_location_score(cand, internship)
    total += location_score
    why += location_why

    skill_score = jaccard_similarity(cand.get("skills") or [], internship.get("skills") or []) * SKILL_WEIGHT
    if skill_score > 0:
        overlap = sorted(
            set(x.lower().strip() for x in cand.get("skills") or [])
            & set(x.lower().strip() for x in internship.get("skills") or [])
        )
        if overlap:
            why.append(f"Skills overlap: {', '.join(overlap)}")
    total += skill_score

    education = _norm_text(cand.get("education"))
    if education and any(_norm_text(level) == education for level in internship.get("education_levels") or []):
        total += EDUCATION_WEIGHT
        why.append(f"Education fits: {cand.get('education')}")

    if _norm_text(cand.get("sector")) == _norm_text(internship.get("sector")):
        total += SECTOR_WEIGHT
        if internship.get("sector"):
            why.append(f"Sector preference: {internship.get('sector')}")

    if internship.get("women_empowerment"):
        total += BONUS_WOMEN
        why.append("Supports women empowerment")

    if (internship.get("stipend") or 0) >= 8000:
        total += BONUS_STIPEND
        why.append(f"Stipend ≥ ₹8000 (₹{internship.get('stipend')})")

    return {
        "score": round(total, 4),
        "internship": internship,
        "why": why,
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", "count": len(INTERNSHIPS), "gcloudKeyConfigured": bool(GCLOUD_API_KEY)}


@app.get("/options")
def options() -> Dict[str, Any]:
    states: Set[str] = set()
    sectors: Set[str] = set()
    districts_by_state: Dict[str, Set[str]] = {}
    cities_by_state_district: Dict[Tuple[str, str], Set[str]] = {}

    for internship in INTERNSHIPS:
        state = internship.get("state")
        district = internship.get("district")
        city = internship.get("city")
        sector = internship.get("sector")

        if state:
            states.add(state)
            districts_by_state.setdefault(state, set())
            if district:
                districts_by_state[state].add(district)
                key = (state, district)
                cities_by_state_district.setdefault(key, set())
                if city:
                    cities_by_state_district[key].add(city)

        if sector:
            sectors.add(sector)

    return {
        "states": sorted(states),
        "sectors": sorted(sectors),
        "districtsByState": {state: sorted(values) for state, values in districts_by_state.items()},
        "citiesByStateDistrict": {
            f"{state}||{district}": sorted(values)
            for (state, district), values in cities_by_state_district.items()
        },
    }


@app.post("/recommend")
async def recommend(payload: Dict[str, Any], top_k: int = Query(5, alias="top_k")) -> List[Dict[str, Any]]:
    if not INTERNSHIPS:
        raise HTTPException(status_code=500, detail="Internships data not loaded")

    location = payload.get("location") or {}

    candidate: Dict[str, Any] = {
        "name": payload.get("name"),
        "gender": payload.get("gender"),
        "education": payload.get("education") or payload.get("education_level"),
        "skills": payload.get("skills") or [],
        "sector": payload.get("sector") or payload.get("sector_interest"),
        "state": payload.get("state") or location.get("state"),
        "district": payload.get("district") or location.get("district"),
        "city": payload.get("city") or location.get("city"),
    }

    scored = [score_item(candidate, internship) for internship in INTERNSHIPS]
    scored.sort(key=lambda item: item["score"], reverse=True)

    limit = max(1, int(top_k))
    return scored[:limit]


# Persona quick reference for hackathon demos (Priya Sharma)
# Example request body:
# {
#   "name": "Priya Sharma",
#   "gender": "female",
#   "education": "B.Tech",
#   "skills": ["React", "TypeScript", "CSS", "Communication"],
#   "sector": "Technology",
#   "state": "Maharashtra",
#   "district": "Pune",
#   "city": "Pune"
# }
