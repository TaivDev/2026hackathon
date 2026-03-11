import { PlacementEngine, Ad, Area, ScheduledAd, Schedule } from '../src/placementEngine';

describe('PlacementEngine', () => {
    let placementEngine: PlacementEngine;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
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
        multiplier: 1.5,
        totalScreens: 3,
        timeWindow: 100,
        ...overrides,
    });

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

    describe('constructor', () => {
        it('should create a PlacementEngine instance', () => {
            expect(placementEngine).toBeDefined();
        });
    });

    describe('isAdCompatibleWithArea', () => {
        it('should return true when area location is not banned', () => {
            const ad = createTestAd('1', { bannedLocations: ['bar', 'patio'] });
            const area = createTestArea('1', { location: 'main' });

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(true);
        });

        it('should return false when area location is banned', () => {
            const ad = createTestAd('1', { bannedLocations: ['bar', 'patio'] });
            const area = createTestArea('1', { location: 'bar' });

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(false);
        });

        it('should return true when bannedLocations is empty', () => {
            const ad = createTestAd('1', { bannedLocations: [] });
            const area = createTestArea('1', { location: 'washroom' });

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(true);
        });

        it('should return false when bannedLocations contains many values including the area', () => {
            const ad = createTestAd('1', {
                bannedLocations: ['main', 'bar', 'patio', 'washroom'],
            });
            const area = createTestArea('1', { location: 'patio' });

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(false);
        });

        it('should use exact string matching for location comparison', () => {
            const ad = createTestAd('1', { bannedLocations: ['Bar'] });
            const area = createTestArea('1', { location: 'bar' });

            expect(placementEngine.isAdCompatibleWithArea(ad, area)).toBe(true);
        });
    });

    describe('getTotalScheduledTimeForArea', () => {
        it('should return 0 for an empty schedule', () => {
            expect(placementEngine.getTotalScheduledTimeForArea([])).toBe(0);
        });

        it('should return the duration of a single scheduled ad', () => {
            const areaSchedule = [createScheduledAd('1', 'area1', 0, 10)];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(10);
        });

        it('should return the total duration of multiple scheduled ads', () => {
            const areaSchedule = [
                createScheduledAd('1', 'area1', 0, 10),
                createScheduledAd('2', 'area1', 10, 25),
                createScheduledAd('3', 'area1', 30, 40),
            ];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(35);
        });

        it('should count durations correctly even when there are gaps', () => {
            const areaSchedule = [
                createScheduledAd('1', 'area1', 0, 10),
                createScheduledAd('2', 'area1', 20, 30),
            ];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(20);
        });

        it('should work correctly for unsorted schedules', () => {
            const areaSchedule = [
                createScheduledAd('2', 'area1', 20, 30),
                createScheduledAd('1', 'area1', 0, 10),
                createScheduledAd('3', 'area1', 35, 45),
            ];

            expect(placementEngine.getTotalScheduledTimeForArea(areaSchedule)).toBe(30);
        });
    });

    describe('doesPlacementFitInAreaWindow', () => {
        it('should return true when placement fits in both ad availability and area time window', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 15)
            ).toBe(true);
        });

        it('should return true when placement starts exactly at timeReceived', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 10)
            ).toBe(true);
        });

        it('should return true when placement starts exactly at timeReceived + timeout', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 30)
            ).toBe(true);
        });

        it('should return false when placement starts before timeReceived', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 9)
            ).toBe(false);
        });

        it('should return false when placement starts after timeReceived + timeout', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 31)
            ).toBe(false);
        });

        it('should return true when ad ends exactly at the area time window boundary', () => {
            const ad = createTestAd('1', {
                timeReceived: 0,
                timeout: 100,
                duration: 20,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 80)
            ).toBe(true);
        });

        it('should return false when ad exceeds the area time window by 1', () => {
            const ad = createTestAd('1', {
                timeReceived: 0,
                timeout: 100,
                duration: 21,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], 80)
            ).toBe(false);
        });

        it('should return false for negative start times', () => {
            const ad = createTestAd('1', {
                timeReceived: 0,
                timeout: 100,
                duration: 10,
            });
            const area = createTestArea('1', { timeWindow: 100 });

            expect(
                placementEngine.doesPlacementFitInAreaWindow(ad, area, [], -1)
            ).toBe(false);
        });
    });

    describe('isAdAlreadyScheduled', () => {
        it('should return false for an empty schedule', () => {
            const schedule: Schedule = {};

            expect(placementEngine.isAdAlreadyScheduled('ad1', schedule)).toBe(false);
        });

        it('should return true when ad is scheduled in the first area', () => {
            const schedule: Schedule = {
                area1: [createScheduledAd('ad1', 'area1', 0, 10)],
                area2: [],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad1', schedule)).toBe(true);
        });

        it('should return true when ad is scheduled in a later area', () => {
            const schedule: Schedule = {
                area1: [],
                area2: [createScheduledAd('ad2', 'area2', 20, 30)],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad2', schedule)).toBe(true);
        });

        it('should return false when ad is not scheduled anywhere', () => {
            const schedule: Schedule = {
                area1: [createScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createScheduledAd('ad2', 'area2', 10, 20)],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad3', schedule)).toBe(false);
        });

        it('should handle schedules with empty area arrays', () => {
            const schedule: Schedule = {
                area1: [],
                area2: [],
            };

            expect(placementEngine.isAdAlreadyScheduled('ad1', schedule)).toBe(false);
        });
    });

    describe('canScheduleAd', () => {
        it('should return true for a fully valid placement', () => {
            const ad = createTestAd('1');
            const area = createTestArea('1', { location: 'main' });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 0)).toBe(true);
        });

        it('should return false when area is banned for the ad', () => {
            const ad = createTestAd('1', { bannedLocations: ['main'] });
            const area = createTestArea('1', { location: 'main' });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 0)).toBe(false);
        });

        it('should return false when ad is already scheduled in another area', () => {
            const ad = createTestAd('1');
            const area = createTestArea('2', { location: 'bar' });
            const schedule: Schedule = {
                '1': [createScheduledAd('1', '1', 0, 10)],
                '2': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 20)).toBe(false);
        });

        it('should return false when placement overlaps an existing ad in the same area', () => {
            const ad = createTestAd('2', { duration: 10 });
            const area = createTestArea('1', { location: 'main' });
            const schedule: Schedule = {
                '1': [createScheduledAd('1', '1', 10, 20)],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 15)).toBe(false);
        });

        it('should return true when placement starts exactly when another ad ends', () => {
            const ad = createTestAd('2', { duration: 10 });
            const area = createTestArea('1', { location: 'main' });
            const schedule: Schedule = {
                '1': [createScheduledAd('1', '1', 10, 20)],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 20)).toBe(true);
        });

        it('should return false when placement starts before timeReceived', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { location: 'main' });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 9)).toBe(false);
        });

        it('should return false when placement starts after timeout window', () => {
            const ad = createTestAd('1', {
                timeReceived: 10,
                timeout: 20,
                duration: 5,
            });
            const area = createTestArea('1', { location: 'main' });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 31)).toBe(false);
        });

        it('should return false when placement exceeds the area time window', () => {
            const ad = createTestAd('1', { duration: 25 });
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 80)).toBe(false);
        });

        it('should return true when placement fits exactly at the end boundary', () => {
            const ad = createTestAd('1', { duration: 20 });
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 80)).toBe(true);
        });

        it('should work when the schedule does not yet contain the target area key', () => {
            const ad = createTestAd('1');
            const area = createTestArea('2', { location: 'main' });
            const schedule: Schedule = {
                '1': [],
            };

            expect(placementEngine.canScheduleAd(ad, area, schedule, 0)).toBe(true);
        });
    });

    describe('isAreaScheduleValid', () => {
        it('should return true for an empty area schedule', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads: Ad[] = [];

            expect(placementEngine.isAreaScheduleValid(area, [], ads)).toBe(true);
        });

        it('should return true for a single valid scheduled ad', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1')];
            const areaSchedule = [createScheduledAd('1', '1', 10, 20)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return true for multiple non-overlapping ads with gaps', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1'), createTestAd('2'), createTestAd('3')];
            const areaSchedule = [
                createScheduledAd('1', '1', 0, 10),
                createScheduledAd('2', '1', 20, 30),
                createScheduledAd('3', '1', 40, 50),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return true when ads touch exactly at boundaries', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1'), createTestAd('2'), createTestAd('3')];
            const areaSchedule = [
                createScheduledAd('1', '1', 0, 10),
                createScheduledAd('2', '1', 10, 20),
                createScheduledAd('3', '1', 20, 30),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false when two ads overlap by 1 unit', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1'), createTestAd('2')];
            const areaSchedule = [
                createScheduledAd('1', '1', 0, 10),
                createScheduledAd('2', '1', 9, 20),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return false when one ad is fully contained inside another', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1'), createTestAd('2')];
            const areaSchedule = [
                createScheduledAd('1', '1', 0, 20),
                createScheduledAd('2', '1', 5, 10),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return true when total scheduled time exactly equals the area time window', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 30 });
            const ads = [createTestAd('1'), createTestAd('2'), createTestAd('3')];
            const areaSchedule = [
                createScheduledAd('1', '1', 0, 10),
                createScheduledAd('2', '1', 10, 20),
                createScheduledAd('3', '1', 20, 30),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false when total scheduled time exceeds the area time window', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 25 });
            const ads = [createTestAd('1'), createTestAd('2'), createTestAd('3')];
            const areaSchedule = [
                createScheduledAd('1', '1', 0, 10),
                createScheduledAd('2', '1', 10, 20),
                createScheduledAd('3', '1', 20, 30),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should validate correctly even when the schedule is unsorted', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1'), createTestAd('2'), createTestAd('3')];
            const areaSchedule = [
                createScheduledAd('2', '1', 20, 30),
                createScheduledAd('1', '1', 0, 10),
                createScheduledAd('3', '1', 40, 50),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(true);
        });

        it('should return false when an area schedule contains overlapping ads in unsorted order', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('1'), createTestAd('2')];
            const areaSchedule = [
                createScheduledAd('2', '1', 15, 25),
                createScheduledAd('1', '1', 10, 20),
            ];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return false when the area location is banned for a scheduled ad', () => {
            const area = createTestArea('1', { location: 'bar', timeWindow: 100 });
            const ads = [createTestAd('1', { bannedLocations: ['bar'] })];
            const areaSchedule = [createScheduledAd('1', '1', 0, 10)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });

        it('should return false when a scheduled ad is missing from the ads array', () => {
            const area = createTestArea('1', { location: 'main', timeWindow: 100 });
            const ads = [createTestAd('2')];
            const areaSchedule = [createScheduledAd('1', '1', 0, 10)];

            expect(placementEngine.isAreaScheduleValid(area, areaSchedule, ads)).toBe(false);
        });
    });
});