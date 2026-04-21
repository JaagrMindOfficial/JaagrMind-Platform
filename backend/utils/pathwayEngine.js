/**
 * Pathway / skill-bucket logic for assessments and daily activity planning.
 * Thresholds default: stable <15, emerging 15–22, support >22 (per 32-pt skill score).
 */

const SKILL_KEYS = ['ATTN_STABILITY', 'LOAD_REGULATION', 'SELF_SAFETY', 'SOCIAL_COMFORT'];

/** Tie-break when two skill scores are equal (higher priority first) */
const TIE_BREAK_ORDER = ['LOAD_REGULATION', 'SELF_SAFETY', 'ATTN_STABILITY', 'SOCIAL_COMFORT'];

const DEFAULT_THRESHOLDS = {
    stableMax: 14,
    emergingMin: 15,
    emergingMax: 22,
    supportMin: 23
};

const SKILL_DISPLAY = {
    ATTN_STABILITY: 'Attention & Focus',
    LOAD_REGULATION: 'Emotional Balance',
    SELF_SAFETY: 'Inner Safety',
    SOCIAL_COMFORT: 'Connection & Social Ease'
};

/**
 * Ordered pair track lookup: primarySkill (highest score) + secondarySkill (second).
 * Values: { trackId, trackName, primaryLine, secondaryLine }
 */
const TRACK_TABLE = {
    'LOAD_REGULATION|ATTN_STABILITY': {
        trackId: 'calm_reset',
        trackName: 'Calm Reset Track',
        primaryLine: '🎯 Right Now, You’re Working On Emotional Balance.',
        secondaryLine: '🌱 You’ll Also Strengthen Attention & Focus.'
    },
    'ATTN_STABILITY|LOAD_REGULATION': {
        trackId: 'calm_reset',
        trackName: 'Calm Reset Track',
        primaryLine: '🎯 Right Now, You’re Working On Attention & Focus.',
        secondaryLine: '🌱 You’ll Also Strengthen Emotional Balance.'
    },
    'ATTN_STABILITY|SELF_SAFETY': {
        trackId: 'focus_confidence',
        trackName: 'Focus + Confidence Track',
        primaryLine: '🎯 Right Now, You’re Working On Attention & Focus.',
        secondaryLine: '🌱 You’ll Also Strengthen Inner Safety.'
    },
    'SELF_SAFETY|ATTN_STABILITY': {
        trackId: 'focus_confidence',
        trackName: 'Focus + Confidence Track',
        primaryLine: '🎯 Right Now, You’re Working On Inner Safety.',
        secondaryLine: '🌱 You’ll Also Strengthen Attention & Focus.'
    },
    'SELF_SAFETY|SOCIAL_COMFORT': {
        trackId: 'safe_connect',
        trackName: 'Safe Connect Track',
        primaryLine: '🎯 Right Now, You’re Working On Inner Safety.',
        secondaryLine: '🌱 You’ll Also Strengthen Connection & Social Ease.'
    },
    'SOCIAL_COMFORT|SELF_SAFETY': {
        trackId: 'safe_connect',
        trackName: 'Safe Connect Track',
        primaryLine: '🎯 Right Now, You’re Working On Connection & Social Ease.',
        secondaryLine: '🌱 You’ll Also Strengthen Inner Safety.'
    }
};

function defaultTrack(primary, secondary) {
    const a = SKILL_DISPLAY[primary] || primary;
    const b = SKILL_DISPLAY[secondary] || secondary;
    return {
        trackId: `custom_${primary}_${secondary}`,
        trackName: `${a} + ${b}`,
        primaryLine: `🎯 Right Now, You’re Working On ${a}.`,
        secondaryLine: `🌱 You’ll Also Strengthen ${b}.`
    };
}

function getTrack(primary, secondary) {
    const key = `${primary}|${secondary}`;
    return TRACK_TABLE[key] || defaultTrack(primary, secondary);
}

function normalizeThresholds(bucketsJson) {
    const t = bucketsJson && typeof bucketsJson === 'object' ? bucketsJson.pathwayThresholds : null;
    return {
        stableMax: t?.stableMax ?? DEFAULT_THRESHOLDS.stableMax,
        emergingMin: t?.emergingMin ?? DEFAULT_THRESHOLDS.emergingMin,
        emergingMax: t?.emergingMax ?? DEFAULT_THRESHOLDS.emergingMax,
        supportMin: t?.supportMin ?? DEFAULT_THRESHOLDS.supportMin
    };
}

function getSkillStatus(score, thresholds) {
    const t = thresholds || DEFAULT_THRESHOLDS;
    const s = Number(score) || 0;
    if (s < t.emergingMin) return 'stable';
    if (s <= t.emergingMax) return 'emerging';
    return 'support';
}

/**
 * Roll up section scores into skill-bucket scores using custom_sections[].skillBucketKey
 */
function aggregateSkillScores(sectionScores, customSections) {
    const out = {};
    SKILL_KEYS.forEach((k) => {
        out[k] = 0;
    });

    const list = Array.isArray(customSections) ? customSections : [];
    if (list.length === 0) {
        Object.entries(sectionScores || {}).forEach(([key, val]) => {
            const sk = inferSkillFromLegacyKey(key);
            if (out[sk] !== undefined) out[sk] += Number(val) || 0;
        });
        return out;
    }
    for (const sec of list) {
        const key = sec.key;
        const sk = sec.skillBucketKey || inferSkillFromLegacyKey(key);
        const raw = sectionScores[key];
        if (raw === undefined || raw === null) continue;
        if (out[sk] === undefined) out[sk] = 0;
        out[sk] += Number(raw) || 0;
    }
    return out;
}

function inferSkillFromLegacyKey(key) {
    const map = { A: 'ATTN_STABILITY', B: 'SELF_SAFETY', C: 'SOCIAL_COMFORT', D: 'LOAD_REGULATION' };
    return map[key] || 'ATTN_STABILITY';
}

/**
 * Max achievable score per section from questions; max per skill bucket = sum of section maxes mapped to that skill.
 */
function computeSectionMaxScores(questions, customSections) {
    const perSection = {};
    const qs = Array.isArray(questions) ? questions : [];
    for (const q of qs) {
        const sec = q.section || 'A';
        const opts = q.options || [];
        const maxOpt = opts.reduce((m, o) => Math.max(m, Number(o.marks) || 0), 0);
        perSection[sec] = (perSection[sec] || 0) + maxOpt;
    }
    const skillMax = {};
    SKILL_KEYS.forEach((k) => {
        skillMax[k] = 0;
    });
    for (const sec of customSections || []) {
        const sk = sec.skillBucketKey || inferSkillFromLegacyKey(sec.key);
        const m = perSection[sec.key] || 0;
        if (skillMax[sk] !== undefined) skillMax[sk] += m;
    }
    return { perSection, skillMax };
}

function sortSkillsByScore(skillScores) {
    const entries = SKILL_KEYS.map((k) => [k, Number(skillScores[k]) || 0]);
    entries.sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return TIE_BREAK_ORDER.indexOf(a[0]) - TIE_BREAK_ORDER.indexOf(b[0]);
    });
    return entries;
}

function pickPrimarySecondary(skillScores) {
    const sorted = sortSkillsByScore(skillScores);
    return {
        primary: sorted[0][0],
        secondary: sorted[1][0],
        ordered: sorted
    };
}

function allSkillsStable(skillScores, thresholds) {
    return SKILL_KEYS.every((k) => getSkillStatus(skillScores[k], thresholds) === 'stable');
}

function getRotationSplit(primaryStatus) {
    if (primaryStatus === 'emerging') return { primaryPct: 60, secondaryPct: 40 };
    if (primaryStatus === 'support') return { primaryPct: 70, secondaryPct: 30 };
    return { primaryPct: 25, secondaryPct: 25 };
}

/**
 * Largest remainder allocation of dailySlots across sections by score/max weighting.
 */
function allocateActivitiesBySection(sectionScores, perSectionMax, dailySlots, customSections) {
    const sections = (customSections || []).map((s) => s.key);
    if (sections.length === 0 || dailySlots <= 0) return [];

    const weights = sections.map((secKey) => {
        const score = Number(sectionScores[secKey]) || 0;
        const max = Math.max(Number(perSectionMax[secKey]) || 1, 1);
        return score / max;
    });
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map((w) => (w / sumW) * dailySlots);
    const floors = raw.map((r) => Math.floor(r));
    let used = floors.reduce((a, b) => a + b, 0);
    const rem = raw.map((r, i) => ({ i, r: r - floors[i] }));
    rem.sort((a, b) => b.r - a.r);
    let left = dailySlots - used;
    const slots = [...floors];
    for (let k = 0; k < rem.length && left > 0; k++) {
        slots[rem[k].i]++;
        left--;
    }

    return sections.map((secKey, idx) => {
        const secDef = (customSections || []).find((s) => s.key === secKey) || {};
        return {
            sectionKey: secKey,
            skillBucketKey: secDef.skillBucketKey || inferSkillFromLegacyKey(secKey),
            percentOfMax: perSectionMax[secKey]
                ? Math.round(((Number(sectionScores[secKey]) || 0) / Number(perSectionMax[secKey])) * 1000) / 10
                : 0,
            allocatedSlots: slots[idx] || 0
        };
    });
}

/** Start with primary, continue primary, end with secondary when both exist. */
function buildSessionPattern(nActivities, primaryWeight, secondaryWeight) {
    const n = Math.max(1, nActivities);
    const pw = primaryWeight + secondaryWeight || 1;
    let pCount = Math.round((primaryWeight / pw) * n);
    pCount = Math.max(1, Math.min(n - 1, pCount));
    const sCount = n - pCount;
    const session = [];
    for (let i = 0; i < pCount; i++) session.push('primary');
    for (let j = 0; j < sCount; j++) session.push('secondary');
    return session;
}

/**
 * Full pathway payload stored on submission + student_pathways
 */
function computePathway({
    sectionScores,
    customSections,
    questions,
    bucketsJson,
    dailyActivitySlots = 4
}) {
    const thresholds = normalizeThresholds(bucketsJson);
    const slots = (bucketsJson && bucketsJson.dailyActivitySlots) || dailyActivitySlots;

    const { perSection, skillMax } = computeSectionMaxScores(questions, customSections);
    const skillScores = aggregateSkillScores(sectionScores, customSections);

    const skillStatus = {};
    SKILL_KEYS.forEach((k) => {
        skillStatus[k] = getSkillStatus(skillScores[k], thresholds);
    });

    const balanceMode = allSkillsStable(skillScores, thresholds);
    const { primary, secondary } = pickPrimarySecondary(skillScores);
    const primaryStatus = skillStatus[primary];

    const rotation = balanceMode
        ? { primaryPct: 25, secondaryPct: 25, mode: 'preventive_even' }
        : { ...getRotationSplit(primaryStatus), mode: 'focused' };

    const track = balanceMode
        ? {
              trackId: 'balance_mode',
              trackName: 'Balance Mode',
              primaryLine: '🌟 You’re in Balance Mode',
              secondaryLine: 'You’ll get a mix of activities to keep your skills strong.'
          }
        : getTrack(primary, secondary);

    let sectionAlloc;
    if (balanceMode && (customSections || []).length > 0) {
        const sections = customSections.map((s) => s.key);
        const eq = Math.floor(slots / sections.length) || 0;
        let rest = slots - eq * sections.length;
        sectionAlloc = sections.map((secKey) => {
            const secDef = customSections.find((s) => s.key === secKey) || {};
            let alloc = eq + (rest > 0 ? 1 : 0);
            if (rest > 0) rest--;
            return {
                sectionKey: secKey,
                skillBucketKey: secDef.skillBucketKey || inferSkillFromLegacyKey(secKey),
                percentOfMax: perSection[secKey]
                    ? Math.round(((Number(sectionScores[secKey]) || 0) / Number(perSection[secKey])) * 1000) / 10
                    : 0,
                allocatedSlots: alloc
            };
        });
    } else {
        sectionAlloc = allocateActivitiesBySection(sectionScores, perSection, slots, customSections);
    }

    const primarySlots = sectionAlloc.filter((a) => a.skillBucketKey === primary).reduce((s, a) => s + a.allocatedSlots, 0);
    const secondarySlots = sectionAlloc.filter((a) => a.skillBucketKey === secondary).reduce((s, a) => s + a.allocatedSlots, 0);

    const pw = balanceMode ? 25 : rotation.primaryPct;
    const sw = balanceMode ? 25 : rotation.secondaryPct;
    const sessionExample = buildSessionPattern(Math.min(3, slots), pw, sw);

    return {
        version: 1,
        thresholds,
        skillScores,
        skillMax,
        skillStatus,
        perSectionMax: perSection,
        primarySkill: primary,
        secondarySkill: secondary,
        primaryDisplay: SKILL_DISPLAY[primary],
        secondaryDisplay: SKILL_DISPLAY[secondary],
        balanceMode,
        trackId: track.trackId,
        trackName: track.trackName,
        studentMessages: {
            primary: track.primaryLine,
            secondary: track.secondaryLine
        },
        rotation,
        dailyActivitySlots: slots,
        sectionActivityAllocation: sectionAlloc,
        sessionPatternHint: sessionExample,
        skillOrderForTieBreak: TIE_BREAK_ORDER
    };
}

module.exports = {
    SKILL_KEYS,
    TIE_BREAK_ORDER,
    DEFAULT_THRESHOLDS,
    SKILL_DISPLAY,
    normalizeThresholds,
    getSkillStatus,
    aggregateSkillScores,
    computeSectionMaxScores,
    pickPrimarySecondary,
    computePathway,
    getTrack,
    allocateActivitiesBySection
};
