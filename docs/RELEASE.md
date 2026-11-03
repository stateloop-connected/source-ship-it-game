# Release checklist

## Source and deterministic model

- `npm ci`
- `npm run check`
- `git diff --check`
- Review changes to RNG, tick ordering, save structure, and scenario balance.
- Confirm no credentials, local account paths, private business data, or generated browser profiles are included.

## Browser acceptance

Use the production build with `npm run preview`, not only the development server.

- New run, scenario selection, seed entry, and saved-run continuation.
- Accept contracts and complete a real delivery through the UI.
- Place a station, hire crew, assign them, upgrade, adjust policy, move, maintain, and sell an extra idle station.
- Pause, step, speed changes, keyboard controls, and event decisions.
- Export and import an active run; reject a damaged save without replacing it.
- Verify a campaign victory, loss, and persistent sandbox run.
- Check desktop, tablet, 390px phone, and 320px narrow layouts for page overflow.
- Confirm reduced motion, sound toggle, station list, and keyboard focus.
- Check browser console errors and failed asset requests.

## Publication

The `Release site` workflow builds and tests on pull requests. Pushes to `main` also deploy the static `dist/` directory to GitHub Pages. Pages must be configured to use GitHub Actions.

After deployment, verify the exact remote commit and successful workflow. Open the public site, check a real game interaction, and confirm the served assets correspond to the release. A successful local build does not establish public deployment.

Tag a verified release and include the production site archive and its SHA-256 checksum. Keep the shipped application's revision distinct from later documentation updates.
