// hidden-tests/final-schedule.test.ts

import { Scheduler } from '../src/scheduler';
import { PlacementEngine, Ad, Area, ScheduledAd, Schedule } from '../src/placementEngine';
import { RevenueEngine } from '../src/revenueEngine';

describe('Final hidden tests - buildSchedule', () => {
    let placementEngine: PlacementEngine;
    let revenueEngine: RevenueEngine;
    let scheduler: Scheduler;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
        revenueEngine = new RevenueEngine(placementEngine);
        scheduler = new Scheduler(placementEngine, revenueEngine);
    });

    /**
     * Helper: create a default ad and allow selected fields to be overridden.
     * By default:
     * - ad is available at time 0
     * - ad may start up to time 100
     * - ad lasts 10 time units
     * - ad earns 100 base revenue
     * - ad is allowed in every location
     */
    const createAd = (adId: string, overrides: Partial<Ad> = {}): Ad => ({
        adId,
        advertiserId: `adv_${adId}`,
        timeReceived: 0,
        timeout: 100,
        duration: 10,
        baseRevenue: 100,
        bannedLocations: [],
        ...overrides,
    });

    /**
     * Helper: create a default area and allow selected fields to be overridden.
     * By default:
     * - multiplier is 1
     * - one synchronized screen group
     * - timeWindow is 10
     */
    const createArea = (
        areaId: string,
        location: string,
        overrides: Partial<Area> = {}
    ): Area => ({
        areaId,
        location,
        multiplier: 1,
        totalScreens: 1,
        timeWindow: 10,
        ...overrides,
    });

    /**
     * Helper: construct a scheduled ad entry.
     * Reminder from README:
     * - startTime is inclusive
     * - endTime is exclusive
     * - duration is endTime - startTime
     */
    const s = (
        adId: string,
        areaId: string,
        startTime: number,
        endTime: number
    ): ScheduledAd => ({
        adId,
        areaId,
        startTime,
        endTime,
    });

    /**
     * Helper: normalize schedule ordering before equality checks.
     *
     * We sort each area's returned schedule by:
     * 1. startTime
     * 2. endTime
     * 3. adId
     *
     * This keeps the tests focused on the actual chosen placements rather than
     * on incidental array ordering in the implementation.
     */
    const normalizeSchedule = (schedule: Schedule): Schedule => {
        const normalized: Schedule = {};

        for (const [areaId, areaSchedule] of Object.entries(schedule)) {
            normalized[areaId] = [...areaSchedule].sort((a, b) => {
                if (a.startTime !== b.startTime) return a.startTime - b.startTime;
                if (a.endTime !== b.endTime) return a.endTime - b.endTime;
                return a.adId.localeCompare(b.adId);
            });
        }

        return normalized;
    };

    describe('buildSchedule', () => {
        it('should choose two shorter ads when they uniquely beat one longer ad in total revenue', () => {
            /**
             * Reasoning:
             * - There is one area with a 10-unit time window.
             * - long_only fills the whole window for revenue 50.
             * - short_a can only start at 0 because timeReceived = 0 and timeout = 0.
             * - short_b can only start at 5 because timeReceived = 5 and timeout = 0.
             * - short_a + short_b fit exactly:
             *     short_a -> 0..5
             *     short_b -> 5..10
             * - Total revenue:
             *     long_only = 50
             *     short_a + short_b = 40 + 35 = 75
             * - Therefore the unique optimal schedule is the two shorter ads.
             */

            const ads: Ad[] = [
                createAd('long_only', {
                    advertiserId: 'adv_long',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 50,
                }),
                createAd('short_a', {
                    advertiserId: 'adv_a',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 40,
                }),
                createAd('short_b', {
                    advertiserId: 'adv_b',
                    timeReceived: 5,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 35,
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', {
                    multiplier: 1,
                    timeWindow: 10,
                }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 1);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            expect(normalizeSchedule(result)).toEqual({
                main_area: [
                    s('short_a', 'main_area', 0, 5),
                    s('short_b', 'main_area', 5, 10),
                ],
            });
        });

        it('should respect banned locations and single-use ads across multiple areas', () => {
            /**
             * Reasoning:
             * - premium is allowed everywhere and earns most in main because main has multiplier 2.
             * - patio_only is banned from main, so it can only go to patio.
             * - main_only is banned from patio, so it can only go to main.
             * - Candidate revenues:
             *     premium in main = 100 * 2 = 200
             *     main_only in main = 55 * 2 = 110
             *     patio_only in patio = 60 * 1 = 60
             * - Best global schedule is:
             *     premium -> main_area at 0..10
             *     patio_only -> patio_area at 0..10
             * - main_only is left out because main is already occupied by the stronger premium ad.
             */

            const ads: Ad[] = [
                createAd('premium', {
                    advertiserId: 'adv_premium',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 100,
                    bannedLocations: [],
                }),
                createAd('patio_only', {
                    advertiserId: 'adv_patio',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 60,
                    bannedLocations: ['main'],
                }),
                createAd('main_only', {
                    advertiserId: 'adv_main',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 55,
                    bannedLocations: ['patio'],
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', {
                    multiplier: 2,
                    timeWindow: 10,
                }),
                createArea('patio_area', 'patio', {
                    multiplier: 1,
                    timeWindow: 10,
                }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 1);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            expect(normalizeSchedule(result)).toEqual({
                main_area: [s('premium', 'main_area', 0, 10)],
                patio_area: [s('patio_only', 'patio_area', 0, 10)],
            });
        });

        it('should prefer advertiser diversity when repeated-advertiser decay makes it more profitable', () => {
            /**
             * Reasoning:
             * - There are two areas, each with one 10-unit slot.
             * - advA has one ad that can only go to main and one ad that can only go to bar.
             * - advB has one ad that can only go to bar.
             * - With decayRate = 0.5:
             *     a_main + a_bar = 100 + (100 * 0.5) = 150
             *     a_main + b_bar = 100 + 90 = 190
             * - So using two advertisers beats using two ads from the same advertiser.
             * - The optimal schedule is:
             *     a_main -> main_area
             *     b_bar  -> bar_area
             */

            const ads: Ad[] = [
                createAd('a_main', {
                    advertiserId: 'advA',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 100,
                    bannedLocations: ['bar'],
                }),
                createAd('a_bar', {
                    advertiserId: 'advA',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 100,
                    bannedLocations: ['main'],
                }),
                createAd('b_bar', {
                    advertiserId: 'advB',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 90,
                    bannedLocations: ['main'],
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', { multiplier: 1, timeWindow: 10 }),
                createArea('bar_area', 'bar', { multiplier: 1, timeWindow: 10 }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 0.5);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            expect(normalizeSchedule(result)).toEqual({
                main_area: [s('a_main', 'main_area', 0, 10)],
                bar_area: [s('b_bar', 'bar_area', 0, 10)],
            });
        });

        it('should use the unused-time tie-break when revenue is tied', () => {
            /**
             * Reasoning:
             * - Single area with timeWindow = 10.
             * - option_long gives revenue 100 and uses 8 time units.
             * - option_short_a + option_short_b also gives revenue 60 + 40 = 100,
             *   but together use only 7 time units.
             * - Revenue is tied, so compare unused time:
             *     option_long leaves 2 unused
             *     short pair leaves 3 unused
             * - Less unused time is better.
             * - Therefore the correct answer is the single long ad.
             */

            const ads: Ad[] = [
                createAd('option_long', {
                    advertiserId: 'adv_long',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 8,
                    baseRevenue: 100,
                }),
                createAd('option_short_a', {
                    advertiserId: 'adv_a',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 6,
                    baseRevenue: 60,
                }),
                createAd('option_short_b', {
                    advertiserId: 'adv_b',
                    timeReceived: 6,
                    timeout: 0,
                    duration: 1,
                    baseRevenue: 40,
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', {
                    multiplier: 1,
                    timeWindow: 10,
                }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 1);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            expect(normalizeSchedule(result)).toEqual({
                main_area: [s('option_long', 'main_area', 0, 8)],
            });
        });

        it('should use the advertiser-diversity tie-break when revenue and unused time are tied', () => {
            /**
             * Reasoning:
             * - Single area with timeWindow = 10.
             * - mono_ad gives revenue 100 and fills the whole area.
             * - diverse_a + diverse_b also gives 50 + 50 = 100 and fills the whole area.
             * - Revenue tie: 100 vs 100
             * - Unused time tie: 0 vs 0
             * - Diversity decides:
             *     mono_ad => 1 advertiser
             *     diverse_a + diverse_b => 2 advertisers
             * - Therefore the diverse schedule must be selected.
             */

            const ads: Ad[] = [
                createAd('mono_ad', {
                    advertiserId: 'adv_mono',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 10,
                    baseRevenue: 100,
                }),
                createAd('diverse_a', {
                    advertiserId: 'adv_a',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 50,
                }),
                createAd('diverse_b', {
                    advertiserId: 'adv_b',
                    timeReceived: 5,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 50,
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', {
                    multiplier: 1,
                    timeWindow: 10,
                }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 1);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            expect(normalizeSchedule(result)).toEqual({
                main_area: [
                    s('diverse_a', 'main_area', 0, 5),
                    s('diverse_b', 'main_area', 5, 10),
                ],
            });
        });

        it('should respect exact-time availability windows when building the final schedule', () => {
            /**
             * Reasoning:
             * - exact_start_0 may only start at time 0.
             * - exact_start_5 may only start at time 5.
             * - bad_middle may only start at time 2 and lasts 5 units, so if chosen it blocks
             *   the exact-fit pair from using the full window efficiently.
             * - Revenues:
             *     exact_start_0 + exact_start_5 = 60 + 60 = 120
             *     bad_middle alone = 70
             * - The correct schedule is the exact-fit pair:
             *     exact_start_0 -> 0..5
             *     exact_start_5 -> 5..10
             */

            const ads: Ad[] = [
                createAd('exact_start_0', {
                    advertiserId: 'adv_a',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 60,
                }),
                createAd('exact_start_5', {
                    advertiserId: 'adv_b',
                    timeReceived: 5,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 60,
                }),
                createAd('bad_middle', {
                    advertiserId: 'adv_c',
                    timeReceived: 2,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 70,
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', {
                    multiplier: 1,
                    timeWindow: 10,
                }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 1);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            expect(normalizeSchedule(result)).toEqual({
                main_area: [
                    s('exact_start_0', 'main_area', 0, 5),
                    s('exact_start_5', 'main_area', 5, 10),
                ],
            });
        });

        it('should leave an area empty when every available ad is incompatible or cannot fit legally', () => {
            /**
             * Reasoning:
             * - banned_here is banned from main.
             * - too_late must start at 9, lasts 3, and cannot fit inside a 10-unit window.
             * - too_early_required must start at 11, which is outside the area window entirely.
             * - Therefore no ad can be legally scheduled in the area.
             * - The correct answer is an empty schedule for that area.
             */

            const ads: Ad[] = [
                createAd('banned_here', {
                    advertiserId: 'adv_a',
                    timeReceived: 0,
                    timeout: 0,
                    duration: 5,
                    baseRevenue: 100,
                    bannedLocations: ['main'],
                }),
                createAd('too_late', {
                    advertiserId: 'adv_b',
                    timeReceived: 9,
                    timeout: 0,
                    duration: 3,
                    baseRevenue: 100,
                }),
                createAd('too_early_required', {
                    advertiserId: 'adv_c',
                    timeReceived: 11,
                    timeout: 0,
                    duration: 1,
                    baseRevenue: 100,
                }),
            ];

            const areas: Area[] = [
                createArea('main_area', 'main', {
                    multiplier: 1,
                    timeWindow: 10,
                }),
            ];

            const result = scheduler.buildSchedule(ads, areas, 1);

            expect(scheduler.isValidSchedule(result, areas, ads)).toBe(true);
            // Empty schedule: either no keys or every area has an empty schedule (same thing semantically)
            const isEmptySchedule =
                Object.keys(result).length === 0 ||
                Object.values(result).every((arr) => arr.length === 0);
            expect(isEmptySchedule).toBe(true);
        });
    });
});