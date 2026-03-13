import { DayPlanner, Box, Technician } from '../src/dayPlanner';

jest.setTimeout(2000);

// ─── Shared fixtures ─────────────────────────────────────────────────────────

/**
 * Base technician: origin (0,0), 60 km/h, 480-minute (8-hour) day.
 * At 60 km/h: 1 km costs exactly 1 minute of travel.
 * At the equator: 1° longitude ≈ 111.195 km ≈ 111.195 minutes at 60 km/h.
 */
const BASE_TECH: Technician = {
    id: 't1', name: 'Alice',
    startLocation: { latitude: 0, longitude: 0 },
    speedKmh: 60,
    workingMinutes: 480,
};

/** Build a box `deg` degrees east of origin. Travel time ≈ deg × 111.195 min. */
function eastBox(id: string, deg: number, fixMin: number): Box {
    return { id, name: `Box-${id}`, location: { latitude: 0, longitude: deg }, fixTimeMinutes: fixMin };
}

// ─── calculateRouteDuration ──────────────────────────────────────────────────

describe('DayPlanner — calculateRouteDuration', () => {
    let planner: DayPlanner;
    beforeEach(() => { planner = new DayPlanner(); });

    // ── Empty / trivial ──

    it('returns 0 for an empty routeIds list', () => {
        expect(planner.calculateRouteDuration(BASE_TECH, [], [])).toBeCloseTo(0, 5);
    });

    it('single box: duration = travel + fix time', () => {
        // 0.1° ≈ 11.12 km → 11.12 min travel at 60 km/h, plus 30 min fix = ~41 min
        const box = eastBox('A', 0.1, 30);
        const dur = planner.calculateRouteDuration(BASE_TECH, [box], ['A'])!;
        expect(dur).toBeGreaterThan(40);
        expect(dur).toBeLessThan(45);
    });

    it('two boxes: travel from start → A, fix A, travel A → B, fix B', () => {
        const boxA = eastBox('A', 0.1, 20);
        const boxB = eastBox('B', 0.2, 20);
        const dur  = planner.calculateRouteDuration(BASE_TECH, [boxA, boxB], ['A', 'B'])!;
        // start→A≈11.1 + fix20 + A→B≈11.1 + fix20 ≈ 62 min
        expect(dur).toBeGreaterThan(55);
        expect(dur).toBeLessThan(70);
    });

    it('includes fix time for each box, not just travel', () => {
        const box = eastBox('A', 0.01, 200); // tiny travel, big fix
        const dur = planner.calculateRouteDuration(BASE_TECH, [box], ['A'])!;
        expect(dur).toBeGreaterThan(200); // must include fix time
    });

    it('order matters — visiting the far box first costs more', () => {
        const boxA = eastBox('A', 0.1, 10);
        const boxB = eastBox('B', 0.5, 10);
        const abTime = planner.calculateRouteDuration(BASE_TECH, [boxA, boxB], ['A', 'B'])!;
        const baTime = planner.calculateRouteDuration(BASE_TECH, [boxA, boxB], ['B', 'A'])!;
        // B→A goes far first then back-tracks → more travel
        expect(baTime).toBeGreaterThan(abTime);
    });

    it('duration grows with more boxes added to the route', () => {
        const boxes = [eastBox('A', 0.1, 10), eastBox('B', 0.2, 10), eastBox('C', 0.3, 10)];
        const dur1  = planner.calculateRouteDuration(BASE_TECH, boxes, ['A'])!;
        const dur2  = planner.calculateRouteDuration(BASE_TECH, boxes, ['A', 'B'])!;
        const dur3  = planner.calculateRouteDuration(BASE_TECH, boxes, ['A', 'B', 'C'])!;
        expect(dur2).toBeGreaterThan(dur1);
        expect(dur3).toBeGreaterThan(dur2);
    });

    // ── Invalid input ──

    it('returns null for an unrecognised box ID', () => {
        expect(planner.calculateRouteDuration(BASE_TECH, [], ['GHOST'])).toBeNull();
    });

    it('returns null when any ID in a multi-box route is unrecognised', () => {
        const boxes = [eastBox('A', 0.1, 30)];
        expect(planner.calculateRouteDuration(BASE_TECH, boxes, ['A', 'GHOST'])).toBeNull();
    });

    it('returns null when routeIds is non-empty but boxes array is empty', () => {
        expect(planner.calculateRouteDuration(BASE_TECH, [], ['A'])).toBeNull();
    });
});

// ─── planDay ─────────────────────────────────────────────────────────────────

describe('DayPlanner — planDay', () => {
    let planner: DayPlanner;
    beforeEach(() => { planner = new DayPlanner(); });

    // ── Edge cases ──

    it('returns empty plan and correct technicianId when there are no boxes', () => {
        const r = planner.planDay(BASE_TECH, []);
        expect(r.technicianId).toBe('t1');
        expect(r.plannedRoute).toHaveLength(0);
        expect(r.boxesFixed).toBe(0);
        expect(r.totalTimeUsedMinutes).toBeCloseTo(0, 5);
        expect(r.skippedBoxIds).toHaveLength(0);
    });

    it('skips a single box whose fix time alone exceeds the working day', () => {
        const huge = eastBox('H', 0.01, 600); // 600 min fix > 480 min budget
        const r    = planner.planDay(BASE_TECH, [huge]);
        expect(r.boxesFixed).toBe(0);
        expect(r.skippedBoxIds).toContain('H');
    });

    it('fixes a single box that comfortably fits', () => {
        const box = eastBox('A', 0.1, 30);
        const r   = planner.planDay(BASE_TECH, [box]);
        expect(r.boxesFixed).toBe(1);
        expect(r.plannedRoute).toContain('A');
        expect(r.totalTimeUsedMinutes).toBeLessThanOrEqual(480);
    });

    it('fixes all boxes when they all fit with budget to spare', () => {
        const boxes = [eastBox('A', 0.01, 20), eastBox('B', 0.02, 20), eastBox('C', 0.03, 20)];
        const r     = planner.planDay(BASE_TECH, boxes);
        expect(r.boxesFixed).toBe(3);
        expect(r.skippedBoxIds).toHaveLength(0);
    });

    // ── Correctness invariants ──

    it('totalTimeUsedMinutes never exceeds workingMinutes', () => {
        const boxes = Array.from({ length: 10 }, (_, i) => eastBox(`b${i}`, i * 0.2, 60));
        const r     = planner.planDay(BASE_TECH, boxes);
        expect(r.totalTimeUsedMinutes).toBeLessThanOrEqual(480 + 0.01);
    });

    it('boxesFixed always equals plannedRoute.length', () => {
        const boxes = Array.from({ length: 8 }, (_, i) => eastBox(`b${i}`, i * 0.3, 40));
        const r     = planner.planDay(BASE_TECH, boxes);
        expect(r.boxesFixed).toBe(r.plannedRoute.length);
    });

    it('every box appears in either plannedRoute or skippedBoxIds — never both, never missing', () => {
        const boxes = Array.from({ length: 6 }, (_, i) => eastBox(`b${i}`, i * 0.5, 80));
        const r     = planner.planDay(BASE_TECH, boxes);
        const all   = [...r.plannedRoute, ...r.skippedBoxIds].sort();
        expect(all).toEqual(boxes.map(b => b.id).sort());
        const planned = new Set(r.plannedRoute);
        r.skippedBoxIds.forEach(id => expect(planned.has(id)).toBe(false));
    });

    it('totalTimeUsedMinutes matches calculateRouteDuration for the planned route', () => {
        const boxes    = Array.from({ length: 5 }, (_, i) => eastBox(`b${i}`, i * 0.2, 50));
        const r        = planner.planDay(BASE_TECH, boxes);
        const verified = planner.calculateRouteDuration(BASE_TECH, boxes, r.plannedRoute)!;
        expect(r.totalTimeUsedMinutes).toBeCloseTo(verified, 2);
    });

    it('plannedRoute contains no duplicate box IDs', () => {
        const boxes = Array.from({ length: 6 }, (_, i) => eastBox(`b${i}`, i * 0.1, 30));
        const r     = planner.planDay(BASE_TECH, boxes);
        expect(new Set(r.plannedRoute).size).toBe(r.plannedRoute.length);
    });

    // ── Route ordering behaviour ──

    it('visits boxes in an order that minimises incremental travel time', () => {
        /**
         * Three boxes in increasing longitude, equal fix times.
         * Greedy incremental choice should go: closest first from current point.
         *
         * Start (0°) → A(0.1°) → C(0.2°) → B(0.3°)
         */
        const boxes = [
            eastBox('A', 0.1, 10),
            eastBox('B', 0.3, 10),
            eastBox('C', 0.2, 10),
        ];
        const r = planner.planDay(BASE_TECH, boxes);
        expect(r.plannedRoute).toEqual(['A', 'C', 'B']);
    });

    // ── The key trade-off tests ──

    it('trade-off: picks two fast farther boxes over one slow nearby box, in the right order', () => {
        /**
         * CLOSE  at 0.01° — travel ≈1.1 min,  fix = 400 min → total ≈401 min (1 box)
         * FAR_1  at 0.5°  — travel ≈55.6 min, fix =  60 min ┐
         * FAR_2  at 0.6°  — travel ≈11.1 min  fix =  60 min ┘ total ≈187 min (2 boxes)
         *
         * Greedy-nearest would pick CLOSE → only 1 box.
         * Correct solution picks FAR_1 + FAR_2 → 2 boxes.
         */
        const boxes: Box[] = [
            eastBox('CLOSE', 0.01, 400),
            eastBox('FAR_1', 0.5,   60),
            eastBox('FAR_2', 0.6,   60),
        ];
        const r = planner.planDay(BASE_TECH, boxes);
        expect(r.boxesFixed).toBe(2);
        expect(r.plannedRoute).toEqual(['FAR_1', 'FAR_2']);
        expect(r.skippedBoxIds).toContain('CLOSE');
    });

    it('trade-off: picks four cheap boxes and skips one expensive box', () => {
        /**
         * A–D each at 0.1–0.4°, fix = 10 min each → combined ≈85 min (all fit)
         * E at 0.5°, fix = 400 min → cannot coexist with A–D
         */
        const boxes = [
            eastBox('A', 0.1, 10), eastBox('B', 0.2, 10),
            eastBox('C', 0.3, 10), eastBox('D', 0.4, 10),
            eastBox('E', 0.5, 400),
        ];
        const r = planner.planDay(BASE_TECH, boxes);
        expect(r.boxesFixed).toBeGreaterThanOrEqual(4);
        expect(r.skippedBoxIds).toContain('E');
    });

    it('trade-off: tight 200-min budget → two light boxes beat one heavy box', () => {
        /**
         * deadline = 200 min
         * HEAVY at 0.1°, fix = 180 → total ≈191 min (fits, but uses almost all budget)
         * L1    at 0.2°, fix =  60 ┐
         * L2    at 0.3°, fix =  60 ┘ combined ≈153 min (2 boxes fit)
         */
        const tightTech: Technician = { ...BASE_TECH, workingMinutes: 200 };
        const boxes = [eastBox('HEAVY', 0.1, 180), eastBox('L1', 0.2, 60), eastBox('L2', 0.3, 60)];
        const r     = planner.planDay(tightTech, boxes);
        expect(r.boxesFixed).toBe(2);
        expect(r.plannedRoute).toContain('L1');
        expect(r.plannedRoute).toContain('L2');
        expect(r.skippedBoxIds).toContain('HEAVY');
    });

    it('trade-off: single very expensive box is skipped in favour of several cheap ones', () => {
        const boxes = [
            eastBox('CHEAP_1', 0.01, 5),
            eastBox('CHEAP_2', 0.02, 5),
            eastBox('CHEAP_3', 0.03, 5),
            eastBox('CHEAP_4', 0.04, 5),
            eastBox('CHEAP_5', 0.05, 5),
            eastBox('PRICEY',  0.06, 450),
        ];
        const r = planner.planDay(BASE_TECH, boxes);
        expect(r.boxesFixed).toBeGreaterThanOrEqual(5);
        expect(r.skippedBoxIds).toContain('PRICEY');
    });

    // ── Speed sensitivity ──

    it('faster technician fixes at least as many boxes as a slower one', () => {
        const boxes = Array.from({ length: 15 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: 0, longitude: (i + 1) * 0.3 },
            fixTimeMinutes: 30,
        }));
        const slow = planner.planDay({ ...BASE_TECH, speedKmh: 30  }, boxes);
        const fast = planner.planDay({ ...BASE_TECH, speedKmh: 120 }, boxes);
        expect(fast.boxesFixed).toBeGreaterThanOrEqual(slow.boxesFixed);
    });

    it('more working minutes → at least as many boxes fixed', () => {
        const boxes = Array.from({ length: 8 }, (_, i) => eastBox(`b${i}`, i * 0.2, 60));
        const short = planner.planDay({ ...BASE_TECH, workingMinutes: 120 }, boxes);
        const full  = planner.planDay({ ...BASE_TECH, workingMinutes: 480 }, boxes);
        expect(full.boxesFixed).toBeGreaterThanOrEqual(short.boxesFixed);
    });
});
