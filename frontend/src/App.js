import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { fetchOptions, fetchRecommendations, OfflineFallbackError } from './api';
import { STR, t } from './i18n';
import SearchableSelect from './components/SearchableSelect';
const LAST_RESULTS_KEY = 'lastRecommendations';
const FALLBACK_OPTIONS = {
    states: ['Maharashtra'],
    sectors: ['Manufacturing'],
    districtsByState: {
        Maharashtra: ['Pune']
    },
    citiesByStateDistrict: {
        'Maharashtra||Pune': ['Pune']
    }
};
const GENDER_VALUES = [
    'female',
    'male',
    'non-binary',
    'trans woman',
    'trans man',
    'genderqueer',
    'agender',
    'prefer not to say',
    'other'
];
const educationOptions = [
    'B.Tech',
    'BE',
    'ITI',
    'MCA',
    'BA',
    'B.Com',
    'MSW',
    'MBA',
    'BBA',
    'B.Sc',
    'M.Sc',
    'B.Des',
    'M.Des',
    'B.Arch',
    'M.Arch',
    'B.Ed',
    'MA',
    'PGDM',
    'M.Tech'
];
const emptyForm = {
    name: '',
    gender: 'prefer not to say',
    education: '',
    sector_interest: '',
    location: {
        state: '',
        district: '',
        city: ''
    }
};
function App() {
    const [locale, setLocale] = useState('en');
    const [form, setForm] = useState(emptyForm);
    const [optionsData, setOptionsData] = useState({
        states: [],
        sectors: [],
        districtsByState: {},
        citiesByStateDistrict: {}
    });
    const [topK, setTopK] = useState(5);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [speechEnabled, setSpeechEnabled] = useState(true);
    const [voiceOn, setVoiceOn] = useState(true);
    const [offlineMode, setOfflineMode] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [skillText, setSkillText] = useState('');
    const [autoRunPending, setAutoRunPending] = useState(false);
    const [apiBanner, setApiBanner] = useState(null);
    const spokenTopId = useRef(null);
    const autoRunOnceRef = useRef(false);
    const defaultsAppliedRef = useRef(false);
    const userLockedRef = useRef(false);
    const pendingPresetRef = useRef(null);
    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
    };
    const localeToggleLabel = useMemo(() => t(locale, 'toggleLocale'), [locale]);
    const searchPlaceholder = useMemo(() => t(locale, 'search'), [locale]);
    const emptyOptionsMessage = useMemo(() => t(locale, 'noMatches'), [locale]);
    const genderOptions = useMemo(() => GENDER_VALUES.map((value) => ({
        value,
        label: STR[locale].genderOptions[value] ?? value
    })), [locale]);
    const sectorOptions = useMemo(() => optionsData.sectors.map((value) => ({ value, label: value })), [optionsData.sectors]);
    const stateOptions = useMemo(() => optionsData.states.map((value) => ({ value, label: value })), [optionsData.states]);
    const districtOptions = useMemo(() => {
        if (!form.location.state) {
            return [];
        }
        const list = optionsData.districtsByState[form.location.state] ?? [];
        return list.map((value) => ({ value, label: value }));
    }, [form.location.state, optionsData]);
    const cityOptions = useMemo(() => {
        if (!form.location.state || !form.location.district) {
            return [];
        }
        const key = `${form.location.state}||${form.location.district}`;
        const list = optionsData.citiesByStateDistrict[key] ?? [];
        return list.map((value) => ({ value, label: value }));
    }, [form.location.state, form.location.district, optionsData]);
    const handleToggleLocale = () => {
        setLocale((prev) => (prev === 'en' ? 'hi' : 'en'));
    };
    const optionsReady = optionsData.states.length > 0 && optionsData.sectors.length > 0;
    const handleStopVoice = () => {
        setSpeechEnabled(false);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };
    useEffect(() => {
        let isMounted = true;
        fetchOptions()
            .then((data) => {
            if (isMounted) {
                setOptionsData(data);
            }
        })
            .catch((error) => {
            console.error('Failed to fetch options', error);
            if (!isMounted) {
                return;
            }
            if (error instanceof OfflineFallbackError) {
                setOptionsData(error.fallback);
                setOfflineMode(true);
            }
            else {
                setOptionsData((prev) => (prev.states.length ? prev : FALLBACK_OPTIONS));
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        if (!optionsReady) {
            return;
        }
        if (defaultsAppliedRef.current || userLockedRef.current) {
            return;
        }
        setForm((prev) => {
            const next = {
                ...prev,
                location: { ...prev.location }
            };
            if (!next.gender) {
                next.gender = 'prefer not to say';
            }
            if (!next.sector_interest) {
                next.sector_interest = optionsData.sectors[0] ?? '';
            }
            if (!next.location.state) {
                next.location.state = optionsData.states[0] ?? '';
            }
            const districts = optionsData.districtsByState[next.location.state] ?? [];
            if (!next.location.district) {
                next.location.district = districts[0] ?? '';
            }
            const key = `${next.location.state}||${next.location.district}`;
            const cities = optionsData.citiesByStateDistrict[key] ?? [];
            if (!next.location.city) {
                next.location.city = cities[0] ?? '';
            }
            return next;
        });
        defaultsAppliedRef.current = true;
    }, [optionsReady, optionsData]);
    useEffect(() => {
        if (!speechEnabled || recommendations.length === 0 || !voiceOn) {
            return;
        }
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }
        const top = recommendations[0];
        if (!top) {
            return;
        }
        if (spokenTopId.current === top.internship.id) {
            return;
        }
        const parts = [
            `${top.internship.title} at ${top.internship.organization}.`,
            `Score ${top.score}.`,
            top.why.join(', ')
        ].filter(Boolean);
        const utterance = new SpeechSynthesisUtterance(parts.join(' '));
        utterance.lang = locale === 'hi' ? 'hi-IN' : 'en-IN';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        spokenTopId.current = top.internship.id;
        return () => {
            window.speechSynthesis.cancel();
        };
    }, [recommendations, speechEnabled, locale, voiceOn]);
    const onSubmit = async () => {
        setHasSubmitted(true);
        setOfflineMode(false);
        setLoading(true);
        setError(null);
        setApiBanner(null);
        setSpeechEnabled(true);
        spokenTopId.current = null;
        const skills = skillText
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean);
        const candidate = {
            name: form.name.trim(),
            gender: form.gender?.trim() || undefined,
            education: form.education?.trim() || undefined,
            skills,
            sector: form.sector_interest?.trim() || undefined,
            state: form.location.state?.trim() || undefined,
            district: form.location.district?.trim() || undefined,
            city: form.location.city?.trim() || undefined
        };
        let resultsToCache = [];
        try {
            const data = await fetchRecommendations(candidate, topK);
            setRecommendations(data);
            setOfflineMode(false);
            setError(null);
            setApiBanner({ type: 'onlineBack' });
            resultsToCache = data;
        }
        catch (err) {
            if (err instanceof OfflineFallbackError) {
                const fallbackResults = err.fallback;
                setOfflineMode(true);
                setSpeechEnabled(false);
                setError(err.message);
                setRecommendations(fallbackResults);
                setApiBanner({ type: 'apiError' });
                resultsToCache = fallbackResults;
            }
            else {
                setOfflineMode(true);
                setSpeechEnabled(false);
                const message = err instanceof Error ? err.message : t(locale, 'error');
                setError(message);
                setApiBanner({ type: 'apiError' });
                let cachedResults = null;
                if (typeof window !== 'undefined') {
                    try {
                        const cached = window.localStorage.getItem(LAST_RESULTS_KEY);
                        if (cached) {
                            cachedResults = JSON.parse(cached);
                        }
                    }
                    catch (storageError) {
                        console.error('Failed to load cached recommendations', storageError);
                    }
                }
                const safeResults = cachedResults ?? [];
                setRecommendations(safeResults);
                resultsToCache = safeResults;
            }
        }
        finally {
            setLoading(false);
            if (typeof window !== 'undefined') {
                try {
                    window.localStorage.setItem(LAST_RESULTS_KEY, JSON.stringify(resultsToCache));
                }
                catch (storageError) {
                    console.error('Failed to cache recommendations', storageError);
                }
            }
        }
    };
    const applyPreset = (preset) => {
        userLockedRef.current = true;
        defaultsAppliedRef.current = true;
        const sectors = optionsData.sectors;
        const states = optionsData.states;
        const targetSector = preset.sector_interest ?? '';
        const sector = sectors.includes(targetSector) ? targetSector : sectors[0] ?? '';
        const targetState = preset.state ?? '';
        const state = states.includes(targetState) ? targetState : states[0] ?? '';
        const districts = optionsData.districtsByState[state] ?? [];
        const targetDistrict = preset.district ?? '';
        const district = districts.includes(targetDistrict) ? targetDistrict : districts[0] ?? '';
        const key = `${state}||${district}`;
        const cities = optionsData.citiesByStateDistrict[key] ?? [];
        const targetCity = preset.city ?? '';
        const city = cities.includes(targetCity) ? targetCity : cities[0] ?? '';
        const genderValues = new Set(GENDER_VALUES);
        const gender = genderValues.has(preset.gender)
            ? preset.gender
            : 'prefer not to say';
        setForm((prev) => ({
            ...prev,
            name: preset.name,
            gender,
            education: preset.education_level,
            sector_interest: sector,
            location: {
                state,
                district,
                city
            }
        }));
        setSkillText(preset.skillsText);
        setHasSubmitted(true);
        setOfflineMode(false);
        setAutoRunPending(true);
    };
    useEffect(() => {
        if (!optionsReady) {
            return;
        }
        if (pendingPresetRef.current) {
            const preset = pendingPresetRef.current;
            pendingPresetRef.current = null;
            applyPreset(preset);
        }
    }, [optionsReady]);
    const handleUseSample = () => {
        setApiBanner(null);
        const priyaPreset = {
            name: 'Priya',
            gender: 'female',
            education_level: 'ITI',
            skillsText: 'mechanical, safety, excel basics',
            sector_interest: 'Manufacturing',
            state: 'Maharashtra',
            district: 'Pune',
            city: 'Pune'
        };
        if (!optionsReady) {
            pendingPresetRef.current = priyaPreset;
        }
        else {
            applyPreset(priyaPreset);
        }
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        void onSubmit();
    };
    useEffect(() => {
        const ready = form.sector_interest &&
            form.location.state &&
            form.location.district &&
            form.location.city;
        if (ready && !autoRunOnceRef.current && !userLockedRef.current) {
            autoRunOnceRef.current = true;
            setAutoRunPending(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        form.sector_interest,
        form.location.state,
        form.location.district,
        form.location.city
    ]);
    useEffect(() => {
        if (!autoRunPending) {
            return;
        }
        const ready = Boolean(form.sector_interest) &&
            Boolean(form.location.state) &&
            Boolean(form.location.district) &&
            Boolean(form.location.city);
        if (!ready) {
            return;
        }
        setAutoRunPending(false);
        void onSubmit();
    }, [
        autoRunPending,
        form.sector_interest,
        form.location.state,
        form.location.district,
        form.location.city
    ]);
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { children: [_jsx("h1", { children: t(locale, 'appTitle') }), _jsx("button", { className: "toggle-btn", onClick: handleToggleLocale, type: "button", children: localeToggleLabel })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: t(locale, 'formTitle') }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { children: [t(locale, 'nameLabel'), _jsx("input", { value: form.name, onChange: handleChange('name'), placeholder: t(locale, 'namePlaceholder'), required: true })] }), _jsxs("label", { children: [t(locale, 'genderLabel'), _jsx(SearchableSelect, { value: form.gender, onChange: (value) => setForm((prev) => ({ ...prev, gender: value })), options: genderOptions, placeholder: t(locale, 'genderPlaceholder'), ariaLabel: t(locale, 'genderLabel'), searchPlaceholder: searchPlaceholder, emptyMessage: emptyOptionsMessage })] }), _jsxs("label", { children: [t(locale, 'educationLabel'), _jsxs("select", { value: form.education, onChange: handleChange('education'), children: [_jsx("option", { value: "", children: t(locale, 'educationPlaceholder') }), educationOptions.map((option) => (_jsx("option", { value: option, children: option }, option)))] })] }), _jsxs("label", { children: [t(locale, 'skillsLabel'), _jsx("input", { value: skillText, onChange: (event) => setSkillText(event.target.value), placeholder: t(locale, 'skillsPlaceholder') })] }), _jsxs("label", { children: [t(locale, 'sectorLabel'), _jsx(SearchableSelect, { value: form.sector_interest, onChange: (value) => setForm((prev) => ({ ...prev, sector_interest: value })), options: sectorOptions, placeholder: t(locale, 'sectorPlaceholder'), ariaLabel: t(locale, 'sectorLabel'), searchPlaceholder: searchPlaceholder, emptyMessage: emptyOptionsMessage })] }), _jsxs("label", { children: [t(locale, 'stateLabel'), _jsx(SearchableSelect, { value: form.location.state, onChange: (value) => setForm((prev) => {
                                            const firstDistrict = (optionsData.districtsByState[value] || [])[0] || '';
                                            const firstCity = (optionsData.citiesByStateDistrict[`${value}||${firstDistrict}`] || [])[0] || '';
                                            return {
                                                ...prev,
                                                location: {
                                                    state: value,
                                                    district: firstDistrict,
                                                    city: firstCity
                                                }
                                            };
                                        }), options: stateOptions, placeholder: t(locale, 'statePlaceholder'), ariaLabel: t(locale, 'stateLabel'), searchPlaceholder: searchPlaceholder, emptyMessage: emptyOptionsMessage })] }), _jsxs("label", { children: [t(locale, 'districtLabel'), _jsx(SearchableSelect, { value: form.location.district, onChange: (value) => setForm((prev) => {
                                            const key = `${prev.location.state}||${value}`;
                                            const firstCity = (optionsData.citiesByStateDistrict[key] || [])[0] || '';
                                            return {
                                                ...prev,
                                                location: {
                                                    ...prev.location,
                                                    district: value,
                                                    city: firstCity
                                                }
                                            };
                                        }), options: districtOptions, placeholder: t(locale, 'districtPlaceholder'), ariaLabel: t(locale, 'districtLabel'), searchPlaceholder: searchPlaceholder, emptyMessage: emptyOptionsMessage })] }), _jsxs("label", { children: [t(locale, 'cityLabel'), _jsx(SearchableSelect, { value: form.location.city, onChange: (value) => setForm((prev) => ({
                                            ...prev,
                                            location: { ...prev.location, city: value }
                                        })), options: cityOptions, placeholder: t(locale, 'cityPlaceholder'), ariaLabel: t(locale, 'cityLabel'), searchPlaceholder: searchPlaceholder, emptyMessage: emptyOptionsMessage })] }), _jsxs("div", { className: "actions", children: [_jsxs("label", { htmlFor: "top-k-select", style: {
                                            display: 'block',
                                            marginTop: 10,
                                            fontWeight: 600,
                                            width: '100%'
                                        }, children: [t(locale, 'topK'), _jsxs("select", { id: "top-k-select", value: topK, onChange: (event) => setTopK(Number(event.target.value)), style: {
                                                    width: '100%',
                                                    padding: '12px',
                                                    fontSize: 16,
                                                    borderRadius: '12px',
                                                    border: '1px solid #d1d5db',
                                                    marginTop: 6
                                                }, "aria-label": t(locale, 'topK'), children: [_jsx("option", { value: 3, children: "3" }), _jsx("option", { value: 5, children: "5" })] })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontWeight: 600 }, children: [_jsx("input", { type: "checkbox", checked: voiceOn, onChange: (event) => {
                                                    const { checked } = event.target;
                                                    setVoiceOn(checked);
                                                    if (!checked && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                                                        window.speechSynthesis.cancel();
                                                    }
                                                }, "aria-label": t(locale, 'voiceOn') }), t(locale, 'voiceOn')] }), _jsx("button", { type: "button", onClick: handleUseSample, style: {
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: '#e2e8f0',
                                            color: '#0f172a',
                                            borderRadius: '12px',
                                            border: '1px solid #d1d5db',
                                            fontWeight: 600,
                                            flex: '1 1 100%'
                                        }, children: t(locale, 'tryDemo') }), _jsx("button", { className: "primary-btn", type: "submit", disabled: loading, children: loading ? t(locale, 'loading') : t(locale, 'getInternships') }), _jsx("button", { className: "secondary-btn", type: "button", onClick: handleStopVoice, children: t(locale, 'stopVoice') })] }), error && _jsx("span", { className: "status-text", children: error })] })] }), _jsxs("section", { className: "results-section", children: [apiBanner?.type === 'apiError' && (_jsxs("div", { style: {
                            background: '#FEF3C7',
                            color: '#92400E',
                            padding: '10px 12px',
                            borderRadius: 12,
                            marginTop: 12,
                            position: 'relative'
                        }, children: [t(locale, 'apiError'), _jsx("button", { type: "button", onClick: () => void onSubmit(), style: {
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: '1px solid #92400E',
                                    borderRadius: 8,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    color: '#92400E'
                                }, children: t(locale, 'retry') })] })), apiBanner?.type === 'onlineBack' && !offlineMode && (_jsx("div", { style: {
                            background: '#E6F4EA',
                            color: '#1E7A35',
                            padding: '8px 12px',
                            borderRadius: 12,
                            marginTop: 12
                        }, children: t(locale, 'onlineBack') })), offlineMode && (_jsx("div", { style: {
                            background: '#FEF3C7',
                            color: '#92400E',
                            padding: '10px 12px',
                            borderRadius: 12,
                            marginTop: 12
                        }, children: t(locale, 'offline') })), _jsxs("h2", { style: { marginTop: 16 }, children: [t(locale, 'resultsTitle'), _jsxs("span", { style: {
                                    fontSize: 14,
                                    marginLeft: 8,
                                    padding: '2px 8px',
                                    borderRadius: 9999,
                                    background: '#F3F4F6'
                                }, children: [t(locale, 'resultsCount'), ": ", recommendations.length] })] }), speechEnabled && recommendations.length > 0 && (_jsx("span", { className: "status-text", children: t(locale, 'topMatchHeading') })), !loading && recommendations.length === 0 && hasSubmitted && (_jsx("div", { className: "card", style: { color: '#6B7280' }, children: t(locale, 'noResults') })), _jsx("div", { className: "results-grid", children: recommendations.length > 0 &&
                            recommendations.map((rec) => (_jsxs("article", { className: "card result-card", children: [_jsxs("h3", { children: [rec.internship.title, " \u00B7 ", rec.internship.organization] }), _jsxs("div", { className: "badges", children: [_jsxs("span", { className: "badge", children: ["Score: ", rec.score] }), _jsxs("span", { className: "badge", children: ["\u20B9", rec.internship.stipend] }), _jsxs("span", { className: "badge", children: [rec.internship.city, ", ", rec.internship.state] })] }), _jsx("p", { children: rec.internship.description }), _jsx("strong", { children: t(locale, 'whyLabel') }), _jsx("ul", { className: "why-list", children: rec.why.map((reason, index) => (_jsx("li", { children: reason }, `${rec.internship.id}-why-${index}`))) })] }, rec.internship.id))) })] })] }));
}
export default App;
