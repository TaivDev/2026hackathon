/**
 * Hackathon grader utilities: validate schedules and compute schedule-wide metrics.
 * Use these to test student solutions. Does not depend on student implementation.
 */

import type { Ad, Area, Schedule, ScheduledAd } from '../src/placementEngine';

export type ValidationResult =
    | { valid: true }
    | { valid: false; reason: string };

/**
 * Validates a full schedule against areas and ads. Returns a result with
 * valid: true, or valid: false and a human-readable reason (e.g. "overlapping ads").
 * Checks: structure, area keys, areaId match, no duplicate ads, all ads in list,
 * duration match, banned locations, ad availability window, area time window, no overlaps.
 */
export function isValidSchedule(
    schedule: Schedule,
    areas: Area[],
    ads: Ad[]
): ValidationResult {
    if (schedule == null || typeof schedule !== 'object' || Array.isArray(schedule)) {
        return { valid: false, reason: 'schedule is null, undefined, or not an object' };
    }
    if (!Array.isArray(areas)) {
        return { valid: false, reason: 'areas must be an array' };
    }
    if (!Array.isArray(ads)) {
        return { valid: false, reason: 'ads must be an array' };
    }

    const areaById = new Map<string, Area>();
    for (const a of areas) {
        areaById.set(a.areaId, a);
    }

    const adById = new Map<string, Ad>();
    for (const ad of ads) {
        adById.set(ad.adId, ad);
    }

    const seenAdIds = new Set<string>();

    for (const [scheduleKey, areaSchedule] of Object.entries(schedule)) {
        if (!areaSchedule || !Array.isArray(areaSchedule)) {
            return { valid: false, reason: 'schedule contains non-array value for an area' };
        }

        const area = areaById.get(scheduleKey);
        if (!area) {
            return { valid: false, reason: `schedule contains unknown area key: ${scheduleKey}` };
        }
        if (!Number.isFinite(area.timeWindow) || area.timeWindow <= 0) {
            return { valid: false, reason: 'area has invalid or non-positive timeWindow' };
        }

        for (const scheduled of areaSchedule) {
            if (
                scheduled == null ||
                typeof scheduled !== 'object' ||
                typeof scheduled.adId !== 'string' ||
                typeof scheduled.areaId !== 'string' ||
                typeof scheduled.startTime !== 'number' ||
                typeof scheduled.endTime !== 'number'
            ) {
                return { valid: false, reason: 'schedule contains invalid scheduled ad entry (missing or wrong types)' };
            }

            if (scheduled.areaId !== scheduleKey) {
                return {
                    valid: false,
                    reason: `scheduled ad areaId does not match schedule key (areaId "${scheduled.areaId}" vs key "${scheduleKey}")`,
                };
            }

            if (
                !Number.isFinite(scheduled.startTime) ||
                !Number.isFinite(scheduled.endTime) ||
                scheduled.endTime <= scheduled.startTime
            ) {
                return {
                    valid: false,
                    reason: 'scheduled ad has invalid startTime or endTime (non-finite or endTime <= startTime)',
                };
            }

            if (seenAdIds.has(scheduled.adId)) {
                return { valid: false, reason: 'duplicate ad in schedule (same ad scheduled more than once)' };
            }
            seenAdIds.add(scheduled.adId);

            const ad = adById.get(scheduled.adId);
            if (!ad) {
                return { valid: false, reason: 'scheduled ad not found in ads list' };
            }

            const duration = scheduled.endTime - scheduled.startTime;
            if (duration !== ad.duration) {
                return {
                    valid: false,
                    reason: 'scheduled ad duration does not match ad duration (endTime - startTime !== ad.duration)',
                };
            }

            if (ad.bannedLocations && ad.bannedLocations.includes(area.location)) {
                return { valid: false, reason: 'scheduled ad in banned location for that ad' };
            }

            if (scheduled.startTime < ad.timeReceived) {
                return { valid: false, reason: 'scheduled ad starts before timeReceived' };
            }
            if (scheduled.startTime > ad.timeReceived + ad.timeout) {
                return { valid: false, reason: 'scheduled ad starts after timeReceived + timeout' };
            }

            if (scheduled.startTime < 0) {
                return { valid: false, reason: 'scheduled ad starts before area time window (startTime < 0)' };
            }
            if (scheduled.endTime > area.timeWindow) {
                return {
                    valid: false,
                    reason: 'scheduled ad exceeds area time window (endTime > area.timeWindow)',
                };
            }
        }

        if (areaSchedule.length > 1) {
            const sorted = [...areaSchedule].sort((a, b) => a.startTime - b.startTime);
            for (let i = 0; i < sorted.length - 1; i++) {
                if (sorted[i].endTime > sorted[i + 1].startTime) {
                    return { valid: false, reason: 'overlapping ads in same area' };
                }
            }
        }
    }

    return { valid: true };
}

/**
 * Total revenue for the entire schedule. Uses full-schedule decay ordering
 * (same as RevenueEngine.getAreaRevenue semantics per area, summed).
 */
export function getRevenue(
    schedule: Schedule,
    areas: Area[],
    ads: Ad[],
    decayRate: number
): number {
    const adById = new Map<string, Ad>();
    for (const ad of ads) {
        adById.set(ad.adId, ad);
    }
    const areaByIdMap = areaById(areas);
    let total = 0;
    for (const [areaId, areaSchedule] of Object.entries(schedule)) {
        const area = areaByIdMap.get(areaId);
        if (!area || !areaSchedule || areaSchedule.length === 0) continue;

        total += getAreaRevenue(area, areaSchedule, schedule, areas, adById, decayRate);
    }
    return total;
}

function getAreaRevenue(
    area: Area,
    areaSchedule: ScheduledAd[],
    fullSchedule: Schedule,
    areas: Area[],
    adById: Map<string, Ad>,
    decayRate: number
): number {
    const areaByIdMap = areaById(areas);
    const allScheduled: { ad: Ad; area: Area; startTime: number; rawRevenue: number }[] = [];
    for (const [aid, list] of Object.entries(fullSchedule)) {
        const a = areaByIdMap.get(aid);
        if (!a) continue;
        for (const s of list) {
            const ad = adById.get(s.adId);
            if (!ad) continue;
            allScheduled.push({
                ad,
                area: a,
                startTime: s.startTime,
                rawRevenue: ad.baseRevenue * a.multiplier,
            });
        }
    }

    const byAdvertiser = new Map<string, typeof allScheduled>();
    for (const x of allScheduled) {
        const list = byAdvertiser.get(x.ad.advertiserId) ?? [];
        list.push(x);
        byAdvertiser.set(x.ad.advertiserId, list);
    }

    const decayOrder = new Map<string, number>();
    for (const [, list] of byAdvertiser) {
        list.sort((a, b) => {
            if (a.startTime !== b.startTime) return a.startTime - b.startTime;
            if (a.rawRevenue !== b.rawRevenue) return a.rawRevenue - b.rawRevenue;
            return a.ad.adId.localeCompare(b.ad.adId);
        });
        list.forEach((x, i) => {
            decayOrder.set(x.ad.adId, i);
        });
    }

    let areaTotal = 0;
    for (const s of areaSchedule) {
        const ad = adById.get(s.adId);
        if (!ad) continue;
        const k = (decayOrder.get(s.adId) ?? 0) + 1;
        const decayMultiplier = k <= 1 ? 1 : Math.pow(decayRate, k - 1);
        areaTotal += ad.baseRevenue * area.multiplier * decayMultiplier;
    }
    return areaTotal;
}

function areaById(areas: Area[]): Map<string, Area> {
    const m = new Map<string, Area>();
    for (const a of areas) m.set(a.areaId, a);
    return m;
}

/**
 * Total free (unused) time across all areas that appear in the schedule.
 * For each such area: area.timeWindow minus sum of (endTime - startTime) for that area's scheduled ads.
 */
export function getFreeTime(schedule: Schedule, areas: Area[]): number {
    const areaByIdMap = areaById(areas);
    let total = 0;
    for (const [areaId, areaSchedule] of Object.entries(schedule)) {
        const area = areaByIdMap.get(areaId);
        if (!area || !areaSchedule) continue;
        const scheduledDuration = areaSchedule.reduce(
            (sum, s) => sum + (s.endTime - s.startTime),
            0
        );
        total += area.timeWindow - scheduledDuration;
    }
    return total;
}

/**
 * Number of unique advertisers that have at least one scheduled ad in the schedule.
 */
export function getAdDiversity(schedule: Schedule, ads: Ad[]): number {
    const adById = new Map<string, Ad>();
    for (const ad of ads) {
        adById.set(ad.adId, ad);
    }
    const advertiserIds = new Set<string>();
    for (const areaSchedule of Object.values(schedule)) {
        if (!areaSchedule) continue;
        for (const s of areaSchedule) {
            const ad = adById.get(s.adId);
            if (ad) advertiserIds.add(ad.advertiserId);
        }
    }
    return advertiserIds.size;
}
