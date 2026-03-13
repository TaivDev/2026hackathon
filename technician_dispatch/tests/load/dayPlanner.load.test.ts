import { DayPlanner, Box, Technician } from '../../src/dayPlanner';

// Load / performance tests for Challenge 2 (run separately from unit tests).

jest.setTimeout(5000);

/**
 * Base technician: origin (0,0), 60 km/h, 480-minute (8-hour) day.
 */
const BASE_TECH: Technician = {
    id: 't1', name: 'Alice',
    startLocation: { latitude: 0, longitude: 0 },
    speedKmh: 60,
    workingMinutes: 480,
};

describe('DayPlanner — load tests', () => {
    let planner: DayPlanner;
    beforeEach(() => { planner = new DayPlanner(); });

    it('load — 30 boxes: all invariants hold', () => {
        const boxes = Array.from({ length: 30 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: Math.sin(i) * 2, longitude: Math.cos(i) * 2 },
            fixTimeMinutes: 20 + (i % 5) * 30,
        }));
        const r   = planner.planDay(BASE_TECH, boxes);
        const all = [...r.plannedRoute, ...r.skippedBoxIds].sort();
        expect(r.totalTimeUsedMinutes).toBeLessThanOrEqual(480 + 0.01);
        expect(r.boxesFixed).toBe(r.plannedRoute.length);
        expect(all).toEqual(boxes.map(b => b.id).sort());
    });

    it('load — 1000 boxes: all invariants hold', () => {
        const boxes = Array.from({ length: 1000 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: Math.sin(i) * 2, longitude: Math.cos(i) * 2 },
            fixTimeMinutes: 20 + (i % 5) * 1000,
        }));
        const r   = planner.planDay(BASE_TECH, boxes);
        const all = [...r.plannedRoute, ...r.skippedBoxIds].sort();
        expect(r.totalTimeUsedMinutes).toBeLessThanOrEqual(480 + 0.01);
        expect(r.boxesFixed).toBe(r.plannedRoute.length);
        expect(all).toEqual(boxes.map(b => b.id).sort());
    });
});

