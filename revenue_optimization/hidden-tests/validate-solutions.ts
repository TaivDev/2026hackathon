import { Ad, Schedule, Area } from '../src/placementEngine';

export type ScheduleValidationResult = {
    isValid: boolean;
    errors: string[];
};

export function isScheduleValid(
    schedule: Schedule,
    ads: Ad[],
    areas: Area[]
): ScheduleValidationResult {
    const result: ScheduleValidationResult = {
        isValid: true,
        errors: [],
    };

    const { adMap, areaMap } = buildLookupMaps(ads, areas);

    validateScheduleKeysAndReferences(schedule, adMap, areaMap, result);
    validateGlobalSingleUseAds(schedule, result);
    validateScheduledEntries(schedule, adMap, areaMap, result);
    validateNoOverlapsWithinAreas(schedule, result);

    finalizeValidationResult(result);
    return result;
}

const finalizeValidationResult = (
    result: ScheduleValidationResult
): void => {
    result.isValid = result.errors.length === 0;
};

const addError = (
    result: ScheduleValidationResult,
    message: string
): void => {
    result.errors.push(message);
};

const buildLookupMaps = (
    ads: Ad[],
    areas: Area[]
): {
    adMap: Map<string, Ad>;
    areaMap: Map<string, Area>;
} => {
    const adMap = new Map<string, Ad>();
    const areaMap = new Map<string, Area>();

    for (const ad of ads) {
        adMap.set(ad.adId, ad);
    }

    for (const area of areas) {
        areaMap.set(area.areaId, area);
    }

    return { adMap, areaMap };
};

const validateScheduleKeysAndReferences = (
    schedule: Schedule,
    adMap: Map<string, Ad>,
    areaMap: Map<string, Area>,
    result: ScheduleValidationResult
): void => {
    for (const [bucketAreaId, areaSchedule] of Object.entries(schedule)) {
        const bucketArea = areaMap.get(bucketAreaId);

        if (!bucketArea) {
            addError(result, `Unknown schedule area key: ${bucketAreaId}`);
        }

        for (const scheduledAd of areaSchedule) {
            const scheduledArea = areaMap.get(scheduledAd.areaId);
            const ad = adMap.get(scheduledAd.adId);

            if (!scheduledArea) {
                addError(
                    result,
                    `Scheduled ad ${scheduledAd.adId} references unknown areaId: ${scheduledAd.areaId}`
                );
            }

            if (!ad) {
                addError(
                    result,
                    `Scheduled ad references unknown adId: ${scheduledAd.adId}`
                );
            }

            if (scheduledAd.areaId !== bucketAreaId) {
                addError(
                    result,
                    `Scheduled ad ${scheduledAd.adId} has areaId ${scheduledAd.areaId} but is stored in schedule bucket ${bucketAreaId}`
                );
            }

            if (ad && scheduledArea && ad.bannedLocations.includes(scheduledArea.location)) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} is banned from location ${scheduledArea.location}`
                );
            }
        }
    }
};

const validateGlobalSingleUseAds = (
    schedule: Schedule,
    result: ScheduleValidationResult
): void => {
    const usedAdIds = new Set<string>();

    for (const areaSchedule of Object.values(schedule)) {
        for (const scheduledAd of areaSchedule) {
            if (usedAdIds.has(scheduledAd.adId)) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} is scheduled more than once in the full schedule`
                );
            } else {
                usedAdIds.add(scheduledAd.adId);
            }
        }
    }
};

const validateScheduledEntries = (
    schedule: Schedule,
    adMap: Map<string, Ad>,
    areaMap: Map<string, Area>,
    result: ScheduleValidationResult
): void => {
    for (const [bucketAreaId, areaSchedule] of Object.entries(schedule)) {
        const bucketArea = areaMap.get(bucketAreaId);

        for (const scheduledAd of areaSchedule) {
            const ad = adMap.get(scheduledAd.adId);

            if (!ad) {
                continue;
            }

            if (scheduledAd.startTime < 0) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} has invalid startTime ${scheduledAd.startTime}; startTime must be non-negative`
                );
            }

            if (scheduledAd.endTime <= scheduledAd.startTime) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} has invalid time range [${scheduledAd.startTime}, ${scheduledAd.endTime}); endTime must be greater than startTime`
                );
            }

            const scheduledDuration = scheduledAd.endTime - scheduledAd.startTime;
            if (scheduledDuration !== ad.duration) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} has scheduled duration ${scheduledDuration}, but expected duration ${ad.duration}`
                );
            }

            if (scheduledAd.startTime < ad.timeReceived) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} starts at ${scheduledAd.startTime}, before timeReceived ${ad.timeReceived}`
                );
            }

            if (scheduledAd.startTime > ad.timeReceived + ad.timeout) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} starts at ${scheduledAd.startTime}, after allowed latest start ${ad.timeReceived + ad.timeout}`
                );
            }

            if (!bucketArea) {
                continue;
            }

            if (scheduledAd.endTime > bucketArea.timeWindow) {
                addError(
                    result,
                    `Ad ${scheduledAd.adId} ends at ${scheduledAd.endTime}, which exceeds area ${bucketAreaId}'s timeWindow ${bucketArea.timeWindow}`
                );
            }
        }
    }
};

const validateNoOverlapsWithinAreas = (
    schedule: Schedule,
    result: ScheduleValidationResult
): void => {
    for (const [bucketAreaId, areaSchedule] of Object.entries(schedule)) {
        const sortedAreaSchedule = [...areaSchedule].sort((a, b) => {
            if (a.startTime !== b.startTime) {
                return a.startTime - b.startTime;
            }

            if (a.endTime !== b.endTime) {
                return a.endTime - b.endTime;
            }

            return a.adId.localeCompare(b.adId);
        });

        for (let i = 1; i < sortedAreaSchedule.length; i++) {
            const previous = sortedAreaSchedule[i - 1];
            const current = sortedAreaSchedule[i];

            if (current.startTime < previous.endTime) {
                addError(
                    result,
                    `Ads ${previous.adId} and ${current.adId} overlap in area ${bucketAreaId}`
                );
            }
        }
    }
};