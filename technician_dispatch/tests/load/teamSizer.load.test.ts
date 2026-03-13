import { TeamSizer, Location, Box } from '../../src/teamSizer';

// Load / performance tests for Challenge 3 (run separately from unit tests).

const START: Location = { latitude: 0, longitude: 0 };
const SPEED = 60; // km/h — 1 km costs exactly 1 minute of travel

describe('TeamSizer — load tests', () => {
    let sizer: TeamSizer;
    beforeEach(() => { sizer = new TeamSizer(); });

    it('load — 20 boxes: all assigned, no duplicates, deadline respected', () => {
        const boxes = Array.from({ length: 20 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: Math.sin(i) * 1, longitude: Math.cos(i) * 1 },
            fixTimeMinutes: 30 + (i % 4) * 20,
        }));
        const r   = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        const all = r.assignments.flatMap(a => a.assignedBoxIds);
        expect(all.sort()).toEqual(boxes.map(b => b.id).sort());
        expect(new Set(all).size).toBe(all.length);
        if (r.feasible) {
            r.assignments.forEach(a => expect(a.totalTimeMinutes).toBeLessThanOrEqual(480 + 0.01));
        }
    });

    it('load — 50 boxes: all assigned, no duplicates', () => {
        const boxes = Array.from({ length: 50 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: (i % 10) * 0.1, longitude: Math.floor(i / 10) * 0.1 },
            fixTimeMinutes: 20 + (i % 6) * 15,
        }));
        const r   = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        const all = r.assignments.flatMap(a => a.assignedBoxIds);
        expect(new Set(all).size).toBe(all.length);
        expect(all).toHaveLength(50);
    });
});

