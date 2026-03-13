import { RouteOptimizer, Box, Technician } from '../../src/routeOptimizer';

// Load / performance tests for Challenge 1 (run separately from unit tests).

const ORIGIN_TECH: Technician = {
    id: 't1',
    name: 'Alice',
    startLocation: { latitude: 0, longitude: 0 },
};

describe('RouteOptimizer — load tests', () => {
    let opt: RouteOptimizer;

    jest.setTimeout(5000);

    beforeEach(() => { opt = new RouteOptimizer(); });

    it('load — 20 boxes: visits all exactly once, distance verified', () => {
        const boxes: Box[] = Array.from({ length: 20 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: Math.sin(i * 0.7) * 10, longitude: Math.cos(i * 0.7) * 10 },
        }));
        const result   = opt.findShortestRoute(ORIGIN_TECH, boxes);
        const verified = opt.calculateRouteDistance(ORIGIN_TECH, boxes, result.route)!;
        expect(result.route).toHaveLength(20);
        expect(new Set(result.route).size).toBe(20);
        expect(result.totalDistanceKm).toBeCloseTo(verified, 1);
    });

    it('load — 50 boxes: no duplicates or omissions', () => {
        const boxes: Box[] = Array.from({ length: 50 }, (_, i) => ({
            id: `box_${i}`, name: `Box ${i}`,
            location: { latitude: (i % 10) * 1.0, longitude: Math.floor(i / 10) * 1.0 },
        }));
        const result = opt.findShortestRoute(ORIGIN_TECH, boxes);
        expect(result.route).toHaveLength(50);
        expect(new Set(result.route).size).toBe(50);
        boxes.forEach(b => expect(result.route).toContain(b.id));
    });

    it('load — 1000 boxes: distance matches calculateRouteDistance within 2s', () => {
        const boxes: Box[] = Array.from({ length: 1000 }, (_, i) => ({
            id: `b${i}`, name: `Box ${i}`,
            location: { latitude: Math.sin(i * 0.3) * 15, longitude: Math.cos(i * 0.3) * 15 },
        }));

        const start = Date.now();
        const result   = opt.findShortestRoute(ORIGIN_TECH, boxes);
        const verified = opt.calculateRouteDistance(ORIGIN_TECH, boxes, result.route)!;
        const elapsedMs = Date.now() - start;

        expect(result.route).toHaveLength(1000);
        expect(result.totalDistanceKm).toBeCloseTo(verified, 1);
        expect(elapsedMs).toBeLessThan(2000); // fail if it takes ≥ 2 seconds
    });
}

