import { Ad, Area, Schedule, ScheduledAd, PlacementEngine } from './placementEngine';
import { RevenueEngine } from './revenueEngine';

export interface CandidatePlacement {
    adId: string;
    areaId: string;
    startTime: number;
}

export class Scheduler {
    placementEngine: PlacementEngine;
    revenueEngine: RevenueEngine;

    constructor(placementEngine: PlacementEngine, revenueEngine: RevenueEngine) {
        this.placementEngine = placementEngine;
        this.revenueEngine = revenueEngine;
    }

    getNextAvailableStartTime(areaSchedule: ScheduledAd[]): number {
        return 0;
    }

    getValidCandidatePlacements(
        ads: Ad[],
        areas: Area[],
        schedule: Schedule
    ): CandidatePlacement[] {
        return [];
    }

    selectBestNextPlacement(
        ads: Ad[],
        areas: Area[],
        schedule: Schedule,
        decayRate: number
    ): CandidatePlacement | null {
        return null;
    }

    buildOptimizedSchedule(
        ads: Ad[],
        areas: Area[],
        decayRate: number
    ): Schedule {
        return {};
    }
}

export { Ad, Area, Schedule, ScheduledAd, PlacementEngine } from './placementEngine';
export { RevenueEngine } from './revenueEngine';