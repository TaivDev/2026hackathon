# Bar Screen Ad Scheduling

A simulated ad scheduling system for screens across multiple areas in a venue, such as the main hall, bar, and patio. Your team is implementing test driven development and as such they have written tests to outline all of the required functionality. Your task is to implement the core classes and functions that validate ad placements, calculate revenue, compare schedules, and build an optimized ad schedule.

**DO NOT modify any of the test files or any of the function signatures.** When evaluating we will be running tests to check for valid implementations, and your score on this section will be proportional to the amount of tests that pass relative to other teams.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

Tests are located in the `tests/` folder. Your goal is to make all tests pass by implementing the functionality in the `src/` folder.

---

## Your Challenge

You need to implement three classes. The method signatures and interfaces are already defined—you just need to fill in the logic.

### 1. PlacementEngine (`src/placementEngine.ts`)

Handles core ad placement validation and basic revenue calculations.

**Data Model:**
```typescript
interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: int;
    timeout: int;
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
```

**Methods to Implement:**

| Method | Description |
|--------|-------------|
| `isAdCompatibleWithArea(ad, area)` | Return `true` if the ad is allowed to be played in the area, otherwise `false`. |
| `getTotalScheduledTimeForArea(areaSchedule)` | Return the total scheduled time for all ads in one area. |
| `doesPlacementFitInAreaWindow(ad, area, areaSchedule, startTime)` | Return `true` if the ad placed at `startTime` would fully fit within the area's time window. |
| `isAdAlreadyScheduled(adId, schedule)` | Return `true` if the ad has already been scheduled anywhere in the full schedule. |
| `canScheduleAd(ad, area, schedule, startTime)` | Return `true` only if the ad is compatible with the area, not already scheduled, and fits inside the area's available time window. |
| `isAreaScheduleValid(area, areaSchedule, ads)` | Return `true` if the area schedule is valid. Ads must not overlap, total scheduled time must not exceed the area's time window, and every scheduled ad must be allowed in that area's location. |

---

### 2. RevenueEngine (`src/revenueEngine.ts`)

Handles advertiser-based scoring rules, diminishing returns, and schedule comparisons.

**Data Model:**
```typescript
interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: int;
    timeout: int;
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
```

**Methods to Implement:**

| Method | Description |
|--------|-------------|
| `getAdvertiserScheduleCount(advertiserId, ads, schedule)` | Return how many scheduled ads belong to the given advertiser across the full schedule. |
| `calculateDiminishedRevenue(baseRevenue, advertiserScheduledCount, decayRate)` | Return the reduced revenue after applying diminishing returns based on how many ads from that advertiser have already been scheduled. |
| `calculatePlacementRevenue(ad, area, ads, schedule, decayRate)` | Return the final revenue for placing one ad in one area, including diminishing returns. |
| `getAdvertiserDiversity(ads, schedule)` | Return the number of unique advertisers represented in the schedule. |
| `compareSchedules(ads, areas, scheduleA, scheduleB, decayRate)` | Compare two valid schedules. Prefer higher total revenue. If tied, prefer less unused time. If still tied, prefer greater advertiser diversity. Return a positive number if `scheduleA` is better, a negative number if `scheduleB` is better, or `0` if they are equivalent. |

---

### 3. Scheduler (`src/scheduler.ts`)

Builds candidate placements and generates an optimized schedule.

**Data Model:**
```typescript
interface Ad {
    adId: string;
    advertiserId: string;
    timeReceived: int;
    timeout: int;
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
```

**Methods to Implement:**

| Method | Description |
|--------|-------------|
| `getNextAvailableStartTime(areaSchedule)` | Return the earliest free start time in the given area schedule. If there is a gap between scheduled ads, return the start of that gap. If the schedule is empty, return `0`. |
| `isValidSchedule(schedule, areas, ads)` | Return `true` if the full schedule is valid across all areas. A valid schedule must not schedule the same ad more than once, every area schedule must be valid, and all scheduled ads must fit within the required timing and area constraints. |
| `getAreaRevenue(area, fullSchedule, ads, decayRate)` | Return the total revenue generated by the given area using the full schedule, ad list, and decay rate. Revenue should account for the area's multiplier and diminishing returns for advertisers based on all ads scheduled in the full schedule. |
| `buildSchedule(ads, areas, decayRate)` | Build and return a complete schedule across all areas while respecting all scheduling constraints. Your implementation should aim to maximize total revenue. |

---

## Scheduling Rules

Your implementation must respect the following rules:

- Each ad may only appear once in your schedule, and you are not required to schedule every ad.
- An ad can only start between timeReceived and timeReceived + timeout.
- Each ad runs for duration time units once scheduled.
- Only one ad may run in a location at any given time, but ads may run simultaneously in different locations.
- Ads cannot be placed in locations listed in their bannedLocations field.
- Each area has its own fixed scheduling time window.

- The goal is to maximize total profit, calculated as profit × locationMultiplier for the location where the ad runs.
- If multiple ads from the same advertiser are scheduled, later ads from that advertiser earn reduced revenue.
- If two schedules have the same total revenue, the better one is the one with less unused time across all areas.
- If revenue and unused time are tied, the better schedule is the one with greater advertiser diversity.

---

## Test Coverage

The test suite includes:

- **Unit tests** for each method
- **Validation tests** for compatibility, scheduling rules, and time window checks
- **Revenue tests** for base revenue, diminished revenue, and advertiser diversity
- **Comparison tests** for tie-break behavior between schedules
- **Optimization tests** for candidate generation and best-placement selection
- **Load tests** with large ad lists to ensure your implementation scales

Run `npm run test` to test out your implementation.

---

## Project Structure

```text
bar_screen_ad_scheduling/
├── src/
│   ├── placementEngine.ts   # Implement placement validation + base revenue helpers
│   ├── revenueEngine.ts     # Implement advertiser scoring + schedule comparison
│   └── scheduler.ts         # Implement candidate generation + optimized scheduling
├── tests/
│   ├── placementEngine.test.ts
│   ├── revenueEngine.test.ts
│   └── scheduler.test.ts
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## Tips

1. **Run tests frequently** with `npm test` to check your progress
2. **Read the test file** if you're unsure what a method should do
3. **Don't modify the interfaces** — the tests expect specific signatures

