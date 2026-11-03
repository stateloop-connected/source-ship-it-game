# Contributing

Thanks for helping this little factory ship better work.

1. Fork the repository and create a branch.
2. Run `npm ci` and `npm run dev` with Node.js 22.12+ (CI uses Node 24).
3. Make one focused change, run `npm run format`, then run `npm run check`.
4. For UI changes, verify desktop and narrow mobile widths, keyboard controls, and reduced motion.
5. Explain the behavior change and the checks you performed in the pull request.

## Good first contributions

- New fictional customers and contract copy in `src/data.js`.
- Additional scenarios with a clear, tested balancing goal.
- Improvements to keyboard navigation, readability, and touch controls.
- Original machine art or optional synthesized sound effects.
- Reproducible bug reports including scenario, seed, actions, and an exported save.

## Model rules

Keep simulation logic inside `engine.js`, independent of the DOM, wall clock, network, and audio. Random choices must use the state's seeded generator. Include a behavioral regression test for a simulation change. Update the model documentation when changing costs, probabilities, or timing.

Do not silently break version-1 saves. Add a migration or increment the save version and provide a clear message. Bound and validate new saved fields before accepting imports. Escape imported text in views.

Keep the game playable without third-party accounts, private repositories, real model calls, or paid services. New assets must be original or have a compatible license and attribution. Do not add analytics or telemetry without an explicit product discussion.

## Useful bug reports

Include the browser and device, game version, scenario and seed, expected result, observed result, and whether the issue survives a reload. Attach a save only if you are comfortable sharing its contents. Saves contain fictional game state and any seed or worker names supplied by the player.
