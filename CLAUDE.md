# solix-api

npm package `@t21n/solix-api` — TypeScript wrapper for the Anker Solix API.

## Commands

```bash
npm run clean      # npm install (resets node_modules)
npm run build      # tsc — compiles to dist/
npm run test       # lint only (tsc --noEmit + eslint)
npm run lint       # tsc --noEmit && eslint src test
npm run lint:fix   # eslint --fix src test
npm run e2e        # jest (all tests including unit and e2e)
```

Run unit tests only (no Anker credentials needed):
```bash
npm run e2e -- --testPathPattern=unit
```

## Test structure

- `test/unit/` — unit tests, fully mocked, no network calls
  - `api.unit.spec.ts` — SolixApi class (login, withLogin, crypto, request shaping)
  - `logger.unit.spec.ts` — consoleLogger verbose/silent behavior
  - `scenInfo.unit.spec.ts` — scenInfo fixture-based tests (offline vs online-no-pv)
- `test/fixtures/` — real API response snapshots
  - `scene_info_offline.json` — device offline (`status="0"`, `is_display_data=false`, epoch `updated_time`)
  - `scene_info_online_no_pv.json` — device online, no solar (`status="1"`, `is_display_data=true`, `charging_status="7"`)
- `test/login.e2e.spec.ts` — real Anker API login test; needs `ANKER_USERNAME`, `ANKER_PASSWORD`, `ANKER_COUNTRY` exported into the shell

## Anker API constraints

**Do not run e2e tests in parallel.** The Anker API rate-limits concurrent logins from the same account — a second simultaneous login returns `{ data: null }` (HTTP 200, no error thrown). This is why CI e2e only runs on a single Node version (24). If the account gets rate-limited, wait ~15–60 min before retrying.

To run e2e locally, export the env vars first:
```bash
export $(cat .env | xargs)
npm run e2e -- --testPathPattern=login
```

## Known bug: energyAnalysis date formatting

`energyAnalysis()` uses `getUTCMonth()` which is 0-indexed. January produces `"2024-00-15"` instead of `"2024-01-15"`. This bug exists in both solix-api and solix-exporter and the unit tests document the actual (buggy) behavior intentionally.

## Key interface notes

- `ScenInfo.solarbank_info.is_display_data: boolean` — primary signal for whether the device has live data. `false` = offline/system issue, `true` = online.
- `Solarbank.is_display: boolean` — per-device equivalent of `is_display_data`.
- `Solarbank.main_version: string` — typed as `string` (not `` `${number}` ``) because the API returns `""` for newer devices (Solarbank 2 E1600 Pro).
- `ScenInfo.solarbank_info.output_power` — optional; absent from newer API responses.

## Publishing

Scoped package requires `publishConfig: { access: "public" }` in `package.json` (already set). The `package` CI job uses `actions/setup-node` with `registry-url: 'https://registry.npmjs.org'` so that `NODE_AUTH_TOKEN` is wired automatically — do not remove that option or npm auth will break.

Releases are triggered via the `release.yml` workflow dispatch (`Create release`). The `build.yml` `package` job also publishes on tag push as a fallback.
