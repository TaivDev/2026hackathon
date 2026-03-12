import { Scheduler } from '../src/scheduler';
import { PlacementEngine, Ad, Area, ScheduledAd, Schedule } from '../src/placementEngine';
import { RevenueEngine } from '../src/revenueEngine';

describe('Scheduler', () => {
    let placementEngine: PlacementEngine;
    let revenueEngine: RevenueEngine;
    let scheduler: Scheduler;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
        revenueEngine = new RevenueEngine(placementEngine);
        scheduler = new Scheduler(placementEngine, revenueEngine);
    });

    const createTestAd = (adId: string, overrides: Partial<Ad> = {}): Ad => ({
        adId,
        advertiserId: `advertiser_${adId}`,
        timeReceived: 0,
        timeout: 100,
        duration: 10,
        baseRevenue: 100,
        bannedLocations: [],
        ...overrides,
    });

    const createTestArea = (areaId: string, overrides: Partial<Area> = {}): Area => ({
        areaId,
        location: `location_${areaId}`,
        multiplier: 1.0,
        totalScreens: 1,
        timeWindow: 100,
        ...overrides,
    });

    // startTime inclusive, endTime exclusive; duration = endTime - startTime; next ad can start at endTime
    const createScheduledAd = (
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

    describe('getNextAvailableStartTime', () => {
        it('should return 0 for an empty schedule', () => {
            expect(scheduler.getNextAvailableStartTime([])).toBe(0);
        });

        it('should return the end time when one ad starts at 0', () => {
            const areaSchedule = [createScheduledAd('1', 'area1', 0, 10)];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(10);
        });

        it('should return 0 when one ad starts later than 0', () => {
            const areaSchedule = [createScheduledAd('1', 'area1', 10, 20)];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(0);
        });

        it('should return the end of the last ad for back-to-back ads', () => {
            const areaSchedule = [
                createScheduledAd('1', 'area1', 0, 10),
                createScheduledAd('2', 'area1', 10, 20),
                createScheduledAd('3', 'area1', 20, 30),
            ];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(30);
        });

        it('should return the start of the earliest gap', () => {
            const areaSchedule = [
                createScheduledAd('1', 'area1', 0, 10),
                createScheduledAd('2', 'area1', 20, 30),
            ];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(10);
        });

        it('should find the earliest gap even when the schedule is unsorted', () => {
            const areaSchedule = [
                createScheduledAd('2', 'area1', 20, 30),
                createScheduledAd('1', 'area1', 0, 10),
                createScheduledAd('3', 'area1', 40, 50),
            ];
            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(10);
        });
    });

    describe('isValidSchedule', () => {
        it('should return true for an empty schedule', () => {
            const areas = [createTestArea('area1')];
            const ads: Ad[] = [];
            const schedule: Schedule = {};

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return true for a single valid scheduled ad', () => {
            const areas = [createTestArea('area1', { location: 'main' })];
            const ads = [createTestAd('1')];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return true for a valid multi-area schedule', () => {
            const areas = [
                createTestArea('area1', { location: 'main' }),
                createTestArea('area2', { location: 'bar' }),
            ];
            const ads = [createTestAd('1'), createTestAd('2')];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 10)],
                area2: [createScheduledAd('2', 'area2', 5, 15)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return false when the same ad is scheduled in two areas', () => {
            const areas = [
                createTestArea('area1'),
                createTestArea('area2'),
            ];
            const ads = [createTestAd('1')];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 10)],
                area2: [createScheduledAd('1', 'area2', 20, 30)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when the schedule contains an unknown area key', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1')];
            const schedule: Schedule = {
                unknown_area: [createScheduledAd('1', 'unknown_area', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when a ScheduledAd.areaId does not match its bucket key', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1')];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'different_area', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when a scheduled ad is missing from the ads list', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('2')];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when an ad is scheduled in a banned location', () => {
            const areas = [createTestArea('area1', { location: 'bar' })];
            const ads = [createTestAd('1', { bannedLocations: ['bar'] })];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 10)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when scheduled duration does not match the ad duration', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 12)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when an ad starts before timeReceived', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1', { timeReceived: 10, timeout: 20, duration: 5 })];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 9, 14)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when an ad starts after timeReceived + timeout', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1', { timeReceived: 10, timeout: 20, duration: 5 })];
            const schedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 31, 36)],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return false when ads in the same area overlap', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1'), createTestAd('2')];
            const schedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 9, 19),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return true when ads in the same area touch at boundaries', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1'), createTestAd('2')];
            const schedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 10, 20),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should return false when an area schedule exceeds the area time window', () => {
            const areas = [createTestArea('area1', { timeWindow: 15 })];
            const ads = [createTestAd('1'), createTestAd('2')];
            const schedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 10, 20),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(false);
        });

        it('should return true for an unsorted but otherwise valid area schedule', () => {
            const areas = [createTestArea('area1')];
            const ads = [createTestAd('1'), createTestAd('2'), createTestAd('3')];
            const schedule: Schedule = {
                area1: [
                    createScheduledAd('2', 'area1', 20, 30),
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('3', 'area1', 40, 50),
                ],
            };

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });
    });

    describe('getAreaRevenue', () => {
        it('should return 0 when the target area has no scheduled ads', () => {
            const area = createTestArea('area1', { multiplier: 2 });
            const ads = [createTestAd('1')];
            const fullSchedule: Schedule = {
                area2: [createScheduledAd('1', 'area2', 0, 10)],
            };

            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(0);
        });

        it('should treat decayRate 0 as no decay for repeated advertiser ads', () => {
            const area = createTestArea('area1', { multiplier: 1 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('2', { advertiserId: 'adv1', baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 20, 30),
                ],
            };

            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0)).toBe(200);
        });

        it('should return baseRevenue × multiplier for one ad in the target area', () => {
            const area = createTestArea('area1', { multiplier: 2 });
            const ads = [createTestAd('1', { baseRevenue: 100 })];
            const fullSchedule: Schedule = {
                area1: [createScheduledAd('1', 'area1', 0, 10)],
            };

            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(200);
        });

        it('should use lexicographically smaller adId first when same advertiser ads have same start time and same raw revenue', () => {
            const area = createTestArea('main', { multiplier: 1 });
            const ads = [
                createTestAd('adA', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('adB', { advertiserId: 'adv1', baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                main: [createScheduledAd('adB', 'main', 0, 10)],
                bar: [createScheduledAd('adA', 'bar', 0, 10)],
            };

            // adA should be ordered first globally, so adB in main is decayed
            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(50);
        });

        it('should use lexicographically smaller areaId first when same advertiser ads have same start time and same raw revenue', () => {
            const areaB = createTestArea('areaB', { multiplier: 1 });
            const ads = [
                createTestAd('ad1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('ad2', { advertiserId: 'adv1', baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                areaA: [createScheduledAd('ad1', 'areaA', 0, 10)],
                areaB: [createScheduledAd('ad2', 'areaB', 0, 10)],
            };

            // areaA should be ordered first globally, so areaB ad is decayed
            expect(scheduler.getAreaRevenue(areaB, fullSchedule, ads, 0.5)).toBe(50);
        });

        it('should apply decay to the second ad from the same advertiser in the same area', () => {
            const area = createTestArea('area1', { multiplier: 1 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('2', { advertiserId: 'adv1', baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 20, 30),
                ],
            };

            // 100 + (100 * 0.5^1) = 150
            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(150);
        });

        it('should apply advertiser decay based on ads scheduled in other areas too', () => {
            const area1 = createTestArea('area1', { multiplier: 1 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('2', { advertiserId: 'adv1', baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area2: [createScheduledAd('1', 'area2', 0, 10)],
                area1: [createScheduledAd('2', 'area1', 20, 30)],
            };

            // ad2 is second for adv1 globally, so revenue is 100 * 0.5
            expect(scheduler.getAreaRevenue(area1, fullSchedule, ads, 0.5)).toBe(50);
        });

        it('should not apply decay between different advertisers in the same area', () => {
            const area = createTestArea('area1', { multiplier: 1.5 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('2', { advertiserId: 'adv2', baseRevenue: 200 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 20, 30),
                ],
            };

            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(450);
        });

        it('should return unchanged revenue when decayRate is 1', () => {
            const area = createTestArea('area1', { multiplier: 1 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('2', { advertiserId: 'adv1', baseRevenue: 100 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 20, 30),
                ],
            };

            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 1)).toBe(200);
        });

        it('should apply exponential decay correctly when decayRate is 0.5', () => {
            const area = createTestArea('area1', { multiplier: 1 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 80 }),
                createTestAd('2', { advertiserId: 'adv1', baseRevenue: 80 }),
                createTestAd('3', { advertiserId: 'adv1', baseRevenue: 80 }),
            ];
            const fullSchedule: Schedule = {
                area1: [
                    createScheduledAd('1', 'area1', 0, 10),
                    createScheduledAd('2', 'area1', 20, 30),
                    createScheduledAd('3', 'area1', 40, 50),
                ],
            };

            // 80 + 80*0.5 + 80*0.25 = 80 + 40 + 20 = 140
            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(140);
        });

        it('should return 0 when the target area is not present in the full schedule', () => {
            const area = createTestArea('area1', { multiplier: 2 });
            const ads = [createTestAd('1', { baseRevenue: 100 })];
            const fullSchedule: Schedule = {
                area2: [createScheduledAd('1', 'area2', 0, 10)],
            };

            expect(scheduler.getAreaRevenue(area, fullSchedule, ads, 0.5)).toBe(0);
        });

        it('should use lower raw revenue first when same-advertiser ads have the same start time', () => {
            const main = createTestArea('main', { multiplier: 1 });
            const ads = [
                createTestAd('1', { advertiserId: 'adv1', baseRevenue: 100 }),
                createTestAd('2', { advertiserId: 'adv1', baseRevenue: 200 }),
            ];
            const fullSchedule: Schedule = {
                main: [createScheduledAd('2', 'main', 0, 10)],
                bar: [createScheduledAd('1', 'bar', 0, 10)],
            };

            // bar ad (100) should come first globally, so main ad gets decayed
            expect(scheduler.getAreaRevenue(main, fullSchedule, ads, 0.5)).toBe(100);
        });
    });

    describe('Load Testing - Scheduler', () => {
        const LOAD_SIZE = 100;

        it('should find the earliest gap in a long area schedule', () => {
            const areaSchedule: ScheduledAd[] = [];

            for (let i = 0; i < LOAD_SIZE; i++) {
                if (i === 50) continue;
                areaSchedule.push(createScheduledAd(`${i}`, 'area1', i * 10, i * 10 + 10));
            }

            expect(scheduler.getNextAvailableStartTime(areaSchedule)).toBe(500);
        });

        it('should validate a large multi-area schedule', () => {
            const areas: Area[] = [];
            const ads: Ad[] = [];
            const schedule: Schedule = {};

            for (let a = 0; a < 10; a++) {
                const areaId = `area${a}`;
                areas.push(createTestArea(areaId, { timeWindow: 1000 }));
                schedule[areaId] = [];

                for (let i = 0; i < 10; i++) {
                    const adId = `${a}_${i}`;
                    ads.push(createTestAd(adId, { duration: 10 }));
                    schedule[areaId].push(
                        createScheduledAd(adId, areaId, i * 10, i * 10 + 10)
                    );
                }
            }

            expect(scheduler.isValidSchedule(schedule, areas, ads)).toBe(true);
        });

        it('should calculate area revenue for a large schedule with repeated advertisers across areas', () => {
            const targetArea = createTestArea('area0', { multiplier: 1 });
            const ads: Ad[] = [];
            const fullSchedule: Schedule = {};

            for (let a = 0; a < 5; a++) {
                const areaId = `area${a}`;
                fullSchedule[areaId] = [];

                for (let i = 0; i < 10; i++) {
                    const adId = `${areaId}_ad${i}`;
                    ads.push(
                        createTestAd(adId, {
                            advertiserId: `adv${i % 3}`,
                            baseRevenue: 100,
                        })
                    );
                    fullSchedule[areaId].push(
                        createScheduledAd(adId, areaId, i * 10, i * 10 + 10)
                    );
                }
            }

            const revenue = scheduler.getAreaRevenue(targetArea, fullSchedule, ads, 0.5);
            expect(revenue).toBeGreaterThan(0);
        });
    });
});