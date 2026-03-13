import {
    isValidSchedule,
    getRevenue,
    getFreeTime,
    getAdDiversity,
} from '../hidden-tests/scheduleValidator';
import type { Ad, Area, ScheduledAd, Schedule } from '../src/placementEngine';

const createTestAd = (
    adId: string,
    advertiserId: string,
    overrides: Partial<Ad> = {}
): Ad => ({
    adId,
    advertiserId,
    timeReceived: 0,
    timeout: 30,
    duration: 10,
    baseRevenue: 100,
    bannedLocations: [],
    ...overrides,
});

const createTestArea = (
    areaId: string,
    location: string,
    overrides: Partial<Area> = {}
): Area => ({
    areaId,
    location,
    multiplier: 1.0,
    totalScreens: 1,
    timeWindow: 100,
    ...overrides,
});

const createTestScheduledAd = (
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

describe('scheduleValidator (grader utilities)', () => {
    describe('isValidSchedule', () => {
        it('should return valid for empty schedule', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const result = isValidSchedule({}, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid for single valid scheduled ad', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid for multi-area schedule with non-overlapping ads', () => {
            const areas = [
                createTestArea('area1', 'main'),
                createTestArea('area2', 'bar'),
            ];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 5, 15)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return invalid when schedule is null', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const result = isValidSchedule(null as unknown as Schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('schedule');
        });

        it('should return invalid when schedule is undefined', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const result = isValidSchedule(undefined as unknown as Schedule, areas, ads);
            expect(result.valid).toBe(false);
        });

        it('should return invalid when schedule contains unknown area key', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                unknown_area: [createTestScheduledAd('ad1', 'unknown_area', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('unknown area key');
        });

        it('should return invalid when scheduled ad areaId does not match schedule key', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'different_area', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('areaId');
        });

        it('should return invalid for duplicate ad in schedule', () => {
            const areas = [
                createTestArea('area1', 'main'),
                createTestArea('area2', 'bar'),
            ];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad1', 'area2', 10, 20)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('duplicate');
        });

        it('should return invalid when scheduled ad not in ads list', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad2', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('not found');
        });

        it('should return invalid when scheduled duration does not match ad duration', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 12)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('duration');
        });

        it('should return invalid when ad is in banned location', () => {
            const areas = [createTestArea('area1', 'bar')];
            const ads = [createTestAd('ad1', 'adv1', { bannedLocations: ['bar'] })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('banned');
        });

        it('should return invalid when ad starts before timeReceived', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { timeReceived: 10, timeout: 20, duration: 5 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 9, 14)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('timeReceived');
        });

        it('should return invalid when ad starts after timeReceived + timeout', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { timeReceived: 10, timeout: 20, duration: 5 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 31, 36)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('timeout');
        });

        it('should return invalid when ad exceeds area time window', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 15 })];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('time window');
        });

        it('should return invalid for overlapping ads in same area', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 9, 19),
                ],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('overlapping');
        });

        it('should return invalid when schedule value is not an array', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const schedule = { area1: 'not-an-array' } as unknown as Schedule;
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('array');
        });

        it('should return valid when ads touch at boundaries (no overlap)', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return invalid when areas is not an array', () => {
            const ads: Ad[] = [];
            const result = isValidSchedule({}, null as unknown as Area[], ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('areas');
        });

        it('should return invalid when ads is not an array', () => {
            const areas = [createTestArea('area1', 'main')];
            const result = isValidSchedule({}, areas, null as unknown as Ad[]);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('ads');
        });

        it('should return invalid when ad has non-positive duration', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 0 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('duration');
        });

        it('should return invalid when area has non-positive timeWindow', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 0 })];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('timeWindow');
        });

        it('should return invalid when area schedule value is null', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const schedule = { area1: null } as unknown as Schedule;
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('array');
        });

        it('should return invalid when area schedule value is undefined', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const schedule = { area1: undefined } as unknown as Schedule;
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
        });

        it('should return invalid when scheduled ad entry is null', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule = { area1: [null] } as unknown as Schedule;
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('invalid scheduled ad entry');
        });

        it('should return invalid when scheduled ad has wrong type for startTime', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule = {
                area1: [{ adId: 'ad1', areaId: 'area1', startTime: '0' as unknown as number, endTime: 10 }],
            } as Schedule;
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('invalid scheduled ad entry');
        });

        it('should return invalid when scheduled ad has NaN startTime', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', NaN, 10)],
            };
            (schedule.area1[0] as { startTime: number }).startTime = NaN;
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toMatch(/startTime|endTime|invalid/);
        });

        it('should return invalid when scheduled ad has endTime less than startTime', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 20, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toMatch(/startTime|endTime|invalid/);
        });

        it('should return valid when ad starts exactly at timeReceived', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { timeReceived: 5, timeout: 25, duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 5, 15)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid when ad starts exactly at timeReceived + timeout (inclusive boundary)', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { timeReceived: 0, timeout: 50, duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 50, 60)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid when ad endTime is exactly at area timeWindow', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 100 })];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10, timeout: 100 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 90, 100)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid when startTime is 0', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return invalid when one ad is fully contained inside another (overlap)', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1', { duration: 20 }),
                createTestAd('ad2', 'adv1', { duration: 10 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 20),
                    createTestScheduledAd('ad2', 'area1', 5, 15),
                ],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('overlapping');
        });

        it('should return invalid when same ad appears twice in same area', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad1', 'area1', 20, 30),
                ],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('duplicate');
        });

        it('should return invalid when empty areas array and schedule has keys', () => {
            const areas: Area[] = [];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('unknown area key');
        });

        it('should return invalid when empty ads array and schedule has ads', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads: Ad[] = [];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('not found');
        });

        it('should return valid when schedule has multiple areas with some empty', () => {
            const areas = [
                createTestArea('area1', 'main'),
                createTestArea('area2', 'bar'),
                createTestArea('area3', 'patio'),
            ];
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [],
                area2: [createTestScheduledAd('ad1', 'area2', 0, 10)],
                area3: [],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid when ad has empty bannedLocations', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { bannedLocations: [] })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return valid when bannedLocations does not include area location', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { bannedLocations: ['bar', 'patio'] })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(true);
        });

        it('should return invalid when scheduled duration is shorter than ad duration', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('duration');
        });

        it('should return invalid when scheduled duration is longer than ad duration', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 15)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('duration');
        });

        it('should return invalid when overlapping ads are in unsorted order in array', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad2', 'area1', 9, 19),
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                ],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('overlapping');
        });

        it('should return invalid when startTime is negative', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10, timeout: 100 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', -5, 5)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toMatch(/startTime|time window|before/);
        });

        it('should return invalid when schedule has unknown area key among valid keys', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                unknown_area: [createTestScheduledAd('ad2', 'unknown_area', 0, 10)],
            };
            const result = isValidSchedule(schedule, areas, ads);
            expect(result.valid).toBe(false);
            if (!result.valid) expect(result.reason).toContain('unknown area key');
        });
    });

    describe('getRevenue', () => {
        it('should return 0 for empty schedule', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            expect(getRevenue({}, areas, ads, 0.5)).toBe(0);
        });

        it('should return baseRevenue × multiplier for one ad', () => {
            const areas = [createTestArea('area1', 'main', { multiplier: 2 })];
            const ads = [createTestAd('ad1', 'adv1', { baseRevenue: 100 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            expect(getRevenue(schedule, areas, ads, 0.5)).toBeCloseTo(200);
        });

        it('should apply decay for same-advertiser ads', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                ],
            };
            expect(getRevenue(schedule, areas, ads, 0.5)).toBeCloseTo(150);
        });

        it('should sum revenue across multiple areas', () => {
            const areas = [
                createTestArea('area1', 'main', { multiplier: 1 }),
                createTestArea('area2', 'bar', { multiplier: 1.5 }),
            ];
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv2', { baseRevenue: 100 }),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };
            expect(getRevenue(schedule, areas, ads, 0.5)).toBeCloseTo(250);
        });

        it('should use decay ordering: startTime then raw revenue then adId', () => {
            const areas = [
                createTestArea('area1', 'main'),
                createTestArea('area2', 'bar'),
            ];
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 500 }),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad1', 'area2', 0, 10)],
            };
            expect(getRevenue(schedule, areas, ads, 0.5)).toBeCloseTo(350);
        });

        it('should return full revenue for all when decayRate is 1', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 20, 30),
                ],
            };
            expect(getRevenue(schedule, areas, ads, 1)).toBeCloseTo(200);
        });

        it('should return only first ad revenue per advertiser when decayRate is 0', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 15, 25),
                ],
            };
            expect(getRevenue(schedule, areas, ads, 0)).toBeCloseTo(100);
        });

        it('should return full revenue for all when decayRate is 0.5', () => {
            const areas = [
                createTestArea('area1', 'main', { multiplier: 10.0 }),
                createTestArea('area2', 'bar', { multiplier: 2.0 }),
            ];
            const ads = [
                createTestAd('adA', 'adv1', { baseRevenue: 100 }),
                createTestAd('adB', 'adv1', { baseRevenue: 200 }),
                createTestAd('adD', 'adv2', { baseRevenue: 100 }),
                createTestAd('adC', 'adv2', { baseRevenue: 200 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('adA', 'area1', 0, 10),
                    createTestScheduledAd('adD', 'area1', 20, 30),
                ],
                area2: [
                    createTestScheduledAd('adB', 'area2', 0, 10),
                    createTestScheduledAd('adC', 'area2', 20, 30),
                ],
            };
            expect(getRevenue(schedule, areas, ads, 0.5)).toBeCloseTo(1800);
        });

        it('should return full revenue for all when decayRate is 0.5', () => {
            const areas = [
                createTestArea('area1', 'main', { multiplier: 10.0 }),
                createTestArea('area2', 'bar', { multiplier: 2.0 }),
            ];
            const ads = [
                createTestAd('adA', 'adv1', { baseRevenue: 100 }),
                createTestAd('adB', 'adv1', { baseRevenue: 100 }),
                createTestAd('adC', 'adv1', { baseRevenue: 100 }),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('adA', 'area1', 0, 10),
                    createTestScheduledAd('adC', 'area1', 20, 30),
                ],
                area2: [
                    createTestScheduledAd('adB', 'area2', 0, 10),
                ],
            };
            expect(getRevenue(schedule, areas, ads, 0.5)).toBeCloseTo(950);
        });
    });

    describe('getFreeTime', () => {
        it('should return 0 for empty schedule (no areas in schedule)', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 100 })];
            expect(getFreeTime({}, areas)).toBe(0);
        });

        it('should return full timeWindow when area has no scheduled ads', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 100 })];
            const schedule: Schedule = { area1: [] };
            expect(getFreeTime(schedule, areas)).toBe(100);
        });

        it('should return timeWindow minus scheduled duration for one area', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 100 })];
            const ads = [createTestAd('ad1', 'adv1', { duration: 10 })];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            expect(getFreeTime(schedule, areas)).toBe(90);
        });

        it('should sum free time across multiple areas', () => {
            const areas = [
                createTestArea('area1', 'main', { timeWindow: 100 }),
                createTestArea('area2', 'bar', { timeWindow: 50 }),
            ];
            const ads = [
                createTestAd('ad1', 'adv1', { duration: 10 }),
                createTestAd('ad2', 'adv2', { duration: 20 }),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 20)],
            };
            expect(getFreeTime(schedule, areas)).toBe(120);
        });

        it('should return 0 when area is fully filled', () => {
            const areas = [createTestArea('area1', 'main', { timeWindow: 30 })];
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
                createTestAd('ad3', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                    createTestScheduledAd('ad3', 'area1', 20, 30),
                ],
            };
            expect(getFreeTime(schedule, areas)).toBe(0);
        });
    });

    describe('getAdDiversity', () => {
        it('should return 0 for empty schedule', () => {
            const areas = [createTestArea('area1', 'main')];
            const ads = [createTestAd('ad1', 'adv1')];
            expect(getAdDiversity({}, ads)).toBe(0);
        });

        it('should return 1 when one advertiser has scheduled ads', () => {
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            expect(getAdDiversity(schedule, ads)).toBe(1);
        });

        it('should return 2 when two advertisers have scheduled ads', () => {
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };
            expect(getAdDiversity(schedule, ads)).toBe(2);
        });

        it('should count unique advertisers across areas', () => {
            const ads = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
                createTestAd('ad3', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10), createTestScheduledAd('ad3', 'area2', 10, 20)],
            };
            expect(getAdDiversity(schedule, ads)).toBe(2);
        });

        it('should ignore scheduled ads not in ads list', () => {
            const ads = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('unknown_ad', 'area1', 10, 20),
                ],
            };
            expect(getAdDiversity(schedule, ads)).toBe(1);
        });
    });
});
