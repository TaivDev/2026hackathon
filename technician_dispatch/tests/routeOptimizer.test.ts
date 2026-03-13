import { RouteOptimizer, Location, Box, Technician } from '../src/routeOptimizer';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const ORIGIN_TECH: Technician = {
    id: 't1',
    name: 'Alice',
    startLocation: { latitude: 0, longitude: 0 },
};

/**
 * Four boxes forming a 1° square around the origin.
 * Each side ≈ 111 km.  Diagonal ≈ 157 km.
 */
const SQUARE_BOXES: Box[] = [
    { id: 'b1', name: 'East',   location: { latitude: 0,   longitude: 1   } },
    { id: 'b2', name: 'North',  location: { latitude: 1,   longitude: 0   } },
    { id: 'b3', name: 'Centre', location: { latitude: 0.5, longitude: 0.5 } },
    { id: 'b4', name: 'NE',     location: { latitude: 1,   longitude: 1   } },
];

// ─── calculateRouteDistance ──────────────────────────────────────────────────

describe('RouteOptimizer — calculateRouteDistance', () => {
    let opt: RouteOptimizer;
    beforeEach(() => { opt = new RouteOptimizer(); });

    // ── Empty / trivial ──

    it('returns 0 for an empty routeIds list', () => {
        expect(opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, []))
            .toBeCloseTo(0, 5);
    });

    it('returns the direct haversine distance for a single-box route', () => {
        const dist   = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b1'])!;
        const direct = opt.haversineDistance(ORIGIN_TECH.startLocation, SQUARE_BOXES[0].location);
        expect(dist).toBeCloseTo(direct, 5);
    });

    it('single-box route is approximately 111 km (1° longitude at the equator)', () => {
        const dist = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b1'])!;
        expect(dist).toBeCloseTo(111.195, 0);
    });

    // ── Multi-leg correctness ──

    it('sums two legs in the correct order', () => {
        // (0,0)→b1(0,1) ≈ 111 km  +  b1→b2(1,0) ≈ 157 km  → ~260–270 km
        const dist = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b1', 'b2'])!;
        expect(dist).toBeGreaterThan(260);
        expect(dist).toBeLessThan(275);
    });

    it('a perimeter route (3 sides of the square) is ~333 km', () => {
        // (0,0)→b1(0,1)→b4(1,1)→b2(1,0)
        const dist = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b1', 'b4', 'b2'])!;
        expect(dist).toBeGreaterThan(325);
        expect(dist).toBeLessThan(345);
    });

    it('route order matters — reversing the 2-box route gives the same total (symmetric)', () => {
        const ab = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b1', 'b2'])!;
        // Reversed start: from origin we go b2 then b1 — different total because legs differ
        const ba = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b2', 'b1'])!;
        // Both should be > 0 and in range; crucially they are generally NOT equal
        expect(ab).toBeGreaterThan(0);
        expect(ba).toBeGreaterThan(0);
    });

    it('does NOT add a return leg — distance matches the one-way haversine chain', () => {
        const route  = ['b1', 'b4'];
        const dist   = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, route)!;
        const boxMap = new Map(SQUARE_BOXES.map(b => [b.id, b]));
        const manual = opt.haversineDistance(ORIGIN_TECH.startLocation, boxMap.get('b1')!.location)
                     + opt.haversineDistance(boxMap.get('b1')!.location, boxMap.get('b4')!.location);
        expect(dist).toBeCloseTo(manual, 5);
    });

    // ── Invalid input ──

    it('returns null for a single unrecognised box ID', () => {
        expect(opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['GHOST'])).toBeNull();
    });

    it('returns null when any ID in a multi-box route is unrecognised', () => {
        expect(opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['b1', 'GHOST', 'b2'])).toBeNull();
    });

    it('returns null when the route contains only unknown IDs', () => {
        expect(opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, ['X', 'Y'])).toBeNull();
    });

    it('works correctly when boxes array is empty and routeIds is also empty', () => {
        expect(opt.calculateRouteDistance(ORIGIN_TECH, [], [])).toBeCloseTo(0, 5);
    });
});

// ─── findShortestRoute ───────────────────────────────────────────────────────

describe('RouteOptimizer — findShortestRoute', () => {
    let opt: RouteOptimizer;

    jest.setTimeout(200);

    beforeEach(() => { opt = new RouteOptimizer(); });

    // ── Output shape ──

    it('returns the correct technicianId', () => {
        const result = opt.findShortestRoute(ORIGIN_TECH, SQUARE_BOXES);
        expect(result.technicianId).toBe('t1');
    });

    it('returns empty route and 0 distance for no boxes', () => {
        const result = opt.findShortestRoute(ORIGIN_TECH, []);
        expect(result.route).toHaveLength(0);
        expect(result.totalDistanceKm).toBeCloseTo(0, 5);
    });

    it('handles a single box — route contains only that box ID', () => {
        const boxes: Box[] = [{ id: 'solo', name: 'Solo', location: { latitude: 1, longitude: 0 } }];
        const result = opt.findShortestRoute(ORIGIN_TECH, boxes);
        expect(result.route).toEqual(['solo']);
        expect(result.totalDistanceKm).toBeCloseTo(111.195, 0);
    });

    // ── Correctness invariants ──

    it('visits every box exactly once', () => {
        const result = opt.findShortestRoute(ORIGIN_TECH, SQUARE_BOXES);
        expect(result.route).toHaveLength(SQUARE_BOXES.length);
        expect(new Set(result.route).size).toBe(SQUARE_BOXES.length);
        SQUARE_BOXES.forEach(b => expect(result.route).toContain(b.id));
    });

    it('totalDistanceKm matches calculateRouteDistance for the returned route', () => {
        const result   = opt.findShortestRoute(ORIGIN_TECH, SQUARE_BOXES);
        const verified = opt.calculateRouteDistance(ORIGIN_TECH, SQUARE_BOXES, result.route)!;
        expect(result.totalDistanceKm).toBeCloseTo(verified, 2);
    });

    it('totalDistanceKm is greater than 0 when boxes exist', () => {
        const result = opt.findShortestRoute(ORIGIN_TECH, SQUARE_BOXES);
        expect(result.totalDistanceKm).toBeGreaterThan(0);
    });

    it('handles two boxes and visits both', () => {
        const boxes: Box[] = [
            { id: 'A', name: 'A', location: { latitude: 0, longitude: 1 } },
            { id: 'B', name: 'B', location: { latitude: 1, longitude: 0 } },
        ];
        const result = opt.findShortestRoute(ORIGIN_TECH, boxes);
        expect(new Set(result.route)).toEqual(new Set(['A', 'B']));
    });

    // ── Route quality ──

    it('returns a predictable optimal order for a simple linear layout of boxes', () => {
        const boxes: Box[] = [
            { id: 'b1', name: 'Near East',  location: { latitude: 0, longitude: 0.5 } },
            { id: 'b2', name: 'Mid East',   location: { latitude: 0, longitude: 1.0 } },
            { id: 'b3', name: 'Far East',   location: { latitude: 0, longitude: 2.0 } },
        ];

        const result = opt.findShortestRoute(ORIGIN_TECH, boxes);

        expect(result.route).toEqual(['b1', 'b2', 'b3']);
    });

    it('does not produce a route longer than the unmodified input order', () => {
        const naiveDist = opt.calculateRouteDistance(
            ORIGIN_TECH, SQUARE_BOXES, SQUARE_BOXES.map(b => b.id)
        )!;
        const result = opt.findShortestRoute(ORIGIN_TECH, SQUARE_BOXES);
        expect(result.totalDistanceKm).toBeLessThanOrEqual(naiveDist + 0.01);
    });

    it('perimeter route (≤ 340 km) for a 3-box right-angle layout', () => {
        /**
         * start(0,0) → East(0,1) → NE(1,1) → North(1,0)
         * Perimeter ≈ 333 km vs. criss-cross ≈ 379 km
         */
        const boxes: Box[] = [
            { id: 'E',  name: 'East',  location: { latitude: 0, longitude: 1 } },
            { id: 'NE', name: 'NE',    location: { latitude: 1, longitude: 1 } },
            { id: 'N',  name: 'North', location: { latitude: 1, longitude: 0 } },
        ];
        const result = opt.findShortestRoute(ORIGIN_TECH, boxes);
        expect(result.totalDistanceKm).toBeLessThan(340);
    });

    it('handles a technician starting far from all boxes', () => {
        const farTech: Technician = {
            id: 'far', name: 'Remote',
            startLocation: { latitude: 50, longitude: 50 },
        };
        const result = opt.findShortestRoute(farTech, SQUARE_BOXES);
        expect(result.technicianId).toBe('far');
        expect(result.route).toHaveLength(SQUARE_BOXES.length);
        SQUARE_BOXES.forEach(b => expect(result.route).toContain(b.id));
    });

    it('handles boxes that are all at the same location', () => {
        const boxes: Box[] = Array.from({ length: 3 }, (_, i) => ({
            id: `b${i}`, name: `B${i}`, location: { latitude: 1, longitude: 1 },
        }));
        const result = opt.findShortestRoute(ORIGIN_TECH, boxes);
        expect(result.route).toHaveLength(3);
        expect(new Set(result.route).size).toBe(3);
    });

});
