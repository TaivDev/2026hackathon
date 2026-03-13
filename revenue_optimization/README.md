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

## Data Model

These are all the data models you will need:

```typescript
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
```

**Schedule structure:** The keys of a `Schedule` are area IDs (`areaId`). A valid schedule may only use keys that appear in the provided `areas` list. Each `ScheduledAd.areaId` must equal the key of the array it appears in.

**Time semantics:** `startTime` is **inclusive** and `endTime` is **exclusive**.

- An ad with `startTime: 0` and `endTime: 10` plays during time units 0, 1, 2, …, 9 (10 units). It does **not** play during time unit 10.
- If an ad **ends at time unit 10** (i.e. has `endTime: 10`), it plays up to but not including 10, so the next ad **can start at time unit 10**.
- Duration in time units is `endTime - startTime`.
- Two ads in the same area do not overlap if the first has `endTime: E` and the next has `startTime >= E`.
- The area time window is from time `0` up to but not including `area.timeWindow` (i.e. valid start times are in `[0, area.timeWindow)` for the ad to fit).

### 1. PlacementEngine (`src/placementEngine.ts`)

Handles ad placement validation, schedule checks, and time-window checks.

**Methods to Implement:**

| Method | Description |
|--------|-------------|
| `isAdCompatibleWithArea(ad, area)` | Return `true` if the ad is allowed to be played in the area, otherwise `false`. Use exact string matching for banned locations. |
| `getTotalScheduledTimeForArea(areaSchedule)` | Return the total scheduled time for all ads in one area. This should be the sum of each scheduled ad’s duration (`endTime - startTime`), not the full span from first start to last end. |
| `doesPlacementFitTimingConstraints(ad, area, startTime)` | Return `true` only if the ad can start at `startTime`, starts within its allowed availability window, and fully fits within the area’s time window. |
| `isAdAlreadyScheduled(adId, schedule)` | Return `true` if the ad has already been scheduled anywhere in the full schedule. |
| `canScheduleAd(ad, area, schedule, startTime)` | Return `true` only if the ad is compatible with the area, not already scheduled anywhere, does not overlap an existing ad in that area, and fits within all required timing constraints. |
| `isAreaScheduleValid(area, areaSchedule, ads)` | Return `true` if the area schedule is valid. Ads must not overlap, every scheduled ad must exist in the ads list, every scheduled ad must be allowed in that area’s location, and every scheduled ad must fit within the area’s time window. |

---

### 2. RevenueEngine (`src/revenueEngine.ts`)

Handles advertiser-based scoring rules, diminishing returns, and schedule comparisons.

**Methods to Implement:**

| Method | Description |
|--------|-------------|
| `getAdvertiserScheduleCount(advertiserId, ads, schedule)` | Return how many scheduled ads belong to the given advertiser across the full schedule. Return `0` if the advertiser is not in the ads list or has no scheduled ads. |
| `calculateDiminishedRevenue(baseRevenue, advertiserScheduledCount, decayRate)` | Return the reduced revenue after applying diminishing returns. Use the advertiser’s scheduled count to determine how many times decay should be applied. When `advertiserScheduledCount` is `0`, treat the placement as the first (k=1), so the multiplier is 1 and the result is full `baseRevenue`. |
| `calculatePlacementRevenue(ad, areas, ads, schedule, decayRate)` | Return the final revenue for placing one ad in one area, including the area’s multiplier and advertiser decay. |
| `getAdvertiserDiversity(ads, schedule)` | Return the number of unique advertisers represented in the schedule. |
| `getAreaRevenue(area, fullSchedule, ads, decayRate)` | Return the total revenue generated by the given area using the full schedule, ad list, and decay rate. Revenue must account for the area’s multiplier and advertiser decay based on the full schedule, not just the target area. Return `0` when the given area's `areaId` is not a key in the schedule. |

---

### 3. Scheduler (`src/scheduler.ts`)

Builds and evaluates schedules across all areas.

**Methods to Implement:**

| Method | Description |
|--------|-------------|
| `getNextAvailableStartTime(areaSchedule)` | Return the earliest free start time in the given area schedule. If there is a gap between scheduled ads, return the start of the earliest gap. If the schedule is empty, return `0`. |
| `isValidSchedule(schedule, areas, ads)` | Return `true` if the full schedule is valid across all areas. A valid schedule must not schedule the same ad more than once, must not contain unknown area keys, each scheduled ad’s `areaId` must match the area bucket it is inside, and every area schedule must satisfy all timing and placement rules. |
| `compareSchedules(ads, areas, scheduleA, scheduleB, decayRate)` | Compare two valid schedules. Prefer higher total revenue. If tied, prefer less unused time. If still tied, prefer greater advertiser diversity. Return a positive number if `scheduleA` is better, a negative number if `scheduleB` is better, or `0` if they are equivalent. |
| `buildSchedule(ads, areas, decayRate)` | Build and return a complete schedule across all areas while respecting all scheduling constraints. Your implementation should aim to maximize total revenue. |

---

## Scheduling Rules

Your implementation must respect the following rules:

- Each ad may only appear once in your full schedule.
- You are not required to schedule every ad.
- An ad can only start between `timeReceived` and `timeReceived + timeout` (inclusive on both ends).
- Each ad runs for exactly `duration` time units once scheduled.
- Only one ad may run in an area at any given time.
- Ads may run simultaneously in different areas.
- Ads cannot be placed in locations listed in their `bannedLocations` field.
- Each area has its own fixed scheduling time window.
- A valid schedule must not contain unknown area keys.
- A scheduled ad’s `areaId` must match the schedule bucket it appears in.

### Revenue Rules

- The base placement revenue for an ad is:

```text
baseRevenue × area.multiplier
```

- If multiple ads from the same advertiser are scheduled, later ads from that advertiser earn reduced revenue.
- The first scheduled ad from an advertiser earns full revenue.
- For the k-th scheduled ad from the same advertiser in the global decay ordering, apply a decay multiplier of:

`decayRate^(k - 1)`

- When `decayRate` is `1`, there is no decay: use multiplier `1` for every scheduled ad (all earn full raw revenue).
- When `decayRate` is `0`, only the first scheduled ad from each advertiser earns revenue; subsequent ads from the same advertiser get multiplier `0` (formula: `0^(k-1)` gives 1 for k=1, 0 for k≥2).
- For example, if `decayRate = 0.5`, then the first ad gets full revenue, the second gets multiplied by `0.5`, and the third gets multiplied by `0.25`.

### Decay Ordering Rule

When calculating advertiser decay, sort all scheduled ads from the same advertiser across all areas using this order:

1. `startTime` ascending
2. raw placement revenue ascending (`baseRevenue × area.multiplier`) — lower revenue first
3. lexicographically smaller `adId`

This ordering must be deterministic.

### Schedule Comparison Rules

**Unused time** for a schedule is the sum over every area of `area.timeWindow` minus the total scheduled duration in that area (sum of `endTime - startTime` for that area's scheduled ads). Less unused time is better.

If two schedules have the same total revenue:

1. prefer the schedule with less unused time across all areas
2. if still tied, prefer the schedule with greater advertiser diversity
3. if still tied, treat them as equivalent

---

## Assumptions

- All ads are provided upfront before scheduling begins.
- All areas are provided upfront before scheduling begins.
- All IDs are unique within their own type.
- `timeReceived`, `timeout`, `duration`, `startTime`, and `endTime` are measured in the same time units.
- `duration` is positive.
- `baseRevenue` is non-negative.
- `multiplier` is positive.
- `decayRate` is expected to be between `0` and `1`, inclusive.
- Touching boundaries are allowed. For example, one ad ending at time `10` and another starting at time `10` in the same area is valid.
- Input schedules may be unsorted. Validation logic should still handle them correctly.
- Each area’s schedule must stay within the time range from `0` to `area.timeWindow`, an ad's endTime must be ≤ area.timeWindow (endTime is exclusive).
- All outputs must be deterministic.

---

## Constraints

- **Single-use ads:** An ad may only be scheduled once across the entire schedule.
- **Area compatibility:** Ads may not be placed in banned locations.
- **Area timing:** An ad must fully fit inside the target area’s time window.
- **Ad timing:** An ad must start within its own allowed availability window.
- **No overlap:** Ads in the same area may not overlap.
- **Decay across full schedule:** Advertiser repetition is determined globally across all areas, not locally per area.
- **Deterministic scoring:** Revenue calculations and schedule comparisons must always produce the same result for the same inputs.

---

## Test Coverage

The test suite includes:

- **Unit tests** for each method
- **Validation tests** for compatibility, scheduling rules, and time window checks
- **Revenue tests** for advertiser counts, diminished revenue, diversity, and area revenue calculation
- **Scheduler tests** for free-slot detection, schedule validity, and schedule comparison
- **Load tests** with larger ad lists and schedules to ensure your implementation scales

Run `npm test` to test out your implementation.

---

## Project Structure

(The root folder may be named `revenue_optimization` or similar.)

```text
revenue_optimization/
├── src/
│   ├── placementEngine.ts   # Implement placement validation and area schedule checks
│   ├── revenueEngine.ts     # Implement advertiser scoring and schedule comparison
│   └── scheduler.ts         # Implement schedule validation, area revenue, and final scheduling
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
2. **Read the test file** if you’re unsure what a method should do
3. **Don’t modify the interfaces or function signatures** — the tests expect specific signatures
4. **Keep your logic deterministic** — tie-breaking and decay ordering matter

