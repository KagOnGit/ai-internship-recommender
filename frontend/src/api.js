import cfg from './config';
import internshipsData from './data/internships.json';
export class OfflineFallbackError extends Error {
    constructor(message, fallback) {
        super(message);
        Object.defineProperty(this, "fallback", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: fallback
        });
        this.name = 'OfflineFallbackError';
    }
}
const INTERNSHIPS = internshipsData;
// Dev run: cd frontend && npm run dev
export const BASE_URL = cfg.apiBase;
const DEFAULT_TOP_K = 5;
const LOCATION_WEIGHT = 0.25;
const SKILL_WEIGHT = 0.35;
const EDUCATION_WEIGHT = 0.2;
const SECTOR_WEIGHT = 0.2;
const BONUS_WOMEN = 0.05;
const BONUS_STIPEND = 0.05;
function normalise(text) {
    return text ? text.toLowerCase().trim() : null;
}
function jaccardSimilarity(candidateSkills, internshipSkills) {
    const candidateSet = new Set(candidateSkills.map((skill) => skill.toLowerCase().trim()).filter(Boolean));
    const internshipSet = new Set(internshipSkills.map((skill) => skill.toLowerCase().trim()).filter(Boolean));
    if (candidateSet.size === 0 || internshipSet.size === 0) {
        return 0;
    }
    let intersectionCount = 0;
    candidateSet.forEach((skill) => {
        if (internshipSet.has(skill)) {
            intersectionCount += 1;
        }
    });
    const unionCount = new Set([...candidateSet, ...internshipSet]).size;
    return intersectionCount / unionCount;
}
function computeLocationScore(candidate, internship) {
    const why = [];
    let score = 0;
    const stateMatch = candidate.state && normalise(candidate.state) === normalise(internship.state);
    const districtMatch = candidate.district && normalise(candidate.district) === normalise(internship.district);
    const cityMatch = candidate.city && normalise(candidate.city) === normalise(internship.city);
    if (stateMatch) {
        score += LOCATION_WEIGHT * 0.4;
        why.push(`State match: ${internship.state}`);
    }
    if (districtMatch) {
        score += LOCATION_WEIGHT * 0.35;
        why.push(`District match: ${internship.district}`);
    }
    if (cityMatch) {
        score += LOCATION_WEIGHT * 0.25;
        why.push(`City match: ${internship.city}`);
    }
    return { score, why };
}
function scoreInternship(candidate, internship) {
    let total = 0;
    const why = [];
    const { score: locationScore, why: locationWhy } = computeLocationScore(candidate, internship);
    total += locationScore;
    why.push(...locationWhy);
    const skillScore = jaccardSimilarity(candidate.skills ?? [], internship.skills ?? []) * SKILL_WEIGHT;
    if (skillScore > 0) {
        const candidateSkills = new Set(candidate.skills.map((skill) => skill.toLowerCase().trim()));
        const overlap = internship.skills
            .map((skill) => skill.toLowerCase().trim())
            .filter((skill) => candidateSkills.has(skill));
        if (overlap.length > 0) {
            why.push(`Skills overlap: ${overlap.sort().join(', ')}`);
        }
    }
    total += skillScore;
    if (candidate.education) {
        const candidateEdu = normalise(candidate.education);
        const eduMatch = internship.education_levels.some((level) => normalise(level) === candidateEdu);
        if (eduMatch) {
            total += EDUCATION_WEIGHT;
            why.push(`Education fits: ${candidate.education}`);
        }
    }
    if (candidate.sector && normalise(candidate.sector) === normalise(internship.sector)) {
        total += SECTOR_WEIGHT;
        why.push(`Sector preference: ${internship.sector}`);
    }
    if (internship.women_empowerment) {
        total += BONUS_WOMEN;
        why.push('Supports women empowerment');
    }
    if ((internship.stipend ?? 0) >= 8000) {
        total += BONUS_STIPEND;
        why.push(`Stipend ≥ ₹8000 (₹${internship.stipend})`);
    }
    return {
        score: Number(total.toFixed(4)),
        internship,
        why
    };
}
function buildOptionsFromInternships(data) {
    const states = new Set();
    const sectors = new Set();
    const districtsByState = {};
    const citiesByStateDistrict = {};
    data.forEach((internship) => {
        if (internship.state) {
            states.add(internship.state);
            districtsByState[internship.state] = districtsByState[internship.state] ?? new Set();
            if (internship.district) {
                districtsByState[internship.state].add(internship.district);
                const key = `${internship.state}||${internship.district}`;
                citiesByStateDistrict[key] = citiesByStateDistrict[key] ?? new Set();
                if (internship.city) {
                    citiesByStateDistrict[key].add(internship.city);
                }
            }
        }
        if (internship.sector) {
            sectors.add(internship.sector);
        }
    });
    return {
        states: Array.from(states).sort(),
        sectors: Array.from(sectors).sort(),
        districtsByState: Object.fromEntries(Object.entries(districtsByState).map(([state, values]) => [state, Array.from(values).sort()])),
        citiesByStateDistrict: Object.fromEntries(Object.entries(citiesByStateDistrict).map(([key, values]) => [key, Array.from(values).sort()]))
    };
}
const OFFLINE_OPTIONS = buildOptionsFromInternships(INTERNSHIPS);
function offlineRecommendations(payload, topK) {
    const candidate = {
        ...payload,
        skills: payload.skills?.filter(Boolean) ?? []
    };
    const scored = INTERNSHIPS.map((internship) => scoreInternship(candidate, internship));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
}
export async function fetchRecommendations(payload, topK = DEFAULT_TOP_K) {
    try {
        const response = await fetch(`${BASE_URL}/recommend?top_k=${topK}`, {
            method: 'POST',
            headers: cfg.headers(),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Failed to fetch recommendations');
        }
        return response.json();
    }
    catch (error) {
        const fallback = offlineRecommendations(payload, topK);
        throw new OfflineFallbackError('Network issue. Showing offline recommendations.', fallback);
    }
}
export async function fetchOptions() {
    try {
        const response = await fetch(`${BASE_URL}/options`, { headers: cfg.headers() });
        if (!response.ok) {
            throw new Error('options fetch failed');
        }
        return response.json();
    }
    catch (error) {
        throw new OfflineFallbackError('Network issue. Using offline options.', OFFLINE_OPTIONS);
    }
}
