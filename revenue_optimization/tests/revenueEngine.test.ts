import { RevenueEngine } from '../src/revenueEngine';
import { PlacementEngine } from '../src/placementEngine';

// Types matching README data model (for test helpers)
interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: number;
    timeout: number;
    duration: number;
    baseRevenue: number;
    bannedLocations: string[];
}

interface Area {
    areaId: string;
    location: string;
    multiplier: number;
    totalScreens: number;
    timeWindow: number;
}

interface ScheduledAd {
    adId: string;
    areaId: string;
    startTime: number;
    endTime: number;
}

type Schedule = Record<string, ScheduledAd[]>;

describe('RevenueEngine', () => {
    let revenueEngine: RevenueEngine;
    let placementEngine: PlacementEngine;

    beforeEach(() => {
        placementEngine = new PlacementEngine();
        revenueEngine = new RevenueEngine(placementEngine);
    });

    const createTestAd = (
        adId: string,
        advertiserId: string,
        overrides: Partial<Ad> = {}
    ): Ad => ({
        adId,
        advertiserId,
        timeReceived: 0,
        timeout: 10,
        duration: 5,
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

    describe('constructor', () => {
        it('should create a new RevenueEngine instance', () => {
            expect(revenueEngine).toBeDefined();
            expect(revenueEngine.placementEngine).toBeDefined();
            expect(revenueEngine.placementEngine).toBeInstanceOf(PlacementEngine);
        });
    });

    describe('getAdvertiserScheduleCount', () => {
        it('should return 0 when advertiser has no scheduled ads', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(0);
        });

        it('should return 1 when advertiser has one scheduled ad', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(1);
        });

        it('should count all scheduled ads for advertiser across areas', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
                createTestAd('ad3', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(2);
        });

        it('should return 0 for empty schedule', () => {
            const ads: Ad[] = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {};

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(0);
        });

        it('should return 0 for non-existent advertiser id', () => {
            const ads: Ad[] = [createTestAd('ad1', 'adv1')];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('nonexistent', ads, schedule)).toBe(0);
        });

        it('should count multiple ads from same advertiser in one area', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 10, 15),
                ],
            };

            expect(revenueEngine.getAdvertiserScheduleCount('adv1', ads, schedule)).toBe(2);
        });
    });

    describe('calculateDiminishedRevenue', () => {
        it('should return full base revenue when advertiserScheduledCount is 0', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 0, 0.5)).toBeCloseTo(100);
        });

        it('should return reduced revenue when advertiser already has 1 scheduled ad', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 1, 0.5)).toBeCloseTo(100 * 0.5);
        });

        it('should return lower revenue as advertiserScheduledCount increases', () => {
            const first = revenueEngine.calculateDiminishedRevenue(100, 0, 0.5);
            const second = revenueEngine.calculateDiminishedRevenue(100, 1, 0.5);
            const third = revenueEngine.calculateDiminishedRevenue(100, 2, 0.5);

            expect(first).toBeGreaterThan(second);
            expect(second).toBeGreaterThan(third);

            expect(first).toBeCloseTo(100);
            expect(second).toBeCloseTo(100 * 0.5);
            expect(third).toBeCloseTo(100 * 0.5 * 0.5);
        });

        it('should return full revenue for all ads when decayRate is 1 (no decay)', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 0, 1)).toBeCloseTo(100);
            expect(revenueEngine.calculateDiminishedRevenue(100, 5, 1)).toBeCloseTo(100);
        });

        it('should apply full decay when decayRate is 0 (only first ad earns)', () => {
            expect(revenueEngine.calculateDiminishedRevenue(100, 0, 0)).toBeCloseTo(100);
            expect(revenueEngine.calculateDiminishedRevenue(100, 1, 0)).toBeCloseTo(0);
            expect(revenueEngine.calculateDiminishedRevenue(100, 5, 0)).toBeCloseTo(0);
        });

        it('should handle zero baseRevenue', () => {
            expect(revenueEngine.calculateDiminishedRevenue(0, 0, 0)).toBeCloseTo(0);
            expect(revenueEngine.calculateDiminishedRevenue(0, 1, 0)).toBeCloseTo(0);
            expect(revenueEngine.calculateDiminishedRevenue(0, 5, 0)).toBeCloseTo(0);
        });

        it('should be consistent for same inputs', () => {
            const a = revenueEngine.calculateDiminishedRevenue(50, 2, 0.25);
            const b = revenueEngine.calculateDiminishedRevenue(50, 2, 0.25);
            expect(a).toBeCloseTo(b);
        });
    });

    describe('calculatePlacementRevenue', () => {
        it('should include area multiplier in revenue', () => {
            const ad = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const area = createTestArea('area1', 'main', { multiplier: 1.5 });
            const ads: Ad[] = [ad];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)]
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad, [area], ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(100 * 1.5);
        });

        it('should apply diminishing returns when advertiser has existing scheduled ads', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.5 });
            const ads: Ad[] = [ad1, ad2];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 5, 10),
                ],
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad2, [area1], ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(200 * 0.5 * 1.5);
        });

        it('should apply diminishing returns when advertiser has existing scheduled ad in different areas', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.5 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const areas: Area[] = [area1, area2];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 5, 10)],
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad2, areas, ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(200 * 0.5 * 1.5);
        });

        it('should apply decay rate to higher revenue ads when advertiser ad is playing in parallel', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.5 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const areas: Area[] = [area1, area2];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 5)],
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ad1, areas, ads, schedule, 0.5);
            expect(revenue).toBeCloseTo(100 * 1.5);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, areas, ads, schedule, 0.5);
            expect(revenue2).toBeCloseTo(200 * 0.5 * 2);
        });

        it('should handle decay rate of 1 (no decay) for second ad from same advertiser', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });

            const area = createTestArea('area1', 'main', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 5, 10),
                ],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, [area], ads, schedule, 1);
            expect(revenue1).toBeCloseTo(100 * 2);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, [area], ads, schedule, 1);
            expect(revenue2).toBeCloseTo(200 * 2);
        });

        it('should handle decay rate of 0 for second ad from same advertiser', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });

            const area = createTestArea('area1', 'main', { multiplier: 2 });
            const ads: Ad[] = [ad1, ad2];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 5, 10),
                ],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, [area], ads, schedule, 0);
            expect(revenue1).toBeCloseTo(100 * 2);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, [area], ads, schedule, 0);
            expect(revenue2).toBeCloseTo(0);
        });

        it('should use lexicographically smaller adId first when startTime and raw revenue are tied', () => {
            const adA = createTestAd('adA', 'adv1', { baseRevenue: 100 });
            const adB = createTestAd('adB', 'adv1', { baseRevenue: 100 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 1.0 });
            const areas: Area[] = [area1, area2];

            const ads: Ad[] = [adA, adB];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('adA', 'area1', 0, 5)],
                area2: [createTestScheduledAd('adB', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(adA, areas, ads, schedule, 0.5);
            expect(revenue1).toBeCloseTo(100 * 1.0);

            const revenue2 = revenueEngine.calculatePlacementRevenue(adB, areas, ads, schedule, 0.5);
            expect(revenue2).toBeCloseTo(100 * 0.5 * 1.0);
        });

        it('should handle decay rate of 0 when startTime is tied for second ad from same advertiser', () => {
            const adA = createTestAd('adA', 'adv1', { baseRevenue: 100 });
            const adB = createTestAd('adB', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 1.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 1.0 });
            const areas: Area[] = [area1, area2];
            const ads: Ad[] = [adA, adB];

            const schedule: Schedule = {
                area1: [createTestScheduledAd('adA', 'area1', 0, 5)],
                area2: [createTestScheduledAd('adB', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(adA, areas, ads, schedule, 0);
            expect(revenue1).toBeCloseTo(100);

            const revenue2 = revenueEngine.calculatePlacementRevenue(adB, areas, ads, schedule, 0);
            expect(revenue2).toBeCloseTo(0);
        });

        it('should consider raw placement revenue (i.e. baseRevenue * multiplier) when startTime is tied', () => {
            const ad1 = createTestAd('ad1', 'adv1', { baseRevenue: 100 });
            const ad2 = createTestAd('ad2', 'adv1', { baseRevenue: 200 });
            const area1 = createTestArea('area1', 'main', { multiplier: 5.0 });
            const area2 = createTestArea('area2', 'bar', { multiplier: 2.0 });
            const areas: Area[] = [area1, area2];
            const ads: Ad[] = [ad1, ad2];

            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 5)],
            };

            const revenue1 = revenueEngine.calculatePlacementRevenue(ad1, areas, ads, schedule, 0.5);
            expect(revenue1).toBeCloseTo(100 * 5.0 * 0.5);

            const revenue2 = revenueEngine.calculatePlacementRevenue(ad2, areas, ads, schedule, 0.5);
            expect(revenue2).toBeCloseTo(200 * 2.0);
        });
    });

    describe('getAdvertiserDiversity', () => {
        it('should return 0 for empty schedule', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {};

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(0);
        });

        it('should return 1 when only one advertiser has scheduled ads', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 10, 15),
                ],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(1);
        });

        it('should return number of unique advertisers in schedule', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
                createTestAd('ad3', 'adv3'),
                createTestAd('ad4', 'adv1'),
            ];
            const schedule: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 5),
                    createTestScheduledAd('ad2', 'area1', 10, 15),  
                ],
                area2: [
                    createTestScheduledAd('ad3', 'area2', 0, 5),
                    createTestScheduledAd('ad4', 'area2', 10, 15)
                ],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(3);
        });

        it('should not count advertisers with no scheduled ads', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1'),
                createTestAd('ad2', 'adv2'),
            ];
            const schedule: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 5)],
            };

            expect(revenueEngine.getAdvertiserDiversity(ads, schedule)).toBe(1);
        });
    });

    describe('compareSchedules', () => {
        const defaultAds: Ad[] = [
            createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
            createTestAd('ad2', 'adv2', { baseRevenue: 80 }),
        ];
        const defaultAreas: Area[] = [
            createTestArea('area1', 'main', { multiplier: 1.0, timeWindow: 50 }),
            createTestArea('area2', 'bar', { multiplier: 1.2, timeWindow: 50 }),
        ];
        const decayRate = 0.5;

        it('should return positive when scheduleA has higher total revenue', () => {
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 10)],
            };

            const result = revenueEngine.compareSchedules(
                defaultAds,
                defaultAreas,
                scheduleA,
                scheduleB,
                decayRate
            );
            expect(result).toBeGreaterThan(0);
        });

        it('should return negative when scheduleB has higher total revenue', () => {
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
                area2: [createTestScheduledAd('ad2', 'area2', 0, 10)],
            };

            const result = revenueEngine.compareSchedules(
                defaultAds,
                defaultAreas,
                scheduleA,
                scheduleB,
                decayRate
            );
            expect(result).toBeLessThan(0);
        });

        it('should return 0 when schedules are equivalent in revenue, unused time, and diversity', () => {
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };

            const result = revenueEngine.compareSchedules(
                defaultAds,
                defaultAreas,
                scheduleA,
                scheduleB,
                decayRate
            );
            expect(result).toBe(0);
        });

        it('should prefer less unused time when revenue is tied', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100, duration: 10 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100, duration: 20 }),
            ];
            const scheduleA: Schedule = {
                area1: [createTestScheduledAd('ad1', 'area1', 0, 10)],
            };
            const scheduleB: Schedule = {
                area1: [createTestScheduledAd('ad2', 'area1', 0, 20)],
            };

            const result = revenueEngine.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, 1);
            expect(result).toBeLessThan(0);
        });

        it('should return 0 when schedules are equivalent in revenue and unused time', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 50 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 50 }),
            ];
            const scheduleA: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };
            const scheduleB: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };

            const result = revenueEngine.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, 1);
            expect(result).toBe(0);
        });

        it('should return positive when A has same revenue and unused time but more diversity', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad3', 'adv2', { baseRevenue: 100 }),
            ];

            const scheduleA: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad3', 'area1', 10, 20)
                ],
            };
            const scheduleB: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20),
                ],
            };

            const result = revenueEngine.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, 1);
            expect(result).toBeGreaterThan(0);
        });

        it('should return negative when B has same revenue and unused time but more diversity', () => {
            const ads: Ad[] = [
                createTestAd('ad1', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad2', 'adv1', { baseRevenue: 100 }),
                createTestAd('ad3', 'adv2', { baseRevenue: 100 }),
            ];

            const scheduleA: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad2', 'area1', 10, 20)
                ],
            };
            const scheduleB: Schedule = {
                area1: [
                    createTestScheduledAd('ad1', 'area1', 0, 10),
                    createTestScheduledAd('ad3', 'area1', 10, 20),
                ],
            };

            const result = revenueEngine.compareSchedules(ads, defaultAreas, scheduleA, scheduleB, 1);
            expect(result).toBeLessThan(0);
        });

        it('should treat empty schedules as equivalent when both empty', () => {
            const scheduleA: Schedule = {};
            const scheduleB: Schedule = {};

            const result = revenueEngine.compareSchedules(defaultAds, defaultAreas, scheduleA, scheduleB, decayRate);
            expect(result).toBe(0);
        });
    });

    describe('Load Testing - RevenueEngine', () => {
        const LOAD_ADS_COUNT = 50;
        const LOAD_AREAS_COUNT = 10;

        it('should getAdvertiserScheduleCount efficiently with many areas and ads', () => {
            const ads: Ad[] = [];
            for (let i = 0; i < LOAD_ADS_COUNT; i++) {
                ads.push(createTestAd(`ad${i}`, `adv${i % 5}`, { baseRevenue: 10 }));
            }

            const schedule: Schedule = {};
            for (let a = 0; a < LOAD_AREAS_COUNT; a++) {
                schedule[`area${a}`] = [];
                for (let i = 0; i < 5; i++) {
                    const ad = ads[a * 5 + i];
                    if (ad) {
                        schedule[`area${a}`].push(
                            createTestScheduledAd(ad.adId, `area${a}`, i * 10, i * 10 + 5)
                        );
                    }
                }
            }

            const count = revenueEngine.getAdvertiserScheduleCount('adv0', ads, schedule);
            expect(count).toBeGreaterThanOrEqual(0);
        });

        it('should getAdvertiserDiversity efficiently with large schedule', () => {
            const ads: Ad[] = [];
            for (let i = 0; i < LOAD_ADS_COUNT; i++) {
                ads.push(createTestAd(`ad${i}`, `adv${i % 10}`));
            }

            const schedule: Schedule = {};
            for (let a = 0; a < LOAD_AREAS_COUNT; a++) {
                schedule[`area${a}`] = [];
                for (let i = 0; i < 5; i++) {
                    const idx = a * 5 + i;
                    if (idx < ads.length) {
                        schedule[`area${a}`].push(
                            createTestScheduledAd(ads[idx].adId, `area${a}`, i * 20, i * 20 + 10)
                        );
                    }
                }
            }

            const diversity = revenueEngine.getAdvertiserDiversity(ads, schedule);
            expect(diversity).toBeGreaterThanOrEqual(0);
            expect(diversity).toBeLessThanOrEqual(10);
        });

        it('should calculatePlacementRevenue consistently with many ads in schedule', () => {
            const ads: Ad[] = [
                createTestAd('newAd', 'adv0', { baseRevenue: 100 }),
                ...Array.from({ length: LOAD_ADS_COUNT - 1 }, (_, i) =>
                    createTestAd(`ad${i}`, 'adv0', { baseRevenue: 50 })
                ),
            ];
            const area = createTestArea('area1', 'main', { multiplier: 1.0 });
            const schedule: Schedule = {
                area1: ads.slice(1, 11).map((ad, i) =>
                    createTestScheduledAd(ad.adId, 'area1', i * 10, i * 10 + 5)
                ),
            };

            const revenue = revenueEngine.calculatePlacementRevenue(ads[0], [area], ads, schedule, 0.5);
            expect(revenue).toBeLessThanOrEqual(100);
            expect(revenue).toBeGreaterThanOrEqual(0);
        });
    });
});