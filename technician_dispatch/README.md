# 🛠️ Technician Dispatch — Hackathon Challenge

A route-planning and scheduling system for field technicians repairing broken boxes. Three progressive challenges — each adds a new real-world constraint on top of the last.

---

## Getting Started

```bash
npm install
npm test
npm run test:coverage   # optional — shows which lines your code covers
npm run test:load       # to run the load tests
```

Tests live in `tests/`. Your implementations go in `src/`. **Do not modify test files or method signatures.**

Your score is proportional to the number of tests that pass. On the load tests, solutions that produce better results (shorter routes, more boxes fixed) will rank higher than solutions that merely pass.

---

## Project Structure

```
technician_dispatch/
├── src/
│   ├── routeOptimizer.ts   ← Challenge 1
│   ├── dayPlanner.ts       ← Challenge 2
│   └── teamSizer.ts        ← Challenge 3
├── tests/
│   ├── routeOptimizer.test.ts
│   ├── dayPlanner.test.ts
│   └── teamSizer.test.ts
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## Challenge 1 — Shortest Route (`routeOptimizer.ts`)

> *One technician. Every box must be visited. Find the shortest path.*

A technician starts at a known GPS location and must visit every broken box exactly once. Your task: minimise the total travel distance.

### Pre-implemented

`haversineDistance(loc1, loc2)` — great-circle distance in km. Use this freely.

### What you implement


| Method                                          | Description                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `calculateRouteDistance(tech, boxes, routeIds)` | Total km for a given box ordering. Return `null` for unknown IDs, `0` for an empty list. |
| `findShortestRoute(technician, boxes)`          | Shortest route visiting every box exactly once.                                          |


### Hints

`calculateRouteDistance`: Walk `routeIds` in order. Start at `technician.startLocation`, add `haversineDistance` for each leg. Return the running total. 

`findShortestRoute`: Nearest-neighbour greedy type algorithm? On the load tests, your implementation is expected to complete within **≈3 seconds**; extremely slow (e.g. fully brute-force) solutions may not finish in time.

---

## Challenge 2 — Maximum Boxes in a Day (`dayPlanner.ts`)

> *One technician. Limited hours. Travelling costs time. Fix as many boxes as possible.*

The technician has a fixed working budget in minutes. Boxes have different repair times and GPS locations. Travelling burns budget too. Choose **which** boxes to visit and in **what order** to fix as many as possible before time runs out.

### The key trade-off

```
Box CLOSE  — 1 km away, fix time = 400 min  →  uses almost all budget → 1 box
Box FAR_1  — 56 km away, fix time = 60 min  ┐
Box FAR_2  — 67 km away, fix time = 60 min  ┘  total ≈ 187 min → 2 boxes
```

A "nearest-first" strategy picks CLOSE and leaves the technician stuck. Your algorithm must weigh both travel **and** fix time together.

### Pre-implemented

`haversineDistance`, `travelTimeMinutes` — use these freely.

### What you implement


| Method                                          | Description                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `calculateRouteDuration(tech, boxes, routeIds)` | Total minutes (travel + fix) for a given ordering.                      |
| `planDay(technician, boxes)`                    | Choose which boxes to visit and in what order to maximise `boxesFixed`. |


### Hints

`calculateRouteDuration`: Same pattern as Challenge 1 but accumulate `travelTimeMinutes + fixTimeMinutes` per box.

`planDay`: Similar greedy approach from problem 1 could work! On the load tests (up to 1000 boxes), your implementation is expected to return a plan within **≈3 seconds**; favour heuristics over exhaustive search.

---

## Challenge 3 — Minimum Team Size (`teamSizer.ts`)

> *All boxes must be fixed by a deadline. What is the fewest technicians you need?*

All technicians start from the **same location**. Each box is assigned to **exactly one** technician. Every technician must finish all their assigned boxes within `deadlineMinutes`. Find the **minimum number of technicians** to achieve this.

### Pre-implemented

`haversineDistance`, `travelTimeMinutes` — use these freely.

### What you implement


| Method                                                       | Description                                                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `calculateAssignmentDuration(start, speed, boxes, routeIds)` | Total minutes for one technician's ordered list of boxes.                                                     |
| `tryAssign(start, speed, boxes, numTechnicians, deadline)`   | Can `numTechnicians` technicians cover all boxes on time? Return the assignment plan or `null` if infeasible. |
| `findMinimumTeamSize(start, speed, boxes, deadline)`         | Find the smallest N and return the full plan.                                                                 |


### Hints

`tryAssign`: bin-packing approach.

`findMinimumTeamSize`: Use `tryAssign` as your yes/no oracle. Try N = 1, 2, 3, … until it returns non-null. The first N that works is your answer. As with the other challenges, aim for an implementation that completes the load tests within **≈3 seconds** by avoiding combinatorial explosion.

---

## General Tips

- If a test fails, read its description — the comments explain exactly what scenario is being tested.
- Tackle the methods in the order they appear. Each method in a challenge uses the ones above it.

