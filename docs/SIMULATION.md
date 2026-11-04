# Simulation model, version 2

This is an intentionally small, fictional model. Worker types and numerical reliability values are game balancing parameters, not measurements of real developers or AI systems.

## Determinism

The seed string is hashed with a 32-bit FNV-style accumulator. Simulation randomness uses a saved xorshift32 state. Neither wall-clock time nor browser animation changes the model. Calls to `act(state, action)` and `tick(state, count)` mutate the supplied state. UI speed controls only determine how often ticks are invoked.

One tick is one working hour. A day contains eight ticks. At each tick, the engine handles due warranty claims, then traverses stations in insertion order, then charges daily operating costs when appropriate, refreshes offers every 16 hours, evaluates end conditions, and presents scheduled events.

## Dispatch and transport

Jobs move through `spec`, `build`, `review`, and `ship`. A staffed idle station selects a queued job of its type: warranty jobs first, then the earliest deadline. It reserves that job while it travels. Transport takes `max(1, ceil(Manhattan distance / 3))` hours, or distance divided by 4 for Night Owls. Initial packages enter at tile `(0, 1)`.

A completed stage becomes eligible at the next tick. Processing begins when its transit deadline arrives. A busy station cannot be moved or have its worker or policy changed. Station insertion order resolves ties deterministically.

The belts in the illustration connect each station to its nearest downstream counterpart. They visualize the general flow; actual dispatch can choose a different available station. Transport is priced by distance and does not simulate belt collisions or physical pathfinding. Stations do not block travel.

## Work and quality

Base throughput: developer 1.3, agent 2.0, QA engineer 1.15 work units/hour. Developers get a 1.2× discovery/shipping multiplier; QA engineers get 1.65× review throughput. Equipment level adds `0.35 × (level − 1)` to the base multiplier. Wear multiplies throughput by `1 − wear / 180`. Build debt multiplies by `1 − debt / 160`. Rush build adds a 1.55× multiplier. Thorough review multiplies by 0.72. Positive staffed throughput is floored at 0.15.

Discovery multiplies ambiguity by 0.2 with a developer and 0.55 otherwise. On build completion, defect probability is:

```text
clamp(1 − worker reliability + ambiguity + debt / 250 + rush penalty, 0.02, 0.90)
```

Reliability is 0.90 for developers, 0.67 for agents, and 0.97 for QA engineers. Rush penalty is 0.22. Each completed balanced build adds 1.2 debt; a rush build adds 6. Debt is bounded to 0–100.

Thorough review detects defects with 0.92 probability; quick review with 0.58. A QA engineer adds 0.07; Craft Club adds 0.04. The combined chance is capped at 0.99. Detected defects return to build with 45% of ordinary build effort. Subsequent review and shipping use normal effort. Rebuilds may introduce another defect.

The challenging scenario multiplies all ordinary stage effort and rebuild effort by 1.45. Warranty jobs start with five build units, then follow scenario-adjusted review and shipping. Once a warranty repair ships, it is considered resolved; it does not generate recursive warranty claims.

## Economy

Daily costs are all worker wages plus $25 rent and $4 per workstation. Bootstrappers multiply the total crew wages by 0.85, rounded up, before adding rent and station costs. There is no cost per model request and no actual provider connection. All money is simulated.

On-time delivery pays the offered amount, adds 6 reputation, and increments the shipping streak. Its bonus is `min(max(streak - 1, 0), 4) × $50`. Late deliveries and arriving warranty claims reset the streak. Warranty repairs do not increment it. Late delivery pays 70%, rounded down, and removes 4 reputation. Cancellation costs $100 and 8 reputation. An escaped defect schedules one claim 12 hours later; the claim costs $180 and 12 reputation. Repair completion restores 3 reputation.

Maintenance resets one station's wear and removes 10 global debt after four hours, for $100. Cleanup events may also reduce debt. New stations cost their catalog amount; selling returns half the base cost. Upgrades are not refunded.

## Events and endings

Events arrive every 48 working hours, cycling through scope, outage, cleanup, and rush-offer decisions. If a scope event has no active client, a cleanup event is used instead. An event halts ticks until resolved. Insufficient cash disables paid choices; a free response remains available.

Campaign victory is checked after processing and payroll: required deliveries, reputation at least 45, cash at least zero, no active jobs, and no pending warranty claims. Victory may occur before the last campaign day. Cash below −$500 loses immediately; reaching the time limit without satisfying victory loses. Sandbox has neither ending condition.

Score is `max(0, round(deliveries × 1000 + reputation × 20 + cash × 0.2 − escaped × 250 − late × 100))`. It is a local comparison aid, not a secure leaderboard.

## Persistence and trust

Save files store all model state, including RNG, queued decisions, jobs in transit, costs, and bounded history. Validation checks version, primitive types, finite numeric ranges, integer grid coordinates, identifiers, collection bounds, unique assignments, required stages, and job/station references before installing imported state.

Files may be user-edited. Validation preserves the program's structural invariants; it does not prove that money, scores, or outcomes were earned legitimately. Game text from imports is escaped before HTML rendering. This is a standalone static application, with no account or server-side data store.

## Studio specialties, coffee, and trophies

Craft Club adds a 1.15× discovery throughput multiplier. Night Owls add a 1.25× shipping multiplier. Bootstrappers receive the wage discount above. Imported version-1 factories use the Original crew with original work rates, plus the new optional coffee and streak rules. Migration preserves existing cash, crew, layout, jobs, and RNG state; it does not promise identical future outcomes across game versions.

Coffee costs $80 and multiplies throughput by 1.35 during the next four processing ticks. It becomes available again 16 ticks after purchase. All clocks advance with simulation time, so pausing does not use the boost or shorten the cooldown. Buying during transit or an empty floor can waste the benefit.

Six trophies are earned once per run. They record the first paid delivery, three consecutive on-time deliveries, three caught defects, owning six stations simultaneously, completing maintenance that reduces positive debt to zero, and winning a campaign. Trophies survive exports and imports, but are not shared across factories. Migrated saves start an empty collection.
