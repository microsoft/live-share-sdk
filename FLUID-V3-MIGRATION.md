# Supporting Fluid Framework v2 and v3 in the Live Share SDK

Status: **implemented and green on Fluid 3.0.1**
Branch: `user/jameshunt/2.0.0-internal.19`
Fluid Framework 3.0.0 published 2026-09-04 and is `latest` on npm.

## 0. Outcome

Implemented: CJS dropped, build and tests migrated to ESM/Node16, peer floor raised to 2.102,
`oldestSupportedClient` set to `"2.0.0"`.

Shipped as two stacked PRs:

1. **Drop CJS + migrate build/tests to ESM/Node16** - no Fluid version changes, verified on
   Fluid 2.110.0. This is a prerequisite: a CommonJS build cannot consume ESM-only Fluid 3.
2. **Support Fluid 3** - raise the floor to 2.102, add the `>=3.0.0 <3.10.0` clause, swap the
   container compatibility argument, and fix the two API breaks.

Splitting them isolates the module-system migration from the Fluid upgrade, so a failure in
one is diagnosable. Each was verified green independently.

### The 2.40 question

Raising the _peer_ floor to 2.102 does not drop support for Fluid 2.40 clients. The two knobs
are independent:

| Knob                    | Governs                                                        | Value                                 |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------- |
| Peer dependency range   | which Fluid a consumer installs to **build** against           | `>=2.102 <2.120 \|\| >=3.0.0 <3.10.0` |
| `oldestSupportedClient` | which Fluid clients can still **collaborate** on our documents | `"2.0.0"`                             |

`"2.0.0"` is lower than 2.40, so every 2.40-era client keeps working. Per Jason Hartman:
"since lowest compat was already 2.40, you could probably use `"2.40.0"` for oldest supported
client. But `"2.0.0"` is very safe." We use the safe value.

Verified on **Fluid 3.0.1** (resolved by `npm update` within the new range):

| Check                                     | Result     |
| ----------------------------------------- | ---------- |
| All 5 packages build (ESM only)           | pass       |
| `internal/test-utils` builds under Node16 | pass       |
| live-share tests                          | 81 passing |
| live-share-media tests                    | 57 passing |
| live-share-canvas tests                   | 17 passing |
| ESM usage test                            | pass       |
| All samples build                         | pass       |

The same set was also verified green on Fluid 2.110.0 before moving to 3.0.1, which isolates
the ESM/Node16 migration from the Fluid 3 upgrade.

Everything below records how each decision was reached.

Every claim below was verified empirically in isolated probes under `/tmp/ff3probe`
(Fluid 2.118.0 and 3.0.0 installed side by side; nothing was built inside this repo).
Where a claim is an inference rather than a measurement, it says so.

---

## 1. Executive summary

Supporting both v2 and v3 from one source tree **is feasible**, and the source-code delta is
a single symbol. The difficulty is not in our application code — it is that **Fluid 3 is
ESM-only**, and roughly half our build and test tooling is CommonJS with Node10 module
resolution.

| Area                                  | v2+v3 dual support  | Effort               |
| ------------------------------------- | ------------------- | -------------------- |
| Package source (`packages/*/src`)     | Yes                 | 1 symbol             |
| ESM build (`tsconfig.json`)           | Yes                 | none                 |
| TypeScript samples                    | Yes                 | none                 |
| **CJS build** (`tsconfig.cjs.json`)   | **No — impossible** | see §5               |
| **Test suite** (`tsconfig.test.json`) | Not as-is           | largest chunk        |
| **`internal/test-utils`**             | Not as-is           | 6 files / ~503 lines |

---

## 2. What we verified: the API delta is one symbol

Probe method: extracted **all 18 Fluid module specifiers** imported by `packages/*/src`,
with **all 90 named imports** taken verbatim from the source, aliased to suppress
duplicate-identifier noise, then compiled under our existing ESM tsconfig
(`module: Node16`, `moduleResolution: Node16`).

| Fluid version | `tsc` exit | Errors                                                                        |
| ------------- | ---------- | ----------------------------------------------------------------------------- |
| 2.118.0       | 0          | none                                                                          |
| 3.0.0         | 2          | **1** — `CompatibilityMode` is not exported by `@fluidframework/azure-client` |

Every `/legacy` and `/internal` entrypoint we depend on still exists in 3.0.

### v3 breaking changes and whether they affected us

The type-only probe described above under-reported: it verified that every _imported name_
still resolves, but not how those names are _used_. Two changes only surfaced during the real
build.

| Breaking change                                          | Affected us?                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Log level required on every telemetry event              | No — `LiveTelemetryLogger` already passed a `LogLevel` at all three `.send()` sites                                                                                                                                                     |
| **Deprecated log level aliases removed**                 | **Yes** — we used `LogLevel.default` and `LogLevel.error`, both removed. Replaced with `LogLevel.info` (both `20`) and `LogLevel.essential` (both `30`); values are identical and both names exist in 2.x and 3.x, so this is dual-safe |
| **Shared maps use Fluid-owned map types**                | **Yes** — `ISharedMap` now extends Fluid's `FluidMap` rather than the built-in `Map`, so `useSharedMap`'s public `(Map<string, TData> & SharedMap)` type is unsatisfiable. See below                                                    |
| Container/presence APIs use Fluid-owned collection types | No — we don't consume those APIs                                                                                                                                                                                                        |
| SharedTree deprecated API removals                       | No — we don't use the removed APIs                                                                                                                                                                                                      |
| `assert` export changes in `client-utils`                | No — we only import `TypedEventEmitter`, still exported                                                                                                                                                                                 |

#### `useSharedMap` public type change

`IUseSharedMapResults<TData>.sharedMap` changes from `(Map<string, TData> & SharedMap) | undefined`
to `SharedMap | undefined`. `FluidMap` cannot be named in its place because it does not exist in
Fluid 2.x, which we still support. Runtime behaviour is unchanged; consumers wanting value-typed
access should use the `getEntry` / `setEntry` callbacks.

This needs to be called out in the release notes, because it **loosens types rather than
breaking builds**: `ISharedMap.get` is declared `get<T = any>(key: string): T | undefined`, so
existing consumer code like `sharedMap.get(key)` still compiles but now yields `any` instead of
`TData`. Downstream type errors therefore disappear silently rather than surfacing at the call
site. Consumers should either pass the type argument explicitly (`sharedMap.get<TData>(key)`) or
switch to `getEntry`.

### The one required source change

`packages/live-share/src/internals/consts.ts:50`

```ts
export const FluidCompatibilityMode: CompatibilityMode = "2";
```

It is consumed positionally at six sites across `LiveShareClient.ts` and
`AzureLiveShareClient.ts`. It is internal (`@hidden`, not re-exported from `index.public.ts`
or `index.internal.ts`), so renaming it is not a public break.

Replacement, verified compiling clean (`tsc` exit 0) against **both** 2.118.0 and 3.0.0:

```ts
client.createContainer(schema, "2.0.0");
client.getContainer(id, schema, "2.0.0");
```

So the const becomes an `OldestSupportedClientVersion` of `"2.0.0"` and the six call sites
are untouched. The name `FluidCompatibilityMode` becomes misleading and should be renamed.

---

## 3. Requirement: the supported floor must rise from 2.40 to 2.102

> **Correction.** An earlier draft of this document put the floor at 2.116.0. That was wrong.
> It came from grepping for the identifier `OldestSupportedClientVersion`, which is merely the
> **2.116 rename** of a capability that already existed. The capability itself — passing a
> SemVer string instead of `"1"`/`"2"` — arrived in **2.102.0** under the name
> `MinimumVersionForCollab`. The floor is 2.102, not 2.116.

Fluid 3.0 removed `CompatibilityMode` (`"1" | "2"`), so the only accepted form is a SemVer
string. We therefore need the lowest version that accepts `"2.0.0"`.

Determined by compiling the real expression `client.createContainer(schema, "2.0.0")`, not by
grepping:

| Version | `tsc` | Result                                                                              |
| ------- | ----- | ----------------------------------------------------------------------------------- |
| 2.101.1 | 2     | **TS2345** — `'"2.0.0"' is not assignable to parameter of type 'CompatibilityMode'` |
| 2.102.0 | 0     | accepted                                                                            |
| 2.118.0 | 0     | accepted                                                                            |
| 3.0.0   | 0     | accepted                                                                            |

A grep sweep across 2.40 / 2.50 / 2.60 / 2.70 / 2.80 / 2.90 / 2.100 / 2.100.1 / 2.101.0 /
2.101.1 confirms the `minVersionForCollab: MinimumVersionForCollab` overload is absent
throughout and first appears in 2.102.0.

### Why we cannot simply keep 2.40

Below 2.102 this is not only a type error — it is a **silent runtime misconfiguration**.
In 2.101.1, `compatibilityMode` is used as a lookup-table key:

```js
...compatibilityModeRuntimeOptions[compatibilityMode],
compatibilityModeToMinVersionForCollab[compatibilityMode],
```

Passing `"2.0.0"` yields `undefined` from both tables. Spreading `undefined` is a no-op, so the
container is created with **no compatibility options at all** — no throw, no warning.

From 2.102 onward the value is instead passed through a resolver that maps `"2"` to `"2.0.0"`
and passes any other value through unchanged, so `"2.0.0"` and `"2"` are exactly equivalent.

Consequence: the correct range is

```
>=2.102 <2.120 || >=3.0.0 <3.10.0
```

> The range currently written on this branch is `>=2.40 <2.120 || >=3.0.0 <3.10.0`, which is
> **not accurate** and must be corrected before this ships.

The lockfile currently resolves `fluid-framework` to 2.110.0, which **does** satisfy the 2.102
floor. (Under the incorrect 2.116 figure it did not, so the floor alone no longer forces a
reinstall — though the module-system work does.)

---

## 3a. Rejected alternative: a runtime shim to keep the 2.40 floor

> **Decided: rejected.** Per Jason Hartman — "keep it simpler and just pass semantic version
> all of the time." The shim solved a problem that does not exist; see _Why this was
> unnecessary_ below.

For the record, the shim was viable. `"2"` is accepted across all of Fluid 2.x (2.40–2.119),
and only 3.x rejects it, so detecting the major version was sufficient:

```ts
import * as runtimeUtils from "@fluidframework/runtime-utils/internal";
const isV3 = runtimeUtils.cleanedPackageVersion?.startsWith("3.") ?? false;
export const FluidOldestSupportedClient = (
    isV3 ? "2.0.0" : "2"
) as OldestSupportedClientVersion;
```

Verified against three real installations — 2.40.0 (marker absent, chose `"2"`), 2.118.0
(chose `"2"`, resolves to `2.0.0`), 3.0.0 (chose `"2.0.0"`). It worked.

### Why this was unnecessary

The analysis above conflated two orthogonal knobs:

| Knob                        | Governs                                                           | Our value                             |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Peer dependency range**   | which Fluid versions a _consumer can build/install against_       | `>=2.102 <2.120 \|\| >=3.0.0 <3.10.0` |
| **`oldestSupportedClient`** | which Fluid _clients can still collaborate_ on documents we write | `"2.0.0"`                             |

Raising the peer floor to 2.102 does **not** drop collaboration with older clients. Per Fluid's
[CrossClientCompatibility.md](https://github.com/microsoft/FluidFramework/blob/main/CrossClientCompatibility.md),
`oldestSupportedClient` "specifies the oldest Fluid client version that must be able to access
documents written by the runtime", and is what selects the write format and feature gating.
Keeping it at `"2.0.0"` preserves interop with Fluid 2.0.0-era clients regardless of what a
consumer builds against. Client 3.0 also defaults to `"2.0.0"`, so passing it explicitly
selects the same runtime defaults — Fluid recommends setting it explicitly so that version
mismatches surface at build time rather than silently locking out old clients.

Consumers still on Fluid 2.40–2.101 therefore only need to upgrade their own Fluid dependency;
no existing session or document loses compatibility.

The Fluid docs use exactly the call shape we verified:

```ts
const { container } = await azureClient.createContainer(schema, "2.0.0");
const { container } = await azureClient.getContainer(id, schema, "2.0.0");
```

## 4. Requirement: module system

Fluid 3 is ESM-only: `"type": "module"`, and its `exports` map has **no `require` condition**.

Measured behaviour of a consumer against Fluid 3.0.0:

| Consumer configuration                  | Result                                         | Who this is                          |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------ |
| `moduleResolution: Node16`, ESM context | works                                          | our `tsconfig.json` (all 5 packages) |
| `moduleResolution: Bundler`             | works, even inside a `type: commonjs` package  | 7 TypeScript samples                 |
| `moduleResolution: Node10`              | **TS2307** on every Fluid import               | our 5 `tsconfig.cjs.json`            |
| `moduleResolution: Node16`, CJS context | **TS1479** "cannot be imported with `require`" | any CJS consumer of ours             |
| `require("fluid-framework")` at runtime | works on Node >= 22.12 (tested v24.14.0)       | fails on Node 18 / 20                |

---

## 5. The CJS build cannot support Fluid 3

This is a hard constraint, not a matter of effort.

- All five `packages/*/tsconfig.cjs.json` use `"module": "CommonJS"` + `"moduleResolution": "Node10"`.
  Fluid 3 removed its Node10 type-declaration entrypoints, so every Fluid import fails TS2307.
- It cannot be fixed by switching resolution: `module: CommonJS` with `moduleResolution: Bundler`
  is rejected outright with **TS5095** ("bundler can only be used when module is set to
  preserve or to es2015 or later").
- It cannot be fixed by switching to Node16 either — a CJS-context consumer importing an
  ESM-only package fails TS1479 by design.

So `bin/cjs` cannot be produced against Fluid 3 with any tsc configuration. A CJS artifact
could in principle still be _emitted_ via a separate transpiler, but its `.d.ts` would still
reference ESM-only Fluid types and would fail for the consumer — so this does not rescue it.

**Conclusion: CJS consumers of Live Share cannot use Fluid 3.** This is imposed by Fluid, not
by us. Note also that `exports` maps cannot express a per-format peer-dependency range, so a
"CJS means Fluid 2" split is a documented support-matrix statement that npm cannot enforce.

---

## 6. The test suite is CJS/Node10 and must migrate

This is the largest piece of work and was not obvious at the outset.

| Config                              | Setting                         | Status vs Fluid 3  |
| ----------------------------------- | ------------------------------- | ------------------ |
| 5x `packages/*/tsconfig.cjs.json`   | `CommonJS` + `Node10`           | broken             |
| 3x `packages/*/tsconfig.test.json`  | **extends the cjs config**      | broken             |
| `internal/test-utils/tsconfig.json` | `CommonJS` + `node`             | broken             |
| `internal/usage-test/cjs-test`      | runtime `require`               | Node >= 22.12 only |
| `internal/usage-test/pnpm-test`     | `Node16`                        | fine               |
| 10 TypeScript samples               | 7 `bundler`, 3 inherit `Node16` | fine               |

Because all three `tsconfig.test.json` files extend the CJS config, **the entire mocha suite
is Node10/CommonJS** and cannot compile against Fluid 3 at all.

Scope of the migration:

- 3 x `tsconfig.test.json` — re-point to extend `tsconfig.json` (Node16/ESM)
- `internal/build-tools/build-package.js` — stop writing `{"type":"commonjs"}` into `bin/test`
- test scripts in 3 packages — `ts-mocha -p tsconfig.test.json` becomes plain `mocha`, since
  the tests are already compiled to `.js` before running
- `internal/test-utils` — 6 files / ~503 lines; convert to Node16/ESM. Its relative imports
  mostly omit the `.js` extensions that Node16 ESM requires
- 26 `.spec.ts` files across live-share (14), live-share-media (8), live-share-canvas (4) —
  these have only ever been compiled in Node10 mode, so their relative imports likely need
  `.js` extensions too. Let `tsc` enumerate these (TS2835) rather than guessing

One thing that is **not** a blocker: `.mocharc.cjs` `require()`s `@fluidframework/mocha-test-setup`,
which sounds like it would break under an ESM-only Fluid. But that package is frozen at
`2.0.0-rc.1.0.9` (npm `latest` is 1.4.0) and never tracked the 2.40+ line. It is already
decoupled from the Fluid version under test and can stay as-is.

---

## 7. The dual-testing problem

Two of the choices made so far are in tension, and this needs an explicit resolution.

Keeping the CJS build means the repo's single `node_modules` must stay on Fluid 2.x, because
`tsconfig.cjs.json` cannot compile against 3.0. Therefore migrating the tests to Node16 is
**necessary but not sufficient** — after that migration the tests would still execute against
Fluid 2.x.

Actually exercising Fluid 3 requires a **second install lane**: an npm `override` pinning
Fluid to 3.0.0, with the CJS build skipped, running as a separate CI job. There are currently
no `overrides` or `resolutions` in the root `package.json`.

Existing CI (`.github/workflows/live-share-test-packages.yaml` and three others) runs a
Node `[22.x, 24.x]` matrix. Both satisfy the `require(ESM)` threshold of 22.12.

Separately, `internal/test-utils/package.json` pins roughly 20 `@fluidframework/*` packages at
`^2.0.0`, which the range-update script does not touch. Until those are addressed, the compat
harness will never exercise 3.x even in a Fluid-3 lane.

---

## 8. Consumer impact

- **ESM consumers** — get v2 and v3 support, no action required beyond the floor raise.
- **Bundler-based apps** (webpack, vite, Next.js) — unaffected; `moduleResolution: bundler`
  resolves Fluid 3 fine even from a `type: commonjs` package.
- **CJS consumers** — cannot move to Fluid 3. They also need Node >= 22.12 for `require(ESM)`
  to work at all at runtime. No `engines` field is declared in any of our packages today.
- **Anyone on Fluid 2.40 – 2.115** — dropped by the floor raise.

---

## 9. Decisions required

### D1. Fate of the CJS build

**Decided: drop it.** Live Share v2 is still marked internal, so breaking changes are
acceptable now (James Hunt / Mario Jauregui Gomez). Fluid 3 is ESM-only, so this also removes
the constraint that would have pinned the repo's `node_modules` to Fluid 2.x — meaning the
test suite can run against Fluid 3 in a single lane, and no second install lane is needed.

### D2. Raising the floor 2.40 → 2.102

**Decided: accepted, with `oldestSupportedClient` left at `"2.0.0"`.** Per Jason Hartman,
pass a semantic version all the time rather than shimming (§3a). Note the two knobs are
orthogonal: the peer floor is what consumers build against, while `"2.0.0"` preserves
collaboration with older clients. Range syntax must use `||`, not a single `|` — a single pipe
fails when installing with yarn (Mario Jauregui Gomez).

### D3. How to test against Fluid 3

_Open — this is the blocking decision._
Options: (a) scaffold the second lane now (override + separate CI job + skip CJS there);
(b) do only the Node16 test migration now and defer the lane; (c) design the CI shape first.

### D4. Scope of this release

Does `2.0.0-internal.19` ship v3 support, or does it ship as a corrected 2.x-only release
(range `>=2.40 <2.120`, no v3 clause) with v3 following separately? The current branch state
is a half-step: it claims v3 support with a floor that cannot deliver it.

### D5. Declared Node floor

If CJS consumers require Node >= 22.12 for `require(ESM)`, should we add an `engines` field?
None of our packages declare one today.

### D6. `internal/test-utils` Fluid pins

Its ~20 `^2.0.0` pins are invisible to `update-fluid-range.js`. Bring them into the managed
range, or leave them pinned to 2.x deliberately?

### D7. Samples

Samples resolve Fluid 3 fine, but their lockfiles and any `CompatibilityMode` usage would need
review before we claim they work on v3.

---

## 10. Work items

Done on this branch:

1. [x] Range corrected to `>=2.102 <2.120 || >=3.0.0 <3.10.0` across all 26 `package.json`
       files, via `update-fluid-range.js` (one clean transformation).
2. [x] `consts.ts` — `CompatibilityMode` removed; const renamed
       `FluidCompatibilityMode` -> `FluidOldestSupportedClient`, value `"2.0.0"`. Deliberately
       left unannotated so it compiles across the whole supported range (§3a).
3. [x] CJS dropped — 5 `tsconfig.cjs.json` deleted, `main` removed, `exports` reduced to the
       `import` condition, build scripts `--cjs --esm` -> `--esm`, `build-package.js` CJS task
       removed, `internal/usage-test/cjs-test` deleted, CI step removed.
4. [x] 3 x `tsconfig.test.json` re-pointed to the Node16/ESM base; `ts-mocha` replaced with
       `mocha` in the three test scripts (we run compiled JS, so ts-node only fought ESM).
5. [x] `internal/test-utils` migrated to Node16/ESM (`type: module`, `exports` map) and its
       22 `^2.0.0` Fluid pins moved into the managed range.
6. [x] `.js` extensions added to 39 relative imports across test-utils, canvas and media.
7. [x] `package-lock.json` regenerated; Fluid resolved to 3.0.1.
8. [x] `LogLevel.default` / `LogLevel.error` replaced with `LogLevel.info` / `LogLevel.essential`.
9. [x] `useSharedMap` result type narrowed to `SharedMap | undefined`.

Not done — needs a decision or a follow-up:

- [ ] Document the public support matrix in the README: ESM only, Fluid 2.102+ or 3.x.
- [ ] Decide whether to declare an `engines` field (D5). No package declares one today.
- [ ] `packages/live-share-acs` still has `ts-mocha` test scripts, but has zero spec files, so
      it was left untouched rather than migrated speculatively.
- [ ] `@fluidframework/mocha-test-setup` remains pinned at `^2.0.0-rc.1.0.9`. It is frozen on
      npm (latest is 1.4.0) and never tracked the 2.40+ line, so it is already decoupled from
      the Fluid version under test. Its `require:` hooks still work with ESM specs — verified
      by the passing live-share and media suites, which both load `.mocharc.cjs`.
- [ ] `internal/usage-test/pnpm-test` was not run locally (needs pnpm); CI covers it.
