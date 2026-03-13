import { TeamSizer, Location, Box } from '../src/teamSizer';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const START: Location = { latitude: 0, longitude: 0 };
const SPEED = 60; // km/h — 1 km costs exactly 1 minute of travel

/** Build a box `deg` degrees east of origin. Travel time ≈ deg × 111.195 min. */
function eastBox(id: string, deg: number, fixMin: number): Box {
    return { id, name: `Box-${id}`, location: { latitude: 0, longitude: deg }, fixTimeMinutes: fixMin };
}

// ─── calculateAssignmentDuration ─────────────────────────────────────────────

describe('TeamSizer — calculateAssignmentDuration', () => {
    let sizer: TeamSizer;
    beforeEach(() => { sizer = new TeamSizer(); });

    // ── Empty / trivial ──

    it('returns 0 for an empty routeIds list', () => {
        expect(sizer.calculateAssignmentDuration(START, SPEED, [], [])).toBeCloseTo(0, 5);
    });

    it('single box: duration = travel from start + fix time', () => {
        const box = eastBox('A', 0.1, 30); // ≈11.12 min travel + 30 min fix ≈ 41 min
        const dur = sizer.calculateAssignmentDuration(START, SPEED, [box], ['A'])!;
        expect(dur).toBeGreaterThan(40);
        expect(dur).toBeLessThan(45);
    });

    it('two boxes: accumulated travel and fix times are summed correctly', () => {
        const boxA = eastBox('A', 0.1, 20);
        const boxB = eastBox('B', 0.2, 20);
        const dur  = sizer.calculateAssignmentDuration(START, SPEED, [boxA, boxB], ['A', 'B'])!;
        // start→A≈11.1 + fix20 + A→B≈11.1 + fix20 ≈ 62 min
        expect(dur).toBeGreaterThan(55);
        expect(dur).toBeLessThan(70);
    });

    it('includes fix time — not just travel', () => {
        const box = eastBox('A', 0.01, 300); // negligible travel, large fix
        const dur = sizer.calculateAssignmentDuration(START, SPEED, [box], ['A'])!;
        expect(dur).toBeGreaterThan(299);
    });

    it('order matters — visiting farther box first results in more travel', () => {
        const boxA = eastBox('A', 0.1, 10);
        const boxB = eastBox('B', 0.5, 10);
        const ab   = sizer.calculateAssignmentDuration(START, SPEED, [boxA, boxB], ['A', 'B'])!;
        const ba   = sizer.calculateAssignmentDuration(START, SPEED, [boxA, boxB], ['B', 'A'])!;
        expect(ba).toBeGreaterThan(ab);
    });

    // ── Invalid input ──

    it('returns null for an unrecognised box ID', () => {
        expect(sizer.calculateAssignmentDuration(START, SPEED, [], ['GHOST'])).toBeNull();
    });

    it('returns null when any ID in a multi-box route is unrecognised', () => {
        const boxes = [eastBox('A', 0.1, 30)];
        expect(sizer.calculateAssignmentDuration(START, SPEED, boxes, ['A', 'GHOST'])).toBeNull();
    });

    it('returns null when routeIds is non-empty but boxes array is empty', () => {
        expect(sizer.calculateAssignmentDuration(START, SPEED, [], ['A'])).toBeNull();
    });
});

// ─── tryAssign ───────────────────────────────────────────────────────────────

describe('TeamSizer — tryAssign', () => {
    let sizer: TeamSizer;
    beforeEach(() => { sizer = new TeamSizer(); });

    // ── Edge cases ──

    it('returns N empty assignments when the box list is empty', () => {
        const r = sizer.tryAssign(START, SPEED, [], 3, 480);
        expect(r).not.toBeNull();
        expect(r!).toHaveLength(3);
        r!.forEach(a => expect(a.assignedBoxIds).toHaveLength(0));
    });

    it('assigns one box to one technician when it fits', () => {
        const box = eastBox('A', 0.1, 30); // ≈41 min total — fits in 480
        const r   = sizer.tryAssign(START, SPEED, [box], 1, 480);
        expect(r).not.toBeNull();
        expect(r!.flatMap(a => a.assignedBoxIds)).toContain('A');
    });

    it('returns null when a single box individually exceeds the deadline', () => {
        const box = eastBox('A', 0.1, 600); // fix alone = 600 > 480
        expect(sizer.tryAssign(START, SPEED, [box], 1, 480)).toBeNull();
    });

    it('returns null when boxes cannot fit in numTechnicians technicians', () => {
        // 3 boxes each needing 200 min, deadline 300 — one tech can only fit 1
        const boxes = [eastBox('A', 0.01, 200), eastBox('B', 0.02, 200), eastBox('C', 0.03, 200)];
        expect(sizer.tryAssign(START, SPEED, boxes, 1, 300)).toBeNull();
    });

    // ── Correctness invariants ──

    it('returns exactly numTechnicians assignment entries', () => {
        const boxes = [eastBox('A', 0.1, 30), eastBox('B', 0.2, 30)];
        const r     = sizer.tryAssign(START, SPEED, boxes, 3, 480)!;
        expect(r).not.toBeNull();
        expect(r).toHaveLength(3);
    });

    it('all boxes are assigned across technicians — none missing', () => {
        const boxes = [eastBox('A', 0.01, 200), eastBox('B', 0.02, 200), eastBox('C', 0.03, 200)];
        const r     = sizer.tryAssign(START, SPEED, boxes, 3, 300)!;
        expect(r).not.toBeNull();
        const all = r.flatMap(a => a.assignedBoxIds).sort();
        expect(all).toEqual(['A', 'B', 'C']);
    });

    it('no box appears in more than one assignment (no overlaps)', () => {
        const boxes = Array.from({ length: 6 }, (_, i) => eastBox(`b${i}`, i * 0.05, 60));
        const r     = sizer.tryAssign(START, SPEED, boxes, 2, 480)!;
        if (r !== null) {
            const all = r.flatMap(a => a.assignedBoxIds);
            expect(new Set(all).size).toBe(all.length);
        }
    });

    it('every technician finishes within the deadline', () => {
        const boxes = Array.from({ length: 6 }, (_, i) => eastBox(`b${i}`, i * 0.05, 40));
        const r     = sizer.tryAssign(START, SPEED, boxes, 2, 480)!;
        if (r !== null) {
            r.forEach(a => expect(a.totalTimeMinutes).toBeLessThanOrEqual(480 + 0.01));
        }
    });

    it('technician labels are unique across the result', () => {
        const boxes = [eastBox('A', 0.1, 30), eastBox('B', 0.2, 30)];
        const r     = sizer.tryAssign(START, SPEED, boxes, 2, 480)!;
        const labels = r.map(a => a.technicianLabel);
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('totalTimeMinutes on each assignment is positive when boxes are assigned', () => {
        const boxes = [eastBox('A', 0.1, 30)];
        const r     = sizer.tryAssign(START, SPEED, boxes, 1, 480)!;
        const withBoxes = r.filter(a => a.assignedBoxIds.length > 0);
        withBoxes.forEach(a => expect(a.totalTimeMinutes).toBeGreaterThan(0));
    });

    it('succeeds when given exactly boxes.length technicians (one each)', () => {
        const boxes = Array.from({ length: 4 }, (_, i) => eastBox(`b${i}`, i * 0.01, 400));
        const r     = sizer.tryAssign(START, SPEED, boxes, 4, 480);
        expect(r).not.toBeNull();
        const all = r!.flatMap(a => a.assignedBoxIds).sort();
        expect(all).toEqual(['b0', 'b1', 'b2', 'b3']);
    });
});

// ─── findMinimumTeamSize ──────────────────────────────────────────────────────

describe('TeamSizer — findMinimumTeamSize', () => {
    let sizer: TeamSizer;
    beforeEach(() => { sizer = new TeamSizer(); });

    // ── Edge cases ──

    it('returns 0 technicians and feasible=true for an empty box list', () => {
        const r = sizer.findMinimumTeamSize(START, SPEED, [], 480);
        expect(r.techniciansNeeded).toBe(0);
        expect(r.assignments).toHaveLength(0);
        expect(r.feasible).toBe(true);
    });

    it('returns feasible=false when a single box individually exceeds the deadline', () => {
        const box = eastBox('A', 0.1, 600); // 600 > 480
        const r   = sizer.findMinimumTeamSize(START, SPEED, [box], 480);
        expect(r.feasible).toBe(false);
    });

    // ── Minimality ──

    it('one technician is enough when all boxes comfortably fit in the day', () => {
        // 3 boxes × ~20 min each ≈ 60 min total — well within 480
        const boxes = [eastBox('A', 0.01, 20), eastBox('B', 0.02, 20), eastBox('C', 0.03, 20)];
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        expect(r.techniciansNeeded).toBe(1);
        expect(r.feasible).toBe(true);
    });

    it('requires exactly 2 technicians when two boxes together exceed one deadline', () => {
        /**
         * deadline = 300 min
         * A: travel≈11.1 + fix200 ≈ 211 min (fits alone)
         * B: travel≈22.2 + fix200 ≈ 222 min (fits alone)
         * Together: ≈ 422 min > 300 → need 2
         */
        const boxes = [eastBox('A', 0.1, 200), eastBox('B', 0.2, 200)];
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 300);
        expect(r.techniciansNeeded).toBe(2);
        expect(r.feasible).toBe(true);
    });

    it('requires N technicians for N individually-large boxes', () => {
        /**
         * 4 boxes, each fix = 400 min. deadline = 480 min.
         * One technician can only carry one box (400 < 480 individually, 800 > 480 together).
         * Minimum = 4.
         */
        const boxes = Array.from({ length: 4 }, (_, i) => eastBox(`b${i}`, i * 0.01, 400));
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        expect(r.techniciansNeeded).toBe(4);
        expect(r.feasible).toBe(true);
    });

    it('tight deadline forces extra technicians — 8 boxes, 2 per tech max', () => {
        /**
         * 8 boxes, fix = 100 min each, negligible travel. deadline = 250 min.
         * Max 2 boxes per technician (2 × 100 = 200 < 250; 3 × 100 = 300 > 250).
         * Minimum = 4 technicians.
         */
        const boxes = Array.from({ length: 8 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: 0, longitude: i * 0.001 }, // negligible travel
            fixTimeMinutes: 100,
        }));
        const r = sizer.findMinimumTeamSize(START, SPEED, boxes, 250);
        expect(r.techniciansNeeded).toBe(4);
        expect(r.feasible).toBe(true);
    });

    it('never over-allocates — 6 cheap boxes fit with 1 technician', () => {
        // 6 × (≈5.56 min travel + 60 min fix) ≈ 393 min < 480 → 1 tech suffices
        const boxes = Array.from({ length: 6 }, (_, i) => eastBox(`b${i}`, i * 0.05, 60));
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        expect(r.techniciansNeeded).toBe(1);
    });

    // ── Assignment validity ──

    it('every box is assigned to exactly one technician', () => {
        const boxes = Array.from({ length: 5 }, (_, i) => eastBox(`b${i}`, i * 0.1, 100));
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        const all   = r.assignments.flatMap(a => a.assignedBoxIds);
        expect(all.sort()).toEqual(boxes.map(b => b.id).sort());
        expect(new Set(all).size).toBe(all.length); // no duplicates
    });

    it('assignments.length equals techniciansNeeded', () => {
        const boxes = [eastBox('A', 0.1, 200), eastBox('B', 0.2, 200), eastBox('C', 0.3, 200)];
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 300);
        expect(r.assignments).toHaveLength(r.techniciansNeeded);
    });

    it('every technician finishes within the deadline', () => {
        const boxes = Array.from({ length: 8 }, (_, i) => eastBox(`b${i}`, i * 0.05, 50));
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        r.assignments.forEach(a =>
            expect(a.totalTimeMinutes).toBeLessThanOrEqual(480 + 0.01)
        );
    });

    it('feasible is true when all boxes can be assigned within the deadline', () => {
        const boxes = Array.from({ length: 4 }, (_, i) => eastBox(`b${i}`, i * 0.05, 60));
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 480);
        expect(r.feasible).toBe(true);
    });

    it('technician labels are unique across all assignments', () => {
        const boxes = Array.from({ length: 4 }, (_, i) => eastBox(`b${i}`, i * 0.1, 200));
        const r     = sizer.findMinimumTeamSize(START, SPEED, boxes, 300);
        const labels = r.assignments.map(a => a.technicianLabel);
        expect(new Set(labels).size).toBe(labels.length);
    });

});
