# Incremental frontend TypeScript migration

Both `components/cabinet-front` and `components/admin-front` remain on React 18.3.1.
Run the following from either app directory using Node 24:

```sh
npm ci
npm run typecheck
npm run lint
npm run lint:types
npm test
npm run build
```

`typecheck` checks app source and shared TS/TSX with strict TypeScript, then compares
representative TypeScript resolutions with the app's real Vite resolver. The shared
base config allows existing JavaScript without checking it (`allowJs: true`,
`checkJs: false`). `skipLibCheck` skips dependency declaration checking; it does not
disable strict checking of migrated source. Vite transpiles; TypeScript emits no files.

## Migrating a module

Rename plain JavaScript to `.ts` and JSX to `.tsx`, add explicit boundary types,
and preserve existing behavior. Existing classes do not need to become hooks.
Prefer `unknown` and runtime validation for untrusted API or configuration data.
The TS lint configuration rejects explicit `any`. Run checks in both apps whenever
shared code changes. The first migrated module is `helpers/getCookie.ts`.

TypeScript paths mirror Vite's app-specific lookup order: cabinet superstructure
(where present), application, shared core, then app source. Explicit `core/*`
imports resolve directly to shared core. React declarations and package fallbacks
resolve through the consuming app's node_modules. Do not reintroduce a separate
jsconfig.json or change path order independently of Vite. Shared modules are checked
in both consuming apps; front-core does not have an independent dependency install.

## Tests

Use `*.vitest.ts` or `*.vitest.tsx` for the migrated suite. Both apps discover these
files in their own src and in front-core, using their Vite configuration and React
Testing Library with explicit cleanup. `npm run test:watch` starts watch mode.
The suite checks cookie lookup, HighlightText rendering, configuration loading,
authentication contracts, login/reducer integration, and the pure value/storage
helpers described below, in each app.

Legacy `__test__/*.test.jsx` Jest/Enzyme tests remain outside this runner. They are
not counted as passing coverage: port them to behavior tests and rename them as
features migrate. The old setupTests.js is not loaded by Vitest. Critical browser
journeys still need coverage through the repository's separate Playwright suite.

CI runs typechecking, typed-source lint, the migrated suite, and production builds
for each affected frontend. Changes to front-core select both apps.

## Configuration and authentication contracts

`types/config.ts` describes known shared configuration fields. Both apps keep their
startup defaults in `src/configDefaults.ts`, checked with `satisfies ConfigDefaults`.
The typed config loader preserves caching and shallow merging, with a nested merge
for `application`. Fetch failures, invalid JSON, and malformed known runtime fields
log an error and fall back to defaults. Invalid code-provided defaults fail early.
Deployment-specific fields remain `unknown` rather than being given guessed types.
The lazy config proxy can still be read before initialization and returns undefined.

`types/auth.ts` models partial identity-provider profiles, cabinet unit names, admin
numeric unit IDs, and login tokens. `helpers/authContracts.ts` validates known fields
while preserving additional provider data. The existing reducer uses this parser
for object profiles and its legacy final-segment base64/UTF-8 representation; decoding
is not signature verification. Invalid profiles throw and the existing API request
failure path handles reducer errors. Login responses must contain a non-empty string
token before requestAuth stores it; invalid responses use the existing token-error path.
Auth actions remain JavaScript for incremental migration; the reducer is now TypeScript.

## Typed Redux access

The shared `reducers/auth.ts` returns `AuthState` and validates unknown Redux payloads
before storing them. `types/authState.ts` also exports `AuthUnit`, `AuthAction`, and
`StoreAction`. Auth state includes nullable tokens/profiles/units and optional settings.
Use `satisfies AuthAction` when creating auth actions to check their payloads at compile
time. The app dispatch still accepts other legacy actions with unknown payloads.

Each app derives `RootState` from its own `application/reducers` map in
`src/application/store/types.ts`. Named slices are inferred, including the typed auth
slice. Legacy dynamic endpoint keys are excluded from this named state type; give
those endpoints explicit types as they migrate. Unconverted reducers still have
JavaScript inference rather than fully checked contracts.

Import `useAppSelector` and `useAppDispatch` from `core/store/hooks`. The shared hooks
resolve the consuming app's `store/types` through its existing module roots. Dispatch
supports the existing redux-thunk middleware and preserves thunk return types; the
runtime store setup is unchanged. React Redux 7 declarations are installed and React
18 declarations are updated to 18.3.27 without upgrading runtime dependencies.

`components/Label/UnitNamesLabels.tsx` uses the typed selector. Its tests mount a real
Redux provider, update auth units, and exercise typed thunk dispatch. Reducer tests
cover tokens, logout, profile updates, settings, membership, and failure cases.
Two fixes accompany the migration: admin head membership now compares numeric IDs
with IDs, and delayed email verification cannot create a profile after logout.

## Pure helpers

A batch of small, dependency-light `helpers/*` utilities with no React/JSX and no
Redux involvement moved to TypeScript together: the cookie helpers `setCookie.ts`
and `deleteCookie.ts` (`getCookie.ts` was already migrated), the `storage.ts`
singleton (falls back to an in-memory store when the configured Web Storage is
unavailable, e.g. private browsing), and value helpers `isEmpty.ts`,
`emptyObject.ts`, `toArray.ts`, `arrayUnique.ts`, `dotToPath.ts`, `sleep.ts`,
`stringToNumber.ts`, `padWithZeroes.ts`, `humanFileSize.ts`, `isCyrillic.ts`,
`isJson.ts`, `isHTML.ts`, `flatten.ts`, `getUrlParams.ts`, `urlHashParams.ts`,
`toUnderscore.ts`, `capitalizeFirstLetter.ts` (renamed from `.jsx`; it held no
JSX), and `toCamelCase.ts`. Each keeps its existing behavior and import path
(extension-free) and has a matching `*.vitest.ts` suite.

`object-path` ships no types; `types/object-path.d.ts` declares the handful of
methods (`get`, `set`, `has`, `del`, `ensureExists`) actually used across the
repo instead of leaving the import as an untyped `any`. `deep-diff` is handled
the same way via `types/deep-diff.d.ts`, now that `helpers/diff.ts` is migrated.

## Helpers sweep

Almost all of `packages/front-core/helpers/*` is now TypeScript: DOM/browser
helpers (`scriptLoader`, `downloadFile`, `readFileList`, `parseFile`,
`parseTableData`, `formBuilder`, `indexedDB`, `uploadScript`, cookie/base64/blob
conversions), access-control and localization (`checkAccess`, `localization`,
`navigationTree`, `checkExpiringDate`, `checkSignersData`), formatting helpers
(`humanDateFormat`, `getAttachFormat`, `userName`, `getUserShortName`,
`transliterate`), the `Waiter` class (`waitForAction.ts`), `useStickyState`
(a plain hook, no JSX, so it stays `.ts`), and `queueFactory.ts` (typed against
the `queue` package's own declarations via `ReturnType<typeof queue>`, since it
doesn't export its instance type directly). Tests that transitively import
`actions/auth` (which boots the real Redux store on import) mock that module
rather than booting the store in a unit test — see `localization.vitest.ts` and
`navigationTree.vitest.ts`.

Two pre-existing behaviors were preserved as-is, not "fixed", and are documented
in their tests: `helpers/dataSorter.ts`'s `'asc'`/`'desc'` labels are inverted
from the usual convention, and `helpers/diff.ts`'s `applyDiffs` is a no-op
because it always calls `deep-diff`'s `applyChange` with a `null` source (it is
also unreferenced anywhere in the repo).

`helpers/materialSymbolNames.ts` (a ~3,900-entry generated icon-name array) is a
straight rename with an added `readonly string[]` annotation; no logic to
preserve.

## Evaluate cluster and remaining data-format helpers

`helpers/evaluate/*` compiles and runs small user-authored expressions (from
form/workflow configuration) via Babel + `eval`, either synchronously
(`evaluate/index.ts`) or in a dedicated Worker (`evaluate/asyncEvaluate.ts` /
`evaluate/worker.ts`). `@babel/core` ships no types; `types/babel__core.d.ts`
declares only `transformSync`/`transformAsync`. The worker file types `self` as
a small local `WorkerScope` interface (`postMessage`/`addEventListener`) rather
than pulling in the `webworker` lib, which would conflict with the shared `DOM`
lib used everywhere else in the program. `asyncEvaluate.ts` now points its
`new URL(...)` worker reference at `./worker.ts`; confirmed via a real
production build in both apps that Vite still emits a separate worker chunk.
`evaluate/helpers.ts` (a table of `eval`-able expression strings, keyed by
name) initializes each entry as `''` instead of the original's placeholder
`{}` so the object satisfies `Record<string, string>` — every field is
reassigned to its real string value before the module finishes evaluating, so
this has no observable effect on any consumer. `retryOperation.ts`, which
calls into `evaluate`, is migrated alongside.

The remaining xlsx/csv/image/pdf/rich-text helpers are also migrated:
`csvParse.ts`, `readXLSXFile.ts`, `parseTaskFromXLSX.ts` (typed against
`clean-deep`'s and `xlsx`'s own declarations; `clean-deep`'s `.d.ts` sits next
to its package root rather than its `main` entry, so `types/clean-deep.d.ts`
restates its signature), `compressImage.ts` (`compressorjs`), `compressPDF.ts`
(typed against a local `types/pdfjs-dist-build-pdf.d.ts`, since the
`pdfjs-dist/build/pdf` subpath used here has no shipped declaration file),
`createMuiTheme.ts`, `customPassword.ts` (`password-generator`),
`handleTranslateText.ts` (typed against a new `types/deepdash-findPathDeep.d.ts`,
for the same reason as `pdfjs-dist`), and `renderHTML.ts` (typed against new
`types/sanitize-html.d.ts` and `types/react-render-html.d.ts` declarations,
since neither package ships types).

`packages/front-core/helpers/*` is now fully TypeScript except the handful of
files that are actually React components rather than helpers — `renderOneLine.js`
migrated in the pass below; `createRoutes.jsx` migrated in "Routing" below;
`checkAuthPhoneValidation.js` also migrated (mocks `components/ValidatePhoneMessage`
in its test, since that component's own import chain boots the real Redux store).

## Small presentational components

Migrated the small, non-Redux front-core components (similar size to
`Label`/`HighlightText`): `RichTextEditor`, `WebChat`, `PreloaderPreview`,
`FormElementsGroup`, `Mime`, `IntervalUpdateComponent`, `IMG`, `ModulePage`,
`DOC`, `BlockScreen`, `HTMLPreview`, `BlockQuote`, `TextPreview`, `Media`,
`EmptyPage`, `UnknownFormat`, and `helpers/renderOneLine.tsx` (a `connect(null,
null)`-wrapped component, so no Redux state/dispatch typing was needed).
`AppRouter` and `helpers/createRoutes.jsx` needed `react-router-dom` v5 /
`history` v4 typed first — see "Routing" below.

New ambient declarations: `types/classnames.d.ts`, `types/react-translate.d.ts`
(note: `translate`'s type parameter must live on the *returned* function, not
`translate` itself — otherwise TypeScript can't infer it from the wrapped
component and silently collapses it to the bare `{ t: Translate }` constraint),
and `types/ckeditor5-react.d.ts`. `types/mui-augmentation.d.ts` adds the app's
custom `"yellow"` Button color to MUI's types; the file needs a top-level
`export {}` so its `declare module '@mui/material/Button'` block *augments*
MUI's real types instead of a no-export ambient file being (mis)treated as a
full replacement of the module.

Several components use `withStyles({})` — an empty styles object — while still
reading `classes.someKey` in their JSX. That's not a mistake carried over from
JS: MUI genuinely injects an empty `classes` object in that case, so those
classNames are `undefined` at runtime today, in production, already. Each such
component casts `classes` to `Record<string, string | undefined>` locally
(documented inline) rather than widening the component's declared prop type,
so the type stays honest about what MUI actually provides.

Two more pre-existing runtime issues surfaced and are preserved, not fixed:
`Button color="yellow"` is used in several components, but no `"yellow"`
palette color is defined anywhere in `theme.js` — MUI's `Button` unconditionally
reads `theme.palette.yellow.main`, so this throws with the real app theme.
`components/BlockScreen`'s original JSX also passed a `background` prop to
`Preloader`, which only ever destructures `classes` — that prop was already a
no-op and was dropped rather than carried forward as dead code. New shared test
infrastructure at `testHelpers/renderWithTheme.tsx` wraps a render in the app's
real theme (`ThemeProvider` + the legacy `@mui/styles` `ThemeProvider`, matching
`App.jsx`'s nesting) and augments a synthetic `"yellow"` palette color so these
components' tests can render without hitting that theme gap — this does not
fix the app itself, which still throws exactly as before with `color="yellow"`.

## Routing

`react-router-dom` v5 and `history` v4 ship no types and have no usable
community `@types` package pinned to these versions, so `types/history.d.ts`
and `types/react-router-dom.d.ts` declare the actual surface used:
`History`/`Location`, `createBrowserHistory`/`createMemoryHistory`, and
`Router`/`Switch`/`Route`/`Redirect`/`Link`/`MemoryRouter`. `RouteProps` and
`RedirectProps` keep a `[key: string]: unknown` index signature deliberately —
call sites spread whole app-specific route-config objects onto `<Route>`/
`<Redirect>`, well beyond react-router's own props.

With those in place, `components/PrivateRoute`, `components/AppRouter`, and
`helpers/createRoutes.tsx` are migrated together, since all three are tightly
coupled (`AppRouter` and `createRoutes` both render `PrivateRoute` per route).
`PrivateRoute` picks between `Redirect` and `Route` at runtime based on a
`redirect` flag; since TypeScript can't express "props satisfy whichever of
two differently-shaped components gets rendered," the merged props are cast
through `unknown` at that one call site. `components/PrivateRoute` also
dropped a second dead prop the same way `BlockScreen` did — `<Preloader
flex={true} />`, where `Preloader` only ever reads `classes`.

One more preserved-not-fixed bug: `AppRouter`'s `mapStateToProps` destructures
`auth.info.onboardingTaskId` with no fallback for `info` itself; since
`AuthState.info` is typed `AuthUser | null`, this throws at runtime exactly as
the original did if `info` is ever null when `AppRouter` renders (a type
assertion satisfies the compiler without adding a runtime guard the original
never had).

Testing these needed `MemoryRouter`/`Router` and, for `PrivateRoute` and
`AppRouter`, mocking `store` (which otherwise boots the real Redux store and
requires a loaded runtime config) and `components/PrivateRoute` itself (in the
`AppRouter` suite, to isolate its route-filtering logic). `AppRouter`'s tests
navigate to a specific path rather than asserting on the full route list,
since its routes render inside a real `<Switch>`, which only renders the one
child matching the current location.

## DataTable endpoint configs

`services/dataTable/types.ts` defines `DataTableEndpoint<Filters>`,
`DataTableRequestState<Filters>`, and `DataTableRowState` by reading the
contract straight out of `services/dataTable/*` (`actions.js`, `reducer.js`,
`useTable.js`, `connect.js`, `connectWithOwnProps.js` at the time) rather than
guessing it. `actions` stays
`Record<string, unknown>`: most entries are `(endPoint) => (...) => Action`
factories bound via `bindActionCreators`, but at least one convention in the
wild (`isRowSelectable`) is a plain per-row predicate factory that's called
directly and never dispatched, so there's no one real call signature to
enforce. `qs` ships no types either; `types/qs.d.ts` covers `stringify`/
`parse`, and deliberately types `arrayFormat` as a bare `string` rather than
`qs`'s own documented enum — several call sites already pass `'index'`, which
isn't one of `qs`'s real options and silently falls back to default behavior;
matching that instead of "fixing" it keeps the type honest about current
behavior.

Every endpoint config in `admin-front`/`cabinet-front`'s `src/application/endPoints/`
plus the one shared one (`services/dataTable/endpoints/registry.ts`) is now
typed against `DataTableEndpoint`, mostly via `... satisfies DataTableEndpoint`
(module augmentation stays possible since a fresh `.js` file starts empty).
Endpoints built incrementally by mutating a `let`/`const` binding after the
initial literal (`users.ts`, `message.ts`, mirroring the original JS) instead
use an explicit `: DataTableEndpoint` annotation, since `satisfies` keeps the
narrower literal type and won't allow assigning properties the initial object
didn't already have.

## DataTable service (dispatch/reduce half)

Migrated the non-hook half of `services/dataTable/*`: `dispatchType.ts`,
`mapDataDefault.ts`, `adapter.ts`, `composeUrl.ts`, `connect.ts`,
`connectWithOwnProps.ts`, `reducer.ts`, and `actions.ts` (the largest, ~30
action creators, all redux-thunk-shaped `(model) => (...) => (dispatch) =>`).
New ambient declarations: `types/lodash-fp.d.ts` (just `merge`, the only
`lodash/fp` function this subsystem uses) and, from the endpoint-config pass,
already-covered `qs`. `DataTableRequestState.page`/`rowsPerPage` widened to
allow `null`, since `getDataUrl`/`composeUrl` are called directly with the
reducer's own `DataTableRowState` (where `page` is `null` before the first
load), not only with fresh request params — this cascaded into two endpoint
configs needing a cast at their one arithmetic use site.

`connect.ts`/`connectWithOwnProps.ts` deliberately keep the wrapped
component's own props as a loose `Record<string, unknown>` rather than a
generic — this HOC wraps ~50 components with wildly varying prop shapes
across both apps, and a generic would force every call site to satisfy
`connect()`'s injected-props typing exactly.

Two more preserved-not-fixed bugs, found while typing `reducer.ts`: its
`ON_ERROR_CLOSE` case reads `state.errors` (plural), but the reducer's own
state only ever sets `error` (singular) — dispatching this dataTable action
throws. No UI wiring was found that actually dispatches it (a different,
commonly-used `actions/error.js#closeError` exists and is unrelated), so this
looks unreachable in practice, but it's preserved exactly rather than
"fixed" with a fallback. Separately, `helpers/promiseChain.ts`'s second
parameter was widened from required to optional (`params?: T`) — several
`services/dataTable/actions.ts` call sites call it with only one argument,
matching the original JS's flexible arity; this is a compile-time-only
widening with no behavior change, not a "fix."

## DataTable service (hook half) — services/dataTable is now fully TypeScript

Migrated the remaining quarter: `useTable.ts`, `useStaticTable.ts`,
`useRegisterTable.ts`, and `concatTables.ts`. All four are built on
`radioactive-state`, a Proxy-based reactive-state hook with no types;
`types/radioactive-state.d.ts` declares just `useRS<T extends object>(initial:
T): T` — the library's Proxy also exposes special `$`/`$fieldName` properties
(mutation count / input binding) via its `get` trap, but nothing in this
codebase reads them, so they're intentionally left out.

Testing these needed one workaround: `radioactive-state` schedules its
re-render via a bare `setTimeout(fn, 0)` (see its `schedule.js`), which
`act()` does not wait for on its own. Each hook test flushes a real macrotask
after mutating state before reading `result.current` again.

Another preserved-not-fixed bug, found while typing `concatTables.ts`: its
`actions.load` and `actions.loadAllDataRequests` are not callable — `.forEach()`
runs *eagerly* at object-construction time (i.e. on every render, calling
`prop.actions.load()` for every table immediately) and its return value
(`undefined`) becomes the property, unlike `actions.closeError` right below,
which correctly wraps the identical pattern in a function. `concatTables` has
no consumers anywhere in the repo (confirmed by search), so this was never
exercised — preserved exactly rather than fixed, same as elsewhere in this
migration.

`DataTableEndpoint.fetchFuncProp`'s parameter was widened from
`DataTableRowState` to `Partial<DataTableRowState>`, since `useTable.ts` calls
it with partial merged objects (e.g. `{...additional, rowsPerPage, page}`),
not always a complete row state — the original JS never enforced completeness
here either.

## Application reducers (both apps)

Migrated every app-specific reducer under `src/application/reducers/*` in
both apps, plus each app's combining `index.ts` (consumed by
`RootState = StateFromReducerMap<typeof reducers>` in
`src/application/store/types.ts`, directly improving `RootState` accuracy).
New ambient declaration `types/react-router-redux.d.ts` covers `routerReducer`
and `routerMiddleware`, the only two exports this codebase uses.

**admin-front** (14 reducers + `index.ts`): `bpmnAi.ts`, `favorites.ts`,
`registry.ts`, `workflowProcess.ts`, `snippets.ts`, `dictionary.ts`,
`workflowProcessLogs.ts`, `numberTemplates.ts`, `units.ts`, `tasks.ts`,
`events.ts`, `gateways.ts`, `workflow.ts`. `units.ts` exports its shared
`newUnitConfig` default alongside the reducer. `gateways.ts` needed one real
call-site change to typecheck: `getGatewayTypeId(action.payload, types)`
(an untyped JS helper expecting a `{ type }`-shaped first argument) becomes
`getGatewayTypeId({ type }, types as never)` — confirmed behaviorally
identical by reading the helper, which only ever reads `.type` off its first
argument.

Three admin-front reducers (`tasks.ts`, `events.ts`, `gateways.ts`) share a
preserved-not-fixed mutation bug in their `UNDO_*` cases: `{...state}` only
shallow-copies `state`, so `newState.actual` is the *same* object reference
as `state.actual`; the following `delete newState.actual[id]` therefore
mutates the previous state's `actual` in place too. Each site keeps a comment
explaining this, and each has a test asserting the old state is mutated
alongside the new one.

**cabinet-front** (10 reducers + `index.ts`): `app.ts`, `documentTemplate.ts`,
`externalReader.ts`, `files.ts`, `inbox.ts`, `messages.ts`, `registry.ts`,
`task.ts`, `workflow.ts`, `workflowTemplate.ts`. `messages.ts` consumes a
dataTable-namespaced action type (`'DATA_TABLE/MESSAGESLIST/GET_LIST_SUCCESS'`)
directly in a plain reducer — a pre-existing cross-cutting pattern, preserved
exactly. `types/lodash-fp.d.ts` gained `equals` (an alias for `isEqual` that
`lodash/fp` actually ships), used by `task.ts`.

`task.ts` (720 lines — by far the largest reducer in either app) mutates
several of its own dependencies at runtime already, so nothing here is a new
risk, just newly typed: `Task`/`TaskDocument` use permissive `[key: string]:
unknown` index signatures rather than fully modeling the document shape,
since the real shape is fully dynamic (arbitrary JSON Schema-driven form
data addressed via `object-path`). It imports `ChangeEvent`/`handleTriggers`
from the still-JS `components/JsonSchema`; TypeScript infers their types
from the JS via `allowJs`, so no ambient declarations were needed for them.
Three more preserved-not-fixed mutation bugs were found and documented
in-line, all pre-existing:
- `UPDATE_VERIFIED_USER_INFO_SUCCESS` mutates the found `origin` entry's
  `document.data` directly before cloning it into the new state.
- `STORE_TASK_DOCUMENT_SUCCESS`'s `updateLogs`-without-`document` branch
  mutates `state.origin[id].lastUpdateLogId` in place and returns the same
  `state` reference (no new object at all); its other branch mutates
  `state.actual[id]` in place too.
- `DELETE_TASK_DOCUMENT` deletes keys from `state.actual`/`state.origin`
  before shallow-copying them into the returned state, so the previous
  state's dicts lose the key as well.
- `REJECT_DOOCUMENT_SIGNING_SUCCESS` and `DELETE_SIGNATURES_SUCCESS` mutate
  the found `origin` entry's `document.signatureRejections`/`signatures`
  arrays directly.
- `UPDATE_TASK_DOCUMENT_VALUES`'s trailing block (ensuring
  `origin[taskId].document.data[path[0]]` exists) runs unconditionally, even
  when `updateOrigin` is false — since `newState.origin` is the same
  reference as `state.origin` in that case, it stamps a stray `{}` onto the
  *previous* state's origin document. Covered by a dedicated test.

Two harmless catch blocks in `task.ts` (`catch (e) { ... }` with `e` never
read) were changed to bare `catch { ... }` to silence
`@typescript-eslint/no-unused-vars` — this is a no-op syntax change (ES2022
optional catch binding), not a behavior change.

## Application actions (both apps)

Migrated every app-specific action-creator file under `src/application/actions/*`
in both apps: 16 files in admin-front (`metrics.ts`, `processStatistics.ts`,
`workflowProcessLogs.ts`, `favorites.ts`, `qrTemplates.ts`, `tags.ts`,
`snippets.ts`, `messagesTemplates.ts`, `multiLang.ts`, `events.ts`, `files.ts`,
`gateways.ts`, `numberTemplates.ts`, `users.ts`, `units.ts`, `mock.ts`) plus
`workflowProcess.ts`, `bpmnAi.ts`, `registry.ts`, `workflow.ts`, and the
728-line `task.ts`; 10 files in cabinet-front (`app.ts`, `externalReader.ts`,
`inbox.ts`, `documentTemplate.ts`, `users.ts`, `messages.ts`, `multiLang.ts`,
`workflow.ts`, `files.ts`, `registry.ts`) plus the 888-line `task.ts`.

These are almost entirely redux-thunk action creators of the shape
`(...args) => (dispatch) => api.get/post/put/del(...)`, calling into
`services/api` — at the time, still a large untyped `.js` module (now
migrated, see "Shared actions, reducers, and services/api" below).
Consuming an untyped JS module's exports from `.ts` is unproblematic:
TypeScript infers their types from the JS via `allowJs`, and a
`Promise.catch((error) => ...)` callback's parameter is already
contextually `any` per its lib signature, so error-handling code needed
no annotations at all — only the action creators' own parameters (ids,
bodies, files, flags) needed explicit types, using `unknown` for opaque
request/response bodies and `string | number` for the many ID-shaped
parameters this codebase threads through as either. A local `type
Dispatch = (action: unknown) => unknown` is declared per file, matching
the convention already established in `services/dataTable/actions.ts`.
Also includes admin-front's `application/actions/tasks/` subdirectory
(`index.ts`, `mapping.ts`), missed in the initial sweep since it isn't a
top-level file in `actions/`.

`types/lodash-fp.d.ts` gained `equals` (an alias for `isEqual` that
`lodash/fp` actually ships, used by cabinet-front's `task.ts`, formerly
front-core's dataTable-only consumer of this module).

One small preserved-not-fixed call-site quirk, found in both apps:
`helpers/getReaderMocks.js`'s default-exported `getHeaders` function takes
no parameters and never reads one, but several call sites
(cabinet-front's `externalReader.ts`, and `task.ts`'s `createTask`,
`externalReaderCheckData`, `updateVerifiedUserInfo`) call it as
`getHeaders(dispatch)`, passing an argument that was always silently
ignored. TypeScript's arity check on the real (inferred) signature caught
this; each call site now reads `getHeaders()`, which is behaviorally
identical — confirmed by reading the implementation — not a "fix," since
nothing observable changes.

No dedicated `*.vitest.ts` tests were added for either app's actions
files: they are thin, mechanically-verified wrappers around `api.*`
calls with no branching logic of their own to exercise (unlike the
reducers, which had real state-transition logic worth asserting on).

## Shared actions, reducers, and services/api

Migrated the remaining shared (front-core) Redux plumbing and the HTTP
layer underneath it: `actions/error.ts`, `app.ts`, `localization.ts`,
`debugTools.ts`, `users.ts`, `stripe.ts`, `dropbox.ts`,
`workflowProcess.ts`, and the 349-line `auth.ts`; `reducers/error.ts`,
`app.ts`, `debugTools.ts`, `users.ts`, `eds.ts`, and the static config
`reducers/variables/adminUnits.ts`.

`reducers/eds.ts` has a preserved-not-fixed mutation bug parallel to the
ones documented in the admin-front task/event/gateway reducers:
`EDS_ADD_KM_TYPE` and `EDS_ADD_KM_DEVICE` write into `state.kmTypes` (and
its nested `.devices` array) via direct index assignment on the *same*
array reference pulled out of `state` at the top of the reducer, then
return `{ ...state, kmTypes }` — the previous state's array is mutated
in place, not copied.

`services/api/*` (`index.ts`, `ApiException.ts`, `objectProxy.ts`) is now
TypeScript — the shared `get`/`post`/`put`/`upload`/`del` HTTP helpers
almost every action creator in both apps calls into. This was the
highest-risk conversion in the migration so far: giving these functions
honest return types (`Promise<unknown>` instead of JS's inferred `any`)
broke type-checking at every call site that called `.then()` on the
result and touched a property (e.g. `response.headers.get(...)`,
`result.users`, `users.filter(...)`) — about a dozen sites across both
apps' already-migrated `actions/*.ts` files, fixed with a local cast on
the `.then()` callback parameter rather than by loosening `services/api`'s
types back down. `ApiException.ts` preserves a real, pre-existing Sentry
misuse found while typing it: `scope.setExtra(extra)` is called with a
single object argument, but the real (typed) API is
`setExtra(key: string, extra: unknown)` — meaning Sentry actually receives
the extras object coerced into a string key with an `undefined` value, so
none of the intended per-exception context is ever recorded. The
almost-certainly-intended call was `scope.setExtras(extra)` (plural,
one-arg) sitting right next to it in Sentry's own type declarations, but
this is a monitoring-quality bug, not a functional one, so it's preserved
via a documented cast rather than silently switched to `setExtras`.

## JsonSchema engine (helpers and shared components)

`components/JsonSchema/*` is a ~427-file, ~95,000-line dynamic form
rendering/validation/evaluation engine — the largest single subtree in
the repo, and much larger than initial scoping suggested. Migrated the
two foundational pieces so far: `helpers/*` (20 files) and the shared
`components/*` (8 files) it's built from — `types.ts` defines
`JsonSchemaNode` (a recursive, `[key: string]: unknown`-indexed schema
node type, since real schemas are arbitrary JSON with no fixed shape),
`PropertiesEachCallback`, and `RootDocument`, reused across nearly every
other file in the tree.

`worker.ts` and `validateData.ts` (the Ajv-based, schema-driven "run every
field's `checkValid`/`checkRequired` function" validators — one runs in a
Web Worker, one inline) are typed permissively: `ajv` and `handlebars`
both ship real types and are used as-is, but schema/data values stay
`unknown`/`Record<string, unknown>` with local casts at each access,
since the actual shapes are fully dynamic per-form JSON. `worker.ts`'s
`new URL('./worker.js', ...)` became `new URL('./worker.ts', ...)`,
matching the precedent already set for `helpers/evaluate`'s own worker.
New ambient declaration `types/js-sha256.d.ts` (default-exports a single
`(message: string) => string`, the only function this codebase calls).

Extended the `react-translate` ambient `Translate` type to
`(key: string, params?: Record<string, unknown>) => string` — the
original `(key: string) => string` was already too narrow for real usage
once `localizeError.ts` (a JsonSchema helper with a dozen `t('X', {...})`
interpolation calls) needed converting; this is filling in a gap in our
own ambient scaffolding; not a behavior change. That widening surfaced
two more `.map(t)`/`.map(capitalizeFirstLetter)`-style pre-existing
quirks (see `components/Mime/index.tsx` and
`components/JsonSchema/helpers/getFormElementName.ts`): both rely on
`Array.prototype.map` implicitly passing the array index as the
callback's second argument. For `getFormElementName`, this measurably
changes output (later dot-separated segments of a control name get a
different capitalization rule than the first); for `Mime`, a numeric
"params" argument is a no-op for any real interpolation implementation.
Both are preserved with an explicit wrapper and a comment rather than
"cleaned up" to `.map((x) => fn(x))`, since that would silently change
`getFormElementName`'s output.

## JsonSchema elements, first batch

Started `components/JsonSchema/elements/` (~229 files, the actual
field-type renderers) with the 9 smallest: `Header`, `DiffTable`,
`PropertyList` (+ `PropertyTree`), `CabinetFile`, `SignerList` (+
`dataTableSettings`, `components/SignerTableToolbar`), `ProtectedFile`,
`UserSelect`, `Dropbox`, `DynamicFilePreview`.

New ambient declarations: `types/lodash.d.ts` (only the 5 functions used
anywhere in front-core: `get`, `merge`, `omit`, `pick`, `uniqueId` — no
default export declared, matching `qs.d.ts`'s convention of relying on
`esModuleInterop` to synthesize `import _ from 'lodash'` from named
exports only), `types/hellosign-embedded.d.ts`, `types/mime-types.d.ts`,
`types/js-sha256.d.ts`.

**Important cross-app pattern, worth knowing before converting more
`elements/*`:** several of these shared front-core components import
from an app-specific path like `application/actions/task` or
`application/actions/externalReader` — paths that resolve to a
*different real file per app* (or, for cabinet-front-only features like
`ProtectedFile`/`UserSelect`, don't resolve *at all* in admin-front,
since admin-front has no `application/actions/externalReader.ts` and its
own `application/actions/task.ts` lacks `downloadProtectedFile`/
`uploadProtectedFile`). This isn't new — the plain-JS versions had the
exact same imports — but `tsconfig.json`'s `include` type-checks *all* of
`packages/front-core/**/*.tsx` in both apps' `npm run typecheck`
regardless of whether that app's bundler ever actually reaches the file
(confirmed via `elements/index.jsx`'s central "full" registry vs.
admin-front's own curated `application/components/JsonSchema/elements/index.jsx`,
which simply never imports `UserSelect`/`ProtectedFile` — so the broken
import was already silently dead code for admin-front's bundle, just
never caught by a type checker before). Two fixes, chosen per situation:
- When the named export is *missing but the module exists* in the other
  app (`ProtectedFile`'s `application/actions/task`): `import * as
  taskActions from '...'` then read the function off with a
  `Record<string, (...args: unknown[]) => unknown>` cast, instead of a
  named import — avoids a hard "has no exported member" error while
  keeping cabinet-front's real typed function.
- When the *module itself* doesn't resolve for one app
  (`UserSelect`'s `application/actions/externalReader`): a fallback
  ambient declaration (`types/app-externalReader.d.ts`) that TypeScript
  only consults when no real file is found via path mapping — cabinet-front's
  real module still wins there since real files take priority over
  ambient declarations.

Also: `bindActionCreators` from plain `redux` (no `redux-thunk` type
augmentation in this project) doesn't collapse a curried thunk action
creator's type down to its post-dispatch return value — it just returns
the same curried type unchanged, which is structurally wrong for how
this codebase actually calls `dispatch` (redux-thunk middleware executes
the thunk and returns *its* return value at runtime). Where a component
does `await actions.someBoundThunk(...)` and expects the resolved value
directly (`UserSelect`), the `mapDispatchToProps` result needs an
explicit cast to the real flattened signature; where the bound action is
only ever passed through as a callback reference (`CabinetFile`), no
cast was needed.

## JsonSchema elements, second batch

Converted 3 more: `CardBlock` (+ `styles.ts`), `BankQuestionnaire`,
`ArrayInArray`. Extended `types/app-externalReader.d.ts` with two more
per-app-only fallback declarations (`actions/externalReader` — a
different specifier than `application/actions/externalReader`, same
underlying cabinet-front file reached via a different alias-list entry —
and `actions/documentTemplate`), since `BankQuestionnaire` is another
cabinet-front-only element importing both.

Two more preserved-not-"fixed" quirks:
- `CardBlock`'s `action.link`/`action.hidden` default to zero-arg
  functions (`() => ''`, `() => false`) that get passed straight into
  `evaluate()` — which expects an evaluable *string* of code, not a
  function reference. Typed as a union (`string | (() => string)`) with a
  cast at the `evaluate()` call rather than "fixing" the default to a
  string, since this default is likely unreachable in practice (the
  `action` config is always supplied by real schemas) and changing it
  isn't this migration's call to make.
- Calling a converted action creator with fewer arguments than it
  declares (`BankQuestionnaire`'s `updateTaskDocumentValues(taskId, path,
  changes)` — the real signature also takes a required `triggers`
  parameter) compiled silently as plain JS but is a real arity error once
  typed. Passing `undefined` explicitly reproduces the exact runtime
  behavior of the omitted argument.

## JsonSchema elements, third batch

Converted `PdfBlock` (+ `settings.ts`), `DynamicSelect`, `DynamicRadioGroup`
(+ `components/RadioButtons`), `TimeSlots`. New ambient declarations:
`types/react-pdf-renderer.d.ts` and `types/react-pdf-html.d.ts` (neither
package ships types), `types/svg-react-component.d.ts` (augments
`vite/client`'s `declare module '*.svg'` with the `ReactComponent` named
export this project's custom Vite transform produces for
`import { ReactComponent as X } from './icon.svg'` — must be written
without a top-level `import` statement, or TypeScript treats it as an
augmentation of an existing module instead of a global ambient
declaration and it's silently ignored).

Also widened `ElementContainer`/`ElementGroupContainer`'s `variant` prop
from a hand-picked subset of MUI's `Typography` variants to the real
`Variant` type (imported from `@mui/material/styles/createTypography`,
since it isn't re-exported from `@mui/material/styles`'s own index) —
found because `DynamicRadioGroup` legitimately passes `'subtitle1'`,
which the earlier narrower type didn't allow.

Two more preserved no-op class-name references, same category as
`ElementContainer`'s already-documented `withStyles({})` gaps:
`RadioButtons`' `classes.disabled`/`classes['fontSize' + fontSize]` and
`DynamicRadioGroup`'s `classes.groupDescription` all reference class keys
never defined in `RadioGroup/components/layout.js`'s styles — always
`undefined`, always a no-op, preserved via casts.

## JsonSchema elements, fourth batch

Converted `ExternalReaderRegisterFilePreview` and `DynamicCheckboxGroup`
(+ `components/CheckboxLayout`). `ExternalReaderRegisterFilePreview` hit
the same cabinet-front-only pattern again (`getExternalReaderData` isn't
exported from admin-front's `application/actions/task`) — same
namespace-cast fix as `ProtectedFile`.

Preserved a more significant bug this round: `DynamicCheckboxGroup`'s
`compareArrays(arr1, arr2)` does `arr1.join('') === arr2.join('')` —
joining the *arrays of objects* directly rather than their ids. Since
every plain object stringifies to `"[object Object]"`, this only ever
compares array *lengths*, never actual contents. It's called from
`removeUnexistedValues` to decide whether to fire `onChange` with a
pruned selection — meaning that guard is effectively "skip the update
only if the count happens to match," not "skip if nothing changed."
Preserved exactly, with a comment, rather than fixed to compare by id
(which would be the obviously-correct version, but changes real behavior).

## JsonSchema elements, fifth batch

Converted `DetailsCollapse` (+ `components/Accordion`, `components/Details`)
and `RadioGroup` (+ `RadioGroup.tsx`, `components/Property`,
`components/layout.ts`). Two MUI type-completeness gaps found and worked
around with casts rather than behavior changes: `Accordion`'s `component`
prop (used to render as `<section>`) isn't in this MUI version's shipped
`AccordionProps`, though `Accordion`/`Paper` do forward it at runtime; and
`Details.jsx`'s `classes.dropdownIcon` and `Accordion.jsx`'s
`classes={{..., expandIcon: ...}}` both reference class keys that don't
exist (the real MUI key is `expandIconWrapper`, and `dropdownIcon` was
never defined in that file's own styles) — both silently no-op today,
preserved as such.

Also learned a TS narrowing gotcha worth remembering for the rest of this
tree: `if (x && ...)` on an `x: unknown` prop narrows `unknown` down to
`{}` (TypeScript's stand-in for "any non-nullish, truthy value"), not
back to `unknown` — so `let y = x` inside that block infers `y: {}`, and
assigning a fresh `unknown` (e.g. another `evaluate()` call) back into
`y` fails to typecheck even though nothing is functionally wrong. Fix is
an explicit `let y: unknown = x`.

## JsonSchema elements, sixth batch

Converted `Table` (+ `AddItemButton`, `DeleteItemButton`, `dataTableSettings`)
and `Card` (+ `components/CardEditDialog`, `components/CardPreview`,
`components/CardPreview/HtmlTemplate`, `components/CardPreview/PropertyList`).

`Table/index.tsx`'s `static defaultProps` needed an explicit
`Partial<TableElementProps>` annotation — without it, TS widened the
`maxRows: false` literal in a way that broke the `translate()` HOC's
`ComponentType<TableElementProps>` constraint. Its `dataTableSettings(...)`
call needed a final `as unknown as Parameters<typeof dataTableSettings>[0]`
cast, since spreading `rest` (itself cast to `Record<string, unknown>`)
erases the structural guarantee that required fields (`schema`, `onChange`,
`path`, `parentValue`, `name`) are actually present.

No new preserved-bug findings in this batch — both component groups typed
cleanly against their existing runtime behavior once `ChangeEvent`'s bound
callback pattern (`onChange.bind(null, 'open')`) was given an explicit
`(arg: unknown) => void` cast, matching the pattern already used elsewhere
for the same `ChangeEvent`-via-`allowJs`-inference situation.

## JsonSchema elements, seventh batch

Converted `Card` (already listed above) and `GeojsonMap`. `GeojsonMap` was
the first file in the migration to touch `react-leaflet`/`leaflet`: the
`leaflet` package ships no types at all (no `@types/leaflet` either), so
`react-leaflet`'s own shipped `.d.ts` files — which import `MapOptions`,
`TileLayerOptions`, `GeoJSONOptions`, `Map`, `GeoJSON`, `Layer`, etc. from
`'leaflet'` — silently lose those properties (interfaces effectively
extend nothing) once TS can't resolve the module. Since those failures
happen inside `.d.ts` files, `skipLibCheck` hides the diagnostics but not
the missing properties, so consuming code like `<MapContainer center={...}>`
fails with "Property 'center' does not exist". Added a new
`types/leaflet.d.ts` ambient module — scoped to the exact names/props this
component uses (`MapOptions.center`/`zoom`, `TileLayerOptions.maxZoom`,
`GeoJSONOptions.onEachFeature`, plus minimal `Map`/`Layer`/`GeoJSON`/
`TileLayer` classes) — rather than a full `@types/leaflet` port. The
`GeoJSONOptions.onEachFeature` property type (`(feature: unknown, layer:
unknown) => void`) is contravariant as a plain property (not a method
signature), so passing our more specifically-typed callback still needs
an explicit cast at the JSX prop site, same pattern as elsewhere in this
migration. Otherwise a straightforward conversion — no preserved-bug
findings, `PropTypes`/`defaultProps` collapsed into destructured default
parameters (same values, matching the pattern already used for every
other converted function component).

## JsonSchema elements, eighth batch

Converted `Tabs` (+ `TabsContainer`, `useTabs`) and `Modal` (+
`components/ContentLayout`, `components/Dialog`).

`Tabs/useTabs.ts` had a `useMemo(fn)` call with no dependency array at all
(not even `[]`) — React allows this at runtime (it just recomputes every
render), but the `@types/react` signature requires a `DependencyList`, not
`undefined`. Rewritten as a plain IIFE (`(() => {...})()`) computed inline
on every render, which is exactly what the missing deps array already
did — not a behavior change, just an equivalent expression that satisfies
the type. `TabsContainer.tsx` preserved a real pre-existing bug: its
computed class key `` `tabCol${index === 0 ? 'Left' : 'Right'}` `` only
has a matching entry in `styles` for `tabColLeft` — for any non-first
child, `classes.tabColRight` is `undefined`, which `classNames` turns
into the literal class name `"undefined"`. Documented and preserved,
not fixed to add the missing `tabColRight` style.

`Modal/index.tsx` is a class component that spreads its entire `props`
bag into two differently-shaped child components (`ContentLayout`,
`DialogWrapper`); rather than casting the spread to `Record<string,
unknown>` (which fails — TS can't tell an index-signature object
provides specific *required* named properties), `ModalProps` was written
out with all the fields the JsonSchema engine actually passes through
(`properties`, `onChange`, `originDocument`, `stepName`, `schema`,
`actionText`, etc.), so the plain `{...this.props}` spread satisfies both
children's prop types directly. Two MUI v5 type gaps: `flexDirection:
'row-reverse'` needed `as const` (string literal widening), and
`Button`'s `classes={{ label: ... }}` — `label` was a v4 classKey,
removed from v5's `ButtonClasses` — silently no-ops today and is
preserved via a `Record<string, string>` cast rather than dropped.

## JsonSchema elements, ninth batch

Converted `StripeKYC`. New ambient declaration: `types/qrcode-react.d.ts`
(`qrcode.react` ships no types at all — no `types` field, no
`@types/qrcode.react`), scoped to the props this component actually
passes (`value`, `className`, `renderAs`, plus the rest of the
documented v1 API for completeness).

Hit the same "dispatch(thunk) returns the thunk's own type, not its
resolved value" gap as `bindActionCreators` elsewhere in this migration —
`useDispatch()`'s default typing is generic (`<T>(action: T): T`), so
`await dispatch(putStripe(id))` would otherwise type as the thunk
function itself rather than the actual API response. Fixed with a local
`AsyncDispatch = (thunk: unknown) => Promise<unknown>` cast on the
`dispatch` instance, applied once up front rather than at each call site.

Preserved two real pre-existing quirks: `<DoneIcon size={16} />` passes a
`size` prop that isn't part of `SvgIconProps` (MUI icons use `fontSize`)
and silently no-ops as a passthrough DOM attribute; and
`window.open(url, '_blank').focus()` assumes `window.open` never returns
`null` (e.g. under a popup blocker) — cast rather than optional-chained,
so a real `null` still throws exactly as it did before. Also had a
`useCallback(fn)` with no deps array (same missing-`DependencyList` gap
as `Tabs/useTabs.ts`'s `useMemo` in the previous batch) — here given `[]`
instead of rewritten as a plain function, since the callback closes over
no reactive values and only setState setters (stable across renders), so
memoizing has no observable behavior difference either way.

## JsonSchema elements, tenth batch

Converted `UserList` (+ `UserTable`). Hit the cross-app-module divergence
pattern again, this time on `actions/users`: admin-front has its own
`src/application/actions/users.ts` with `searchUsers(searchData, params?,
props?)` (matching this component's `'?brief_info=true'` second-argument
call site), while cabinet-front's local override only accepts
`searchUsers(searchData)` — front-core's own `actions/users.ts` (a third,
unused-by-either-app copy) matches neither exactly. Since the file must
typecheck under both apps' path-alias resolution, `bindActionCreators`'s
result is cast to the call site's actual usage shape rather than typed
from whichever `searchUsers` happens to resolve. Also switched
`mapDispatchToProps`'s `dispatch` parameter from a hand-rolled `(action:
unknown) => unknown` alias to redux's own `Dispatch` type — the informal
alias made `connect()`'s own type inference reject the whole
`mapDispatchToProps` function, matching the working pattern already used
in `SignerList`.

`UserTable.tsx` passes many props into `components/DataTable`'s
`DataTableStated` — still a plain `.jsx` file wrapped in `translate()`,
whose TS-inferred prop type (from `allowJs` inference, no `checkJs`)
collapses to just `{ t: Translate }`, rejecting every other prop as
excess. Cast to `React.ComponentType<Record<string, unknown>>` before
use, the same fix already applied in `UserSelect/index.tsx` for the same
component.

New ambient addition: `lodash/fp`'s `difference` (only `merge`/`equals`
were declared before) — typed loosely (`unknown, unknown) => unknown[]`)
since the one call site here passes an object map as the first argument
where real lodash's signature documents an array, and preserving the
actual (rather than documented) usage was the point of these ambient
files from the start.

## JsonSchema elements, eleventh batch

Converted `Infobox`. Notable only for scale (one 550+ line file, all
plain conversion) and for a naming collision worth flagging for future
readers: the module-level `import theme from 'theme'` (the app's static
layout config, read once for `defaultLayout`/`material`) is a completely
different value from the `theme: Theme` parameter of the `withStyles`
`styles` callback further down (the live MUI theme) — the second shadows
the first inside `styles`. Both needed casts for their own
non-standard custom properties (`defaultLayout`/`material` on the app
config; `materialContainer.borderRadius` on the MUI theme), which was
straightforward once the two `theme`s were untangled. No new preserved
bugs and no new ambient declarations.

## JsonSchema elements, twelfth batch

Converted `ArrayElement` (+ `components/ArrayElementContainer`,
`ArrayElementAddBtn`, `ArrayElementItem`). Found two harmless dead props
in the original: `ArrayElement`'s render passed `arrayItems` and
`noBorder` to `ArrayElementAddBtn`, and passed `border` to
`ArrayElementItem` — none of the three are destructured or read anywhere
in the receiving component's actual body (only declared in old
`propTypes`/`defaultProps`, never used). Since they were already
observably inert, the pass-throughs were dropped rather than preserved
via casts — unlike the "no-op className/prop" bugs documented in earlier
batches, there is no behavior to preserve here (the value was never read
before or after). Otherwise a mechanical conversion; no new ambient
declarations.

## JsonSchema elements, thirteenth batch

Converted `DocumentSharing` — a cabinet-front-only ("Diia Share")
feature, and a good example of how many cross-app divergences one file
can carry at once:

- `application/actions/task`'s `externalReaderCheckData` has a different
  arity per app (admin-front: `(documentId, body)`; cabinet-front:
  `(documentId, body, isIgnore, async)`, all required, no defaults) —
  the call site here only ever passes two arguments. Used the namespace
  + cast fallback (`import * as taskActions from ...`) already
  established for this class of problem, rather than a named import.
- `modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages`
  only exists in cabinet-front — admin-front has no such module at all.
  New ambient fallback: `types/app-extReaderMessages.d.ts`, following the
  exact pattern of `types/app-externalReader.d.ts`.
- `components/FileDataTable`, like `DataTableStated` before it, is a
  plain `.jsx` file wrapped in `translate()`, whose allowJs-inferred prop
  type collapses to just `{t}` — cast to
  `React.ComponentType<Record<string, unknown>>` before use.

Also extended `types/qrcode-react.d.ts` with an `onClick` handler prop
(this component wires a click-to-open-app handler onto the rendered QR
SVG — a real, intentional behavior, not a no-op, so it was added to the
ambient interface directly rather than cast around).

## JsonSchema elements, fourteenth batch

Converted `DocumentSharingV2` — its `index.jsx` was byte-for-byte
identical to `DocumentSharing`'s (same component name internally, same
logic, only the asset directory differed), so the already-converted
`DocumentSharing/index.tsx` was copied over rather than re-derived from
scratch. Left a note here rather than deleting one as a "duplicate":
nothing in this pass investigated why two identical copies exist (schema
authoring convenience, an abandoned fork, etc.) or whether anything still
references `DocumentSharingV2` by name — out of scope for a typing pass.

## JsonSchema elements, fifteenth batch

Converted `VideoPlayer` (+ `useVideoPlayer`, `providers` (now `.tsx`,
since it renders JSX), `styles`). `react-youtube` ships real types, but
its own `.d.ts` imports `YouTubePlayer`/`Options` from
`youtube-player/dist/types` — a module that (like `leaflet` before it)
ships no type declarations of its own, so those imported types silently
collapse to `any` under `skipLibCheck`. Rather than add an ambient
`youtube-player` module (nothing here needs its full shape), a local
`YoutubePlayerLike` interface declares only the handful of methods this
hook actually calls (`getCurrentTime`, `getDuration`, `getPlaybackRate`,
`getIframe`, `loadModule`).

Two `setInterval`/`clearInterval` calls were written as `window.setInterval`
/`window.clearInterval` in a way that resolved to Node's `Timeout` return
type in one spot and a bare `number` in another (same global, inconsistent
overload resolution depending on the `window.` prefix) — switched to the
bare global `setInterval`/`clearInterval` throughout so the ref's type
(`ReturnType<typeof setInterval> | null`) matches every call site; no
behavior change, just consistent typing of the same runtime timer handle.

`ElementGroupContainer`'s `maxWidth` prop is typed `number | null`, but
`VideoPlayer` computes it through `fitWithinContainer()`, which can
return a CSS min() string (e.g. `'min(500px, 100%)'`) — already true
before this conversion, since the prop is only ever spread into an inline
style object where a string works fine at runtime. Cast at the call site
rather than widening the shared container's prop type for one caller.

## JsonSchema elements, sixteenth batch

Converted `CheckboxGroup` (+ `components/layout`, `components/Property`).

Found a genuinely unreachable branch, twice (`isDisabled` and `isHidden`
in `index.tsx`): both did `x = evaluate(...) === true` and then checked
`x instanceof Error` — but `=== true` always produces a plain boolean, so
that follow-up `instanceof Error` check (guarding an error-reporting
`.commit()` call) could never be true, in the original JS as much as
here. This is different from the "preserved bugs" documented in earlier
batches (e.g. `DynamicCheckboxGroup`'s `compareArrays`), where the buggy
code path is reachable and produces an observably wrong result — here
the branch is dead code by construction, not a latent bug with behavior
to preserve. TS enforces this at compile time too (`instanceof` requires
an object type, and a `boolean` can never be one), so the dead branches
were removed rather than cast around, with a comment explaining why.

## JsonSchema elements, seventeenth batch

Converted `Textarea` (+ `settings`, `sanitize`) — the Quill rich-text
editor element, and the first file in this migration to touch Quill's
dynamic blot/module registration API directly.

`react-quill`'s own `.d.ts` uses `export = ReactQuill` with a `static
Quill: typeof Quill` member on the class, not a named `Quill` export —
so the original `import ReactQuill, { Quill } from 'react-quill'` (which
only worked because bundler CJS interop turns named imports into property
access on the whole module, landing on `ReactQuill.Quill` by coincidence)
doesn't type-check as written. Rewritten as `import ReactQuill from
'react-quill'; const Quill = ReactQuill.Quill;` — identical runtime value,
now reached through the path the types actually support. `Quill.import()`
itself returns `any` per `@types/quill` (a library-declared `any`, not one
we introduced), so the dynamically-registered blot/module classes that
extend its return value stay loosely typed by necessity — casts were used
only where a specific member (`domNode`, `blotName`, `tagName`) needed to
be read or set on top of that `any` base.

New ambient addition: `sanitize-html.d.ts` gained `allowedClasses` (this
file's `sanitize.ts` is the first user of that option). Preserved one
no-op: `classes.dialogContentWrappers`, applied to the sample dialog's
title/content/actions, was never defined in this file's own `styles`
object and has always resolved to `undefined`.

## JsonSchema elements, eighteenth batch

Converted `Payment` (+ `layout`, `qrLayout`, `phoneLayout`) — the three
layout variants for the payment control (default/card, QR, phone+SMS).
`modules/tasks/pages/Task/components/SuccessMessage` is cabinet-front-only
(admin-front has no such module); new ambient fallback
`types/app-successMessage.d.ts`, same pattern as `app-extReaderMessages.d.ts`.

`Payment/index.tsx`'s `render()` builds `properties = {...this.props,
...this.state}` and spreads it into three different layout components —
TS spread-type inference drops a source type's index signature (the
catch-all `[key: string]: unknown` on `PaymentProps`), so the merged
object's inferred type only has the explicitly-declared fields, not the
many passthrough JsonSchema props (`sample`, `description`, `classes`,
etc.) actually flowing through it. Cast the merged object to `Record<string,
unknown>` once at its construction site rather than re-declaring every
passthrough field.

Preserved two more no-op classKeys (`buttonLabel` in `qrLayout`,
`refreshIcon` in `phoneLayout` — same shape as prior batches: referenced
but never defined in that file's own `styles`) and one always-missing
required prop: `<InputAdornment>` needs a `position` prop that this call
site never provided — MUI logs a warning and still renders, so preserved
via an empty prop-spread cast rather than adding the "correct" position.

## JsonSchema elements, nineteenth batch

Converted `SelectFiles` (+ `components/Limits`, `SelectFileArea`,
`FileListPreview`). Deleted `components/FileList.jsx`: confirmed dead
code (a second, unused `Layout` component — `index.jsx` only ever
imported `SelectFileArea`/`FileListPreview`; repo-wide search found zero
references to it), following the same delete-confirmed-dead-code pattern
as `editor-old/` earlier in this migration.

New ambient declaration: `types/react-file-icon.d.ts` (no types shipped
at all, scoped to the `FileIcon`/`defaultStyles` API this component
actually uses). Preserved two more no-ops, both on `<Dropzone>`: `name`
isn't a real react-dropzone v10 prop, and `activeClassName` was removed
from the API generations ago (this component already computes its own
`active` state and applies the class itself) — neither has done anything
since at least the currently-installed react-dropzone version.

`SelectFileArea`'s prop type needed a catch-all `[key: string]: unknown`
rather than an exact field list: `ProtectedFile` (converted several
batches ago) also renders this same component and passes `sample` and
`active` props that `SelectFileArea` itself has never read — that was
invisible while the file was still untyped JS, and only surfaced once
this file gained a real interface.

## JsonSchema elements, twentieth batch

Converted `StringElement` (+ `components/layout`, `mask`, `CustomValueSelect`)
— one of the most widely-reused elements in the tree (text/select input
with masking, adornments, custom-value dialog, dark-theme variants).

New ambient declaration: `types/react-input-mask.d.ts` (no types shipped).
`react-file-icon`-style loose interface, scoped to the props actually
passed (`mask`, `maskChar`, `inputRef`, `formatChars`, plus a passthrough
index signature since the wrapping `Masked` component forwards arbitrary
MUI `inputComponent` props to it).

Found `__test__/StringElement.test.jsx`: a Jest+Enzyme test that imports
`CustomValueSelect.jsx` and `StringElement/index.jsx` with hardcoded
`.jsx` extensions. It is not part of the actual test suite — this
project's `vitest.config.mjs` only collects `*.vitest.{ts,tsx}` files,
and `enzyme` isn't even an installed dependency — so it already couldn't
run. Renaming the source files to `.tsx` would have left its hardcoded
extension imports dangling; fixed those two import paths (dropped the
extension, matching the rest of the codebase) rather than either
resurrecting the file into the real suite or deleting it, since neither
was asked for and both are bigger calls than a typing pass should make
unilaterally.

## JsonSchema elements, twenty-first batch: DataTable + Spreadsheet

Converted `DataTable` (14 files) and `Spreadsheet` (17 files) together —
31 files in one pass. These two element groups turned out to be
cross-coupled: `DataTable/index.jsx` imported `SpreadsheetErrors`,
`dataMapping` (`input`/`output`), and `parsePaste` directly from the
`Spreadsheet/` directory, while `DataTable/DataTable.jsx` imported
`input` from its *own* differently-shaped local `dataMapping.jsx` — so
converting one cleanly required converting the other's shared files in
the same pass. Both directories are near-duplicates at the file-name
level (`SheetCell`, `SheetLayout`, `SheetHeader`, `ClearDataButton`,
etc.) but differ in real ways in nearly every file — `DataTable` is the
older/simpler grid (uses `SchemaForm` inline per cell), `Spreadsheet` is
the newer one (uses `SchemaPreview` + a floating `Popover` editor, adds
undo/redo via `hooks/useUndo`, dedupes errors by `dataPath`, normalizes
bracket-style error paths). Each pair was converted to preserve its own
distinct behavior rather than unified.

**`components/DataSheet`** (the underlying `react-datasheet` grid
wrapper both directories render through) is still plain JS and was
treated as an external dependency, cast the same way as `DataTableStated`/
`FileDataTable` earlier (`as unknown as React.ComponentType<Record<string,
unknown>>`) — converting it was out of scope for this batch.

**New ambient declarations:** `types/react-copy-to-clipboard.d.ts` (no
types shipped, used by `SpreadsheetMenu`'s row/cell copy actions).
`handlebars` and `html-to-printer` (used by both `ExportToPdfButton`
copies) both ship real types already, so no ambient file was needed
there.

**A genuine bug in `Spreadsheet.tsx`, preserved-but-necessarily-rewritten:**
`const errors = React.useCallback([].concat(...).filter(Boolean), [deps])`
passes an already-computed **array** as `useCallback`'s first argument
instead of a function. TypeScript's `useCallback<T extends Function>`
signature rejects this outright (array is not assignable to `Function`),
but the original's *runtime* behavior was already exactly equivalent to
`useMemo` — React's `useCallback`/`useMemo` share the same underlying
"compare deps, cache the value" mechanism regardless of whether the
cached value happens to be callable. Rewritten as `useMemo(() =>
arrayExpr, deps)`, which reproduces the original's actual memoization
behavior (not just its output) while satisfying the type system — a
case where the literal original syntax is impossible to keep, but the
observable behavior is fully preserved rather than approximated.

**Recurring pattern across nearly every file in this batch:** the
render-prop callbacks passed into `<DataSheet>` (`rowRenderer`,
`cellRenderer`, `dataEditor`, `sheetRenderer`) receive their `props`
argument from `react-datasheet` internals at runtime, typed only as
`Record<string, unknown>` on our side — spreading that into a
strictly-typed child (`SheetRow`, `SheetCell`, `DataEditor`,
`SheetLayout`) fails TS's "spread erases index signatures" limitation
the same way `Payment`'s `properties` spread did a few batches back.
Fixed the same way: cast the spread source to the exact shape the
target's required fields need (e.g. `props as unknown as { row: number;
col: number }`) rather than loosening every child component's props to
all-optional.

Several more "prop accepted but never read" no-ops surfaced once real
types were introduced (same category as `SelectFileArea`'s `sample`/
`active` last batch): `SheetLayout` (DataTable) receives `items`/`name`/
`readOnly` it never uses; `SpreadsheetMenu` receives `value` it never
reads (the component's own source even has it commented out with "—
Currently unused, left commented for future use"). Both were added to
their respective prop interfaces as accepted-but-inert fields rather
than stripped from the call sites.

## Bug fix: authContracts.ts rejected object-shaped authUserRoles

Reported symptom: admin-front showed an "Auth user.authUserRoles must be
an array of strings" error on boot, before the unit list loaded.

Root cause: `helpers/authContracts.ts` (added earlier in this migration,
converting `reducers/auth.js`/`actions/auth.js` to TS) validates the
`/me` response shape via `assertAuthUser`, called from
`reducers/auth.ts`'s `REQUEST_USER_INFO_SUCCESS` handler — i.e. right
after login, before the units list request resolves, matching the
reported timing. The validator required `authUserRoles` to be a strict
array. In production it isn't one: the backend's underscore-to-camelCase
key conversion (`admin-api`'s `convertUnderscoreKeysToCamelCase` →
lodash `mapKeysDeep`) runs `_.mapKeys` over the payload, and lodash's
`_.mapKeys` on an array always returns a plain object with stringified
numeric keys (`['admin','user']` → `{0:'admin', 1:'user'}`) — a
well-known lodash gotcha. So `authUserRoles` (and `courtIdUserScopes`,
validated in the same loop) arrive as `Record<string,string>`, not
`string[]`.

This was a gap introduced by the new validator, not a pre-existing bug:
the original `reducers/auth.js` did no shape validation at all before
this migration (verified via `git show HEAD:packages/front-core/reducers/auth.js`).
The rest of the codebase already assumed the object-shaped form —
`helpers/checkAccess.ts` reads `authUserRoles` via `Object.values(...)`,
and `assertAuthUser`'s own `assertMembership` (for `authUserUnits`/
`authUserUnitIds`) already accepts `Array.isArray(items) || isRecord(items)`
for exactly this reason; `authUserRoles`/`courtIdUserScopes` were just
missed when that tolerance was added.

Fix: loosened the `authUserRoles`/`courtIdUserScopes` check in
`assertAuthUser` to accept array-or-record-of-strings (matching
`assertMembership`'s existing pattern), and widened
`types/auth.ts`'s `AuthUser.authUserRoles`/`courtIdUserScopes` to
`string[] | Record<string, string>` to match. Added a regression test
in `authContracts.vitest.ts` covering the object-shaped case. Did not
touch `actions/auth.ts`'s `isRole()` (`courtIdUserScopes.includes(check)`)
— that call assumes a real array and is unchanged from the pre-migration
original; no evidence it's hit the same failure, and "fixing" it without
a reported symptom would be scope creep.

## JsonSchema elements, twenty-second batch: EventsCalendar

Converted `EventsCalendar` (+ `eventCalendar`, `slotCalendar`,
`eventStyleTypes`) — a new twist on the cross-app pattern: this time an
entire **npm package**, not just a project file, doesn't exist for one
app. `@fullcalendar/*` (`react`, `daygrid`, `timegrid`, `interaction`,
`core`) is a `cabinet-front`-only dependency (booking/appointment slots)
— it isn't in admin-front's `package.json` at all. Since `tsconfig.json`
globs all of `packages/front-core/**/*.ts(x)` regardless of whether an
app's own runtime ever reaches that file, admin-front's `tsc` still
needed these imports to resolve. New ambient fallback
`types/app-fullcalendar.d.ts`, same "fills the gap only where the real
package is absent" contract as the existing app-module fallbacks
(`app-successMessage.d.ts`, etc.) — cabinet-front's real, fully-typed
`@fullcalendar` packages take priority wherever they actually resolve.

Confirmed this file is genuinely unreachable from admin-front's own
build graph before converting (each app has its own
`application/components/JsonSchema/elements/index.jsx` override; admin-front's
never references `EventsCalendar`, cabinet-front's does) — otherwise
admin-front's production build, which doesn't tree-shake at the
whole-module level for anything actually imported, would have failed
outright on the missing package well before this migration ever touched
the file.

Also hit the now-familiar "app has its own action module missing one
export" pattern again: `application/actions/registry`'s
`requestRegisterKeyRecords` only exists in cabinet-front's copy, not
admin-front's — same namespace-import-and-cast fix used for
`getExternalReaderData` and others earlier in this migration.

## JsonSchema elements, twenty-third batch: Register

Converted `Register` (`index`, `defaultProps`, `components/Chip`,
`ExternalRegister`, `RegisterSelect`, `RelatedKeyRegister`,
`SingleKeyRegister`) — the biggest single-directory batch so far
(`SingleKeyRegister.tsx` alone is ~1000 lines). Deleted
`SingleKeyRegister.new/` first: it was dead code (`Preview.jsx` imported
a path, `.../SingleKeyRegister/toOption`, that doesn't exist —
`SingleKeyRegister.jsx` is a flat file, not a directory — and the whole
subtree had zero repo-wide references).

Cross-app missing-export pattern, twice more: `requestRegisterRelatedKeyRecords`
(used by `RelatedKeyRegister`) and `requestRegisterKeyRecordsFilter` (used by
`RegisterSelect` and `SingleKeyRegister`) both exist only in cabinet-front's
`application/actions/registry`, not admin-front's. Same
namespace-import-and-cast fix as `EventsCalendar`'s
`requestRegisterKeyRecords`.

New ambient declaration `types/deepdash-paths.d.ts` for `deepdash/paths`
(a different submodule than the already-declared `deepdash/findPathDeep`),
used by `SingleKeyRegister`'s getter-control lookup.

Preserved a genuinely different (and riskier) mechanism as-is:
`RegisterSelect.getDisabled()` calls a raw `eval(disabled)(rootDocument.data)`
— not the project's `helpers/evaluate` wrapper used everywhere else in this
codebase. This is pre-existing behavior, not something introduced by the
migration (confirmed via `git show` on the pre-migration `.jsx`), and
"upgrading" it to `evaluate()` would be an unrequested behavior change, so it
was kept exactly as-is (with a comment noting why). `CustomDataSelect.jsx`
elsewhere in the tree has the same raw-`eval` pattern, confirming this isn't
an isolated one-off.

Typing notes:
- `uniqbyValue<T extends { value: unknown }>` requires `value` to be a
  **required** property, not optional — an object type with `value?: X` does
  not satisfy `T extends { value: unknown }` even though `unknown` accepts
  `undefined`, because TS checks property presence, not just value-type
  compatibility. Both `ExternalRegister`'s `SelectOption` and
  `SingleKeyRegister`'s `RegisterOption` needed `value: unknown` (required)
  rather than `value?: ...`.
- `mapDispatchToProps(dispatch: Dispatch)` needs redux's own `Dispatch` type,
  not a local `(action: unknown) => unknown` alias — `connect()`'s
  `MapDispatchToPropsFactory` overload rejects the custom alias
  ("Types of parameters 'action' and 'action' are incompatible"). The
  `EventsCalendar` batch's local `Dispatch` alias was fine there because that
  file uses `useDispatch()` directly, not `connect()`.
- `Array.prototype.filter(Boolean)` does not narrow `unknown[]` — chaining a
  further `.filter(({ prop }: SomeType) => ...)` after it fails because
  `SomeType` isn't assignable from `unknown` in either `filter` overload. Cast
  right after `.filter(Boolean)` (`as SomeType[]`), then chain the
  destructured `.filter` with no annotation needed, same order already
  established for the sibling `parentPropertyValues` computation in the same
  file.
- `evaluate()`'s first parameter is strictly `string`; a couple of call sites
  pass a value typed as `number | null | undefined` (`keyId`) or a narrowed
  `string | true` (`setDefaultValue` after a truthy check) — both cast at the
  call site rather than widened, since the surrounding code already assumes
  these are string-shaped when truthy (numeric `keyId` values are cast the
  same way `getEvaluatedKey`'s return already treated them).

## JsonSchema elements, twenty-fourth batch: small flat-file elements

Converted the ten smallest remaining flat (non-directory) files in
`elements/`: `CustomWidthTooltip`, `Portal`, `GridItem`, `IntegerElement`,
`ObjectElement`, `Divider`, `TableData`, `Calculator`, `ExpansionPanels`
(exported as `Accordions`), `UnitSelect`.

Notable points:
- `Divider.jsx`'s JSX references `classes.root`, a class key that doesn't
  exist in this file's own `styles` object (only `divider`/`noMargin`/`darkTheme`
  are defined) — always `undefined` at runtime, and pre-existing (not
  introduced by this migration). Preserved via `(classes as Record<string,
  string>).root` with a comment, same treatment as the MUI v4→v5
  removed-classKey pattern from earlier batches.
- `Calculator.jsx` calls `waiter.addAction(path.concat('calculator'), ...)` —
  `addAction`'s first parameter is typed `string`, but the call passes an
  *array* (relying on JS's implicit array-to-string coercion when used as an
  object key internally). Cast at the call site
  (`path.concat('calculator') as unknown as string`) rather than "fixing" the
  call to `.join()`, since that would be an unrequested behavior change (the
  coerced string form is already what the internal `Record` key lookup uses).
- `Portal.tsx` → `ObjectElement.tsx`: spreading a `Record<string, unknown>`-cast
  props object into a JSX call does not satisfy a specifically-named required
  prop (`schema`) on the target component's interface — same "spread erases
  index signature" limitation noted in earlier batches, just surfacing as
  "property missing" here instead of a type-mismatch. Fixed by passing
  `schema` explicitly alongside the spread, rather than loosening
  `ObjectElementProps.schema` to optional (it's genuinely required by
  `ObjectElement`'s own logic).

## JsonSchema elements, twenty-fifth batch: boolean + Popup labels

Resumed from an incomplete twenty-fourth batch and first repaired its remaining
TypeScript errors in `CalculateButton`, `PreviewDocumentDirect`, and
`SchemaEditor`. The fixes keep the existing runtime behavior while making the
still-JavaScript schema editor an explicit typed boundary.

Converted `BooleanElement` and the three small Popup display components
(`FieldName`, `FieldValue`, and `FieldWithBackGround`). `BooleanElement` has a
behavior test covering required radio choices, optional checkbox changes,
read-only state, hidden state, and generated IDs. The test also exposed that
MUI received `aria-label` on its wrapper while `FormControlLabel` supplied the
same visible label, producing duplicate accessible names. Labels now go to the
actual input through `inputProps`; this also fixes the pre-existing misspelled
`arial-label` on the “No” radio.

## JsonSchema elements, twenty-seventh batch: more small flat-file elements

Converted `RegisterTable`, `Tags`, `CalculateButton`, `CustomApiData`,
`PreviewDocumentDirect`, `SchemaEditor`, `Registerlink` (continuing the
ascending-size sweep of flat files in `elements/`; note this batch was worked
concurrently with another pass that independently reached `BooleanElement`,
the `Popup` display sub-components, `VerifiedUserInfo`'s field renderers,
`RegisterList`, and several `SpreadsheetLite` controls — see the surrounding
batch notes — so the size ordering across these batches overlaps rather than
being strictly sequential; batch numbers here just reflect append order, not
a single linear pass).

- `Tags.jsx` uses `@lifayt/material-ui-chip-input`, which turns out to be
  another cross-app npm-package-absence case like `EventsCalendar`'s
  `@fullcalendar/*`: it's only in admin-front's `package.json`, absent from
  cabinet-front entirely. New ambient fallback `types/app-chipinput.d.ts`,
  scoped to the handful of props this file actually uses, same contract as
  the other app-module/app-package fallbacks.
- `Registerlink.js` and `CustomApiData.jsx` both hit the familiar
  cross-app missing-export pattern (`requestRegisterKeyRecords` and
  `getRequestCustomData` respectively, both cabinet-front-only exports of
  `application/actions/registry`) — same namespace-import-and-cast fix used
  throughout the `Register` and `EventsCalendar` batches.
- `PreviewDocumentDirect.jsx` chains `formElement(connect(...)(Component))`;
  `formElement` expects `React.ComponentType<Record<string, unknown>>`, so
  the connected component needs a cast at that boundary, same shape as the
  `withStyles(translate(...))` untyped-cast pattern from earlier batches.

## JsonSchema elements, twenty-sixth batch: small renderer and spreadsheet controls

Converted twelve additional files: the five small `VerifiedUserInfo` field
renderers (`renderTextField`, `renderRadioFormat`, `renderPlaceField`,
`renderCitizenshipField`, and `renderCountryField`), `RegisterList`'s popup
renderer, and six `SpreadsheetLite` controls (`RedoButton`, `UndoButton`,
`CustomAddRowsComponentMaterial`, `ClearDataButton`, `ImportButton`, and
`ColumnChooser`).

The country and citizenship renderers use the established namespace-import
boundary because `requestRegisterKeyRecords` is supplied by cabinet-front but
is absent from admin-front's action alias. Spreadsheet controls isolate the
runtime-injected `theme.defaultLayout` flag behind a narrow optional type, as
the base shared theme does not declare that app-specific property. File input
and numeric input event handling now uses typed DOM targets while retaining the
same values and callbacks.

Both application typechecks and the cross-app module-resolution check pass
after this batch.

## JsonSchema elements, twenty-eighth batch: Popup (Wrapper, Dialog, index)

Finished converting `Popup` — the three small display sub-components
(`FieldName`, `FieldValue`, `FieldWithBackGround`) were already done in an
earlier batch by a concurrent pass; this batch converts the remaining three:
`Wrapper.tsx`, `Dialog.tsx` (the large ~1150-line popup-editing dialog, by far
the biggest file in this directory), and `index.tsx`.

- Another cross-app whole-*component* absence, distinct from the
  action-function-export pattern used everywhere else: `Dialog.jsx` imports
  `modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages`
  by direct path, and that module (and the whole `modules/tasks/...` tree)
  simply doesn't exist in admin-front — `Popup` is commented out of
  admin-front's own `JsonSchema/elements` index override, exactly like
  `EventsCalendar`'s relationship to admin-front. Found the ambient fallback
  `types/app-extReaderMessages.d.ts` already in place (written by the
  concurrent pass mentioned above) rather than needing to add one.
- `application/actions/task`'s `getExternalReaderCaptcha` is cabinet-front-only
  (admin-front's copy lacks it) — same namespace-import-and-cast fix as
  every other cross-app missing-export case. Note `externalReaderCheckData`
  from the same module exists in *both* apps but with different signatures
  (admin-front takes 2 params, cabinet-front 4 with extra optional-ish
  trailing args) — no cast needed there since each app's own `tsc` run
  resolves to its own copy.
- `DialogWrapperProps.rootDocument` is `{...} | null` (matching the original
  `PropTypes.object` + `defaultProps: null`, i.e. optional-but-realistically-
  always-provided). Rather than widen the type to hide that nullability,
  gave the handful of methods that read `this.props.rootDocument` a local
  `rootDocument = rootDocumentProp as {...}` cast right after destructuring —
  preserves the original's unguarded `.data` access (and its would-crash-if-
  actually-null behavior) instead of adding a defensive check that wasn't
  there before.
- `validateData(...)` and `handleTriggers(...)` are called with more
  positional arguments than their typed signatures declare (extra args the
  functions simply ignore at runtime — a pre-existing harmless quirk, not
  introduced here). Cast the function reference itself
  (`(fn as unknown as (...args: unknown[]) => ReturnType)(...)`) at the call
  site rather than dropping the extra arguments, to keep the call site
  textually identical to the original.
- Two more pre-existing "look-alike but wrong" `classes` accesses preserved
  as-is (both `Divider`-`classes.root`-style quirks from earlier batches):
  `Dialog.tsx` reads `classes.btnpadding` where the actual generated key is
  `btnPadding`, and `Popup/index.tsx`'s inherited `Wrapper`/`ElementContainer`
  spread reads a `classes.fixTop` that was never declared in `Wrapper`'s own
  styles either. Both cast via `(classes as Record<string, string>)` at the
  access site.
- `Wrapper.tsx` chains `withStyles(styles)(translate('Elements')(Wrapper as
  never))`; casting the *inner* component to `never` (the pattern used
  elsewhere for one-off untyped-JS-consumption casts) turns out to poison the
  *entire* exported component's inferred prop type as `never` for any
  consumer — every prop assigned to `<Wrapper .../>` from `Popup/index.tsx`
  then failed to type-check, and the JSX element itself became invalid
  (`JSXElementConstructor<never>`). Fixed by casting only the final default
  export to `React.ComponentType<Record<string, unknown>>` instead of casting
  an intermediate value to `never` — the usual untyped-component-cast pattern
  applied at the export boundary rather than mid-chain.
- `Popup/index.tsx`: `Array.isArray(itemValue)` on an `unknown`-typed value
  narrows it to `any[]` within the `isArray &&` branch; casting that `any[]`
  straight to a `Record<string, {...}>` shape is flagged as insufficiently
  overlapping (arrays vs. record types) even though it's a legitimate
  "trust me, this array is really keyed like a record" cast here — routed
  through an intermediate `as unknown as X` to satisfy the checker.
- Several `itemValue && <JSX-ish expression>` patterns leaked `itemValue`'s
  `unknown` type into the overall JSX-child type when `itemValue` was falsy
  (`unknown` isn't part of `ReactNode`). Wrapped the guard in `Boolean(...)`
  wherever this occurred so the falsy branch is `false` (a valid `ReactNode`)
  instead of `unknown`.

## JsonSchema elements, twenty-ninth batch: more small flat-file elements

Converted `RegisterForm`, `DirectPreview`, `DataMap`, `PreviewDocument`,
`CurrencyInput` (continuing the ascending-size sweep of flat files, picking
up files not touched by the concurrent pass working through `VerifiedUserInfo`
/ `RegisterList` / `SpreadsheetLite`).

- `RegisterForm.jsx` hits the usual cross-app missing-export case
  (`requestRegisterKeyRecords`, cabinet-front-only) — same
  namespace-import-and-cast fix as everywhere else.
- `@lupus-ai/mui-currency-textfield` (used by `CurrencyInput`) ships no type
  declarations at all in either app (not a cross-app absence — genuinely
  untyped in both). New unconditional ambient declaration
  `types/mui-currency-textfield.d.ts`, scoped to the props this file uses.
- Two more `withStyles(...)`/`translate(...)`-wrapped plain-JS components
  needed the untyped-component-cast-at-import pattern for the first time
  since they hadn't been consumed from a `.tsx` file before:
  `components/Preloader` (used by `PreviewDocument`) and
  `components/FileViewerDialog` (used by `DirectPreview`).
- `DataMap.jsx` and (separately) `PreviewDocument.jsx`'s underlying
  `FileDataTable` set a non-standard `row="false"` attribute on a plain
  `<div>` and (respectively) pass an icon a `size` prop its real SVG type
  doesn't declare — both pre-existing, silently-ignored-at-runtime quirks,
  preserved via a `{...(obj as unknown as Record<string, unknown>)}` spread
  rather than dropped or "corrected" to `width`/`height`.
- Confirmed `application/actions/task`'s `getDocumentWorkflowFiles` exists
  in *both* apps with matching signatures, so `PreviewDocument.jsx` needed
  no cross-app cast — a useful negative case alongside all the
  cross-app-missing-export instances documented elsewhere.

## JsonSchema editor, thirtieth batch: definitions and visual page management

Converted all 50 schema-editor element definitions and their barrel to
TypeScript. These files are declarative schema templates, so TypeScript can
infer their nested data without widening them to generic records.

Also converted the editor entry point, element lookup helper, editor layout,
mode selector, run-process action, editable heading, schema-state hook, visual
editor root, editor dispatcher, collapse button, and the add/sort/delete page
components. `JsonSchemaEditorDialog` and the icon chooser were also migrated;
the latter now uses MUI's current `ListItemButton` API instead of the removed
`ListItem button` prop. The recursive `EditorSchema` contract now flows through visual
page management, while drag events and content-editable DOM events use their
library and React event types. The `Editable` default component was corrected
from the undefined identifier `h1` to the intrinsic element name `'h1'`.

Added a small ambient declaration for `json5`, whose installed package has no
types in either application. Both application typechecks and cross-app module
resolution pass after this batch.

## JsonSchema editor, thirty-first batch: Monaco core and dead-code removal

Converted the Monaco selection hook and central code editor, plus
`CreateGroup` and `DraggableElement`. The code editor now receives both editor
and Monaco instances from the documented mount callback instead of relying on
an undeclared global. Its previously implicit `file-saver`, snackbar, and
admin-only BPMN AI action dependencies are explicit typed boundaries. Removed
an invalid cleanup call on `useControlDictionaryProvider.setEditorInstance`,
which returns `void` rather than a disposable listener.

Removed five confirmed-dead editor files rather than migrating them: the old
Ace selection hook, unused JavaScript validator, commented-out JSON insertion
helper, unused drag image, and unused visual-editor theme. Added narrow ambient
declarations for the cabinet-absent BPMN AI action and the untyped
`file-saver` package. Both app typechecks and typed lint pass after this batch.

## JsonSchema editor, thirty-second batch: obsolete Ace helpers

Removed the unused `useSuggestions` and editor-local `useTranslate` hooks.
Both target the retired Ace editor API (`aceRef`, `editor.session`, folds, and
Ace cursor layers), and neither has a consumer in the current Monaco editor.
Keeping them would preserve an obsolete editor implementation rather than
advance the current TypeScript and React path. Both app test suites still pass
after removal (804 tests total).

## JsonSchema elements, thirty-third batch: Tooltip, Select, RelatedSelects, SelectUser

Converted four more flat files: `Tooltip`, `Select`, `RelatedSelects`,
`SelectUser`.

- Reinforced the `Wrapper.tsx` lesson from the `Popup` batch: casting an
  *intermediate* value in a `withStyles(...)(translate(...)(X))` chain to
  `never` poisons the whole export for JSX consumers, so every one of these
  files' final default export is cast once, at the end, to
  `React.ComponentType<Record<string, unknown>>` — never `as never`
  mid-chain.
- `Select.jsx` sets a MUI `Select` `classes.root`, another already-familiar
  removed-classKey case (this file's own `darkThemeSelectRoot` style key is
  real, but `root` isn't a valid `SelectClasses` member) — cast the whole
  `classes` object, not just the value.
- `Select.jsx`'s "Clear" `MenuItem` uses `value={null}` to represent
  "no selection"; MUI's underlying HTML `value` attribute type only allows
  `string | number | readonly string[]` (no `null`). Runtime behavior here
  doesn't actually depend on `null` vs `undefined` for this specific
  Select's selected-item matching logic, but to avoid any risk of a
  downstream consumer distinguishing `null` from `undefined` on the
  `onChange` payload, kept the literal `null` and cast it
  (`null as unknown as string`) rather than switching to `undefined`.
- `RelatedSelects.jsx` chains several `[].concat(x).filter(Boolean).map(...)`
  sequences on `unknown`-typed values — same "filter(Boolean) doesn't narrow"
  limitation as the `Register` batch; cast right after `.filter(Boolean)`
  before the following `.map()`, in the same order established there.

## JsonSchema elements, thirty-fourth batch: Date, FormGroup

Converted `Date` (exported as `DateElement`) and `FormGroup`.

- `Date.jsx` picks between two untyped plain-JS components
  (`CustomDatePicker`/`TextFieldDummy`) at render time based on `readOnly`;
  both get the untyped-component-cast treatment so the ternary's result type
  stays usable as a JSX tag.
- `FormGroup.tsx` passes `checkValid`/`checkRequired` straight through to
  `ElementGroupContainer`, a shared component that has never read either —
  a pure pass-through, not a typo like the `classes.root`/`classes.fixTop`
  cases from earlier batches. Since `ElementGroupContainerProps` has no index
  signature, an unknown prop name is a hard error regardless of the value's
  type (casting the value doesn't help, unlike a type-mismatch on a
  known key). Added both as optional, documented, accepted-but-unused
  properties on `ElementGroupContainerProps` itself, rather than casting
  the whole element to `never` at every call site — this is a shared
  component, so fixing the interface once (following the established
  "accept it as optional" convention from earlier batches) is more
  maintainable than repeating a workaround at each of its many call sites.
- `FormGroup.tsx`'s `onChange` prop is checked for truthiness
  (`onChange && !(...)`) before being used, matching the original's
  `PropTypes.func` (optional, not `.isRequired`) even though `defaultProps`
  supplies a no-op fallback in practice. Typing it as optional (rather than
  required, which would make the truthiness check a TS "condition is always
  true" error) preserves the original's defensive intent.

## JsonSchema elements, thirty-fifth batch: File, NumberElement

Converted `File` and `NumberElement`.

- `File.jsx` and `NumberElement.js`'s `react-number-format` dependency both
  needed the by-now-familiar untyped-component-cast treatment for their
  own plain-JS dependencies (`Preloader`, `FileDataTable`, `ConfirmDialog`);
  `react-number-format` itself ships real types, so `NumberFormat` needed
  no cast.
- `NumberElement.tsx`'s `numberElement()` spreads `this.props` onto MUI's
  `TextField` and *also* re-passes `path` explicitly — a real MUI
  `TextFieldProps` has no `path` key, so the explicit assignment is a hard
  "unknown prop" error even though the spread's own copy of `path` is
  harmless (same class of error as `FormGroup`'s `checkValid` case, just on
  a MUI component this time, not a project one). Since the explicit
  `path={path}` was already 100% redundant with what the preceding
  `{...this.props}` spread carries, removed only that one duplicate
  assignment — the spread still passes `path` through exactly as before,
  so runtime behavior is unchanged.
- `checkIfValue()` concatenates `[stepName]` (a single string) with `path`
  (`Array<string | number>`) via `.concat()`; TypeScript infers the array
  literal's element type from `stepName` alone unless told otherwise, then
  rejects appending a `path` array containing numbers. Cast to the union
  `Array<string | number | undefined>` up front rather than narrowing
  `path` itself.

## JsonSchema elements, thirty-sixth batch: RegistrySearch, Toggle

Converted `RegistrySearch` and `Toggle` (exported as `ToggleComponent`).

- `RegistrySearch.jsx` hits the cross-app missing-export pattern again
  (`registerSearch`, cabinet-front-only) — same namespace-import-and-cast
  fix as the rest of the `Register`/`Registry*` family.
- `react-query@1.2.0` (the old pre-v3 API used here: `useQuery(queryKey,
  queryFn)` returning `{ data, isFetching }`) ships no type declarations at
  all. New unconditional ambient declaration `types/react-query.d.ts`,
  scoped to that exact call shape — not a cross-app fallback, since the
  package is genuinely untyped in both apps.
- `components/TreeList` (still plain JS) needed the untyped-component-cast
  pattern. `components/JsonSchema/elements/StringElement` did not — that
  import path resolves to the already-converted `StringElement/index.tsx`
  directory from an earlier batch, confirmed by consuming it directly
  (no cast) and getting a clean typecheck.

## JsonSchema elements, thirty-seventh batch: TabsOld, TextBlock

Converted `TabsOld` (exported as `TabsControl`) and `TextBlock`.

- `TextBlock.js` calls `React.useState` *after* an early `if (hidden) return
  null;` — a genuine Rules-of-Hooks violation (conditional hook call)
  present in the original source. Left exactly as-is: this is runtime/lint
  behavior (`eslint-plugin-react-hooks`, not part of this repo's TS lint
  config) rather than something TypeScript itself flags, and reordering it
  would be a behavior-risking fix outside this migration's scope.
- `TextBlock.js` destructures `{ material }` from the app's `theme` default
  export, but neither app's `theme.js` actually defines a `material` key —
  `material` is always `undefined`, making the two `classNames({...:
  material})` conditions permanently `false`. Pre-existing dead condition,
  preserved via `theme as unknown as { material?: boolean }` rather than
  removed.
- Both files' shared dependencies (`components/ChipTabs`) needed the
  untyped-component-cast pattern once more.

## JsonSchema elements, thirty-eighth batch: TreeSelect, CustomDataSelect

Converted `TreeSelect` and `CustomDataSelect`.

- Both hit the cross-app missing-export pattern again:
  `requestRegisterRelatedKeyRecords` (`TreeSelect`) and `requestCustomData`
  (`CustomDataSelect`), both cabinet-front-only exports of
  `application/actions/registry` — same namespace-import-and-cast fix.
- `CustomDataSelect.jsx`'s `getPayload()` uses a raw `eval(payload)(...)`,
  the same pre-existing pattern already documented for
  `Register/RegisterSelect.jsx`'s `getDisabled()` — confirms this wasn't a
  one-off; preserved exactly, not swapped for `helpers/evaluate`.
- `sort-array` ships no type declarations in either app. New unconditional
  ambient declaration `types/sort-array.d.ts`, scoped to the `(array, {by,
  order})` call shape used here. `array-to-tree` already ships its own
  types, so it needed no declaration.
- `components/TreeList`'s named `TreeListSelect` export and `components/Select`
  both needed the untyped-component-cast pattern.

## JsonSchema elements, thirty-ninth batch: ContactConfirmation

Converted `ContactConfirmation`. All of its action (`actions/auth`) and
component (`BlockQuote`, `IntervalUpdateComponent`, `helpers/configLoader`,
`helpers/capitalizeFirstLetter`, `helpers/padWithZeroes`) dependencies were
already TypeScript from earlier batches, so this file needed no cross-app
casts or new ambient declarations — a useful negative-case data point after
a long run of files that did.

Two pre-existing quirks preserved, not fixed:
- `[type, 'confirnmation', 'success'].map(capitalizeFirstLetter)` passes
  `Array.prototype.map`'s `(value, index, array)` callback signature
  straight into `capitalizeFirstLetter(string, onlyFirst?: boolean)`, so
  `onlyFirst` actually receives the array index. For the specific strings
  used here (`'phone'`, `'email'`, `'confirnmation'`, `'success'` — none
  contain a hyphen and all are already lowercase) the "correct" and
  "index-as-onlyFirst" code paths inside `capitalizeFirstLetter` happen to
  produce identical output, so this is inert in practice but still a latent
  bug in the call site. Cast the function reference at each `.map()` call
  (`as unknown as (value: string, index: number) => string`) rather than
  fixing the call to `.map((s) => capitalizeFirstLetter(s))`.
- The `sx` prop on the confirmation-code `TextField` declared the exact same
  object key twice with different values; per JS object-literal semantics
  only the second occurrence was ever live at runtime (the first was fully
  shadowed). TypeScript rejects a literal duplicate key outright, so kept
  only the second (already-effective) declaration, with a comment
  explaining why the first one silently disappeared rather than being
  merged or chosen arbitrarily.

## JsonSchema elements, fortieth batch: CodeEditor, elements barrel (index)

Converted `CodeEditor` and the `elements/index` barrel file (all
`React.lazy(() => import(...))` re-exports feeding each app's own
`application/components/JsonSchema/elements` override). The barrel needed
no changes at all beyond the `.tsx` rename — `React.lazy` type-checks
against each target's default export regardless of whether that target is
still plain JS (`allowJs`) or already converted, so this file compiles
identically before and after every other batch in this migration.

`CodeEditor.jsx` had two components (`components/CodeEditDialog`,
`../../ConfirmDialog`) needing the untyped-component-cast pattern; `deep-diff`
already had an ambient declaration from an earlier batch.

This closes out every flat (non-directory) file directly under
`elements/` except `PaymentWidget.js` (1292 lines, deferred as the single
largest remaining file in this directory).

## JsonSchema elements, forty-first batch: PaymentWidget

Converted `PaymentWidget` — at ~1290 original lines, the largest remaining
flat file in `elements/`. This completes every flat (non-directory) file
directly under `elements/`; only directories remain
(`Address`, `Map`, `Phone`, `RegisterList`, `ScheduleCalendar`,
`SpreadsheetLite`, `VerifiedUserInfo`).

- Three third-party payment SDKs (UkrGasBank's widget, Apple Pay JS, Google
  Pay JS) are all loaded at runtime via `<script>` tags and used as bare
  globals (`UGBWidget`) or ad hoc `Window` extensions
  (`window.ApplePaySession`, `window.google`), none of which ship types.
  New unconditional ambient declaration `types/payment-widgets.d.ts`,
  scoped tightly to the exact shape this file actually calls
  (`UGBWidget.quick_init(...)`, `ApplePaySession`'s constructor/instance
  members, `google.payments.api.PaymentsClient`).
- `application/actions/task`'s `validateAppleSession` is cabinet-front-only
  — same namespace-import-and-cast fix as the rest of the cross-app
  action-export family. `getPaymentInfo`/`getPaymentStatus`/`loadTask`
  exist in both apps with matching signatures and needed no cast, another
  useful negative-case data point.
- Found the ambient fallback for `modules/tasks/pages/Task/components/SuccessMessage`
  (the `commitAfterPayment` final-screen dependency) already in place from
  an earlier batch (`types/app-successMessage.d.ts`) rather than needing a
  new one — this file and `Payment/index.tsx` share that same cabinet-only
  dependency.
- `<Dialog TransitionComponent={'div'}>` passes a plain intrinsic-element
  *string* where MUI's type expects a component reference; kept the string
  (valid at the JSX/React level, since `'div'` is a legitimate element type
  React itself accepts) via a cast rather than swapping in an actual
  component reference, since there was no indication the string form
  doesn't already work as intended at runtime.
- Same recurring small fixes as prior large-file batches: `[].concat(x)`
  chains on loosely-typed props, a MUI `Button`'s removed `classes.label`
  classKey (cast the whole `classes` object), and a `React.RefObject`
  generic that needed to drop `| null` from its type parameter (the `null`
  belongs on `.current`, not the object's type argument) to satisfy MUI's
  `ref` prop typing on `Button`.

## JsonSchema elements, forty-second batch: Map

Converted `Map` (`UkraineGeoJson.ts` — a ~28,700-line static GeoJSON data
literal, needed only a `.js` → `.ts` rename since TypeScript infers a pure
data literal's shape automatically; and `index.tsx`, the interactive Leaflet
map control). First directory batch after finishing every flat file in
`elements/`.

- Extended the existing shared ambient `types/leaflet.d.ts` (first written
  for `GeojsonMap`) with `divIcon`/`DivIcon` and a minimal `Marker` class
  (`getLatLng()`), rather than writing a second, competing ambient module —
  this file already stands in for the untyped `leaflet` package everywhere
  in the app, so extending it in place keeps one source of truth.
- New unconditional ambient declaration `types/react-leaflet-fullscreen.d.ts`:
  the package ships a real `index.d.ts`, but its `package.json` `main`
  points at `dist.js` with no `types` field, so TypeScript never
  auto-discovers it. Mirrored the shipped declaration's shape instead of
  guessing.
- `react-leaflet`'s own `MarkerProps` extends leaflet's `MarkerOptions` —
  a type our minimal ambient `leaflet` module doesn't declare, so the
  interface effectively loses fields like `draggable`. `skipLibCheck` keeps
  that from erupting inside `react-leaflet`'s own `.d.ts`, but consuming
  code still can't pass `draggable`/`icon` directly. Cast the whole props
  object at the `<Marker>` call site rather than trying to fully flesh out
  `MarkerOptions` for one prop.
- Two more pre-existing dead/quirky spots preserved as-is: `<Snackbar
  variant="error">` isn't a real `Snackbar` prop (kept via a prop-object
  spread cast, same treatment as other silently-ignored extra props from
  earlier batches), and `addressInitial instanceof Error` can never be true
  since `addressInitial` is always a `string` prop — TypeScript's stricter
  `instanceof` rules (left side must be `any`/object/type-param) turn this
  from a silent no-op into a hard compile error, so it's cast through
  `unknown` with a comment rather than "corrected" to check something that
  could actually be an `Error`.

## JsonSchema elements, forty-third batch: Phone

Converted `Phone` — `dataCountries.ts` and `dataCountriesFilter.ts` (large
static country-dialing-code data tables, ~680 and ~1200 lines respectively,
each with a small transform step building lookup maps) and `index.tsx`
(the phone-number input control).

- `material-ui-phone-number` and `lodash` (the plain package, not
  `lodash-fp`, which already had its own ambient file) both needed new/extended
  ambient declarations. `lodash`'s existing `types/lodash.d.ts` only covered
  `get`/`merge`/`omit`/`pick`/`uniqueId`; extended it with `filter`, `head`,
  `includes`, `reduce` (plus a second overload for `reduce` over a *string*,
  since lodash — unlike the array-only signature that was the obvious first
  guess — iterates a string's characters directly), `startsWith`, `tail`.
- The raw country-data tuples aren't fully uniform: one entry
  (`dataCountriesFilter.ts`'s `Djibouti` row) has only 4 of the usual 8
  elements, and some slots vary between an empty string and a real value
  across different rows (format, priority, area codes). Modeled `RawCountry`
  as a tuple with optional trailing elements and union types per slot,
  rather than padding the data to a uniform shape — that would be editing
  the data, not just typing it.
- Reused the same `Wrapper.tsx` lesson again: an earlier draft of `index.tsx`
  wrote `withStyles(styles)(formElement(Phone) as never)`, which — like the
  `Popup` batch's `Wrapper.tsx` — poisoned the whole export's prop type via
  the mid-chain `never` cast. Fixed by casting only the final default export
  to `React.ComponentType<Record<string, unknown>>`, continuing the
  established rule: never cast an intermediate value in a HOC chain to
  `never`, only the end result.
- Exported `CountryItem` from `dataCountriesFilter.ts` for `index.tsx` to
  import directly, rather than hand-writing a second, structurally-similar
  interface in the consuming file — a mismatch between two independently
  written interfaces for the same shape was the direct cause of an
  "index signature is missing" error caught while fixing this batch.

## JsonSchema elements, forty-fourth batch: ScheduleCalendar

Converted `worker.ts` (a Web Worker computing whether any free slot
exists), `index.tsx` (~1290 lines — the calendar's data/state layer:
schedule generation, slot grouping by day/week/month, the payment/dialog
plumbing), and `renderSchedule.tsx` (~1600 lines — the presentational
day/week/month views, slot grid, and navigation UI).

- `worker.ts` runs inside a real Web Worker, where `self` is a
  `WorkerGlobalScope` (single-argument `postMessage`), but the shared
  tsconfig only includes the DOM lib, so `self` resolves to `Window`
  (multi-argument `postMessage`) by default. Cast `self` to a minimal
  worker-shaped interface locally rather than touching the shared lib
  config.
- `index.tsx`'s `makeStyles((theme) => ...)` had no `Theme` annotation on
  the callback parameter, so `theme.breakpoints` didn't exist yet;
  imported `Theme` from `@mui/material/styles` and annotated it — same
  fix repeated in `renderSchedule.tsx`'s own `useStyles`.
- Hit the `.parseZone(x)` no-op-argument case again (see the forty-first
  and earlier batches): moment.js's *instance* `.parseZone()` method
  takes zero arguments and silently ignores anything passed to it (only
  the *static* `moment.parseZone(x)` form takes an input). Removed the
  inert argument at every call site across both files rather than
  casting around the arity mismatch, since this is provably a no-op by
  the library's own contract.
- `scheduleDays` is declared `PropTypes.array.isRequired` in the original
  `renderSchedule.jsx`, but `index.tsx`'s real state
  (`useState<Record<string, unknown[]>>({})`) and every actual usage
  (`Object.keys(scheduleDays)`, `scheduleDays[day]`) treat it as an
  object keyed by date — the PropTypes declaration was simply wrong and
  unenforced (PropTypes only warns, never throws). Typed it as
  `Record<string, unknown>` to match the real runtime shape, consistent
  with dropping PropTypes entirely in favor of TS interfaces (as in every
  other converted file in this directory).
- `index.tsx`'s `userGeneratedDays` state is declared
  `useState<unknown[]>([])` (an array) but `renderSchedule.tsx`'s
  `setUserGeneratedDays` updater always returns an object
  (`{...prev, [day]: count}`) — a pre-existing array/object type
  mismatch that was silently harmless in JS because `userGeneratedDays`'s
  *value* is never read anywhere; it exists purely to retrigger one
  `useEffect` when it changes. Bridged the two declared shapes with a
  cast at the JSX prop boundary in `index.tsx`, documented inline, rather
  than rewriting either side's state shape.
- Two more pre-existing dead-className references surfaced as hard
  errors once `classes` got a real type: `renderSchedule.jsx` reads
  `classes.attentionText` and `classes.hoverOff`, neither of which is
  ever defined in the file's own `useStyles` (only `hoverOn` exists, no
  `attentionText` at all) — harmless at runtime (an `undefined`
  className), preserved via a cast on `classes` at each of the two call
  sites with an explanatory comment, rather than adding the missing
  style rules.
- `renderSchedule.jsx`'s `{handleOpenDialog && (...)}` conditional render
  relies on `handleOpenDialog` being a plain truthy check, but the actual
  prop value from `index.tsx` (`handleOpenDialogEval`) is `string | null`,
  not the `PropTypes.func.isRequired` the original declared — another
  stale/inaccurate PropTypes annotation. Wrapped the check in
  `Boolean(...)` so the conditional still type-checks as `ReactNode`
  without changing which branch renders for any given value.
- `FormControlLabel`'s real `onChange` signature is
  `(event: SyntheticEvent, checked: boolean) => void`, but the original
  handler ignored the second argument and read `event.target.checked`
  directly (relying on the event's target being the underlying
  `<input>`). Retyped the handler's event parameter as `SyntheticEvent`
  and cast `event.target` to `HTMLInputElement` at the point of use,
  preserving the exact original approach instead of switching to the
  `checked` argument.
- `components/Scrollbar` is still plain JS; imported it as
  `ScrollbarUntyped` and cast to `React.ComponentType<Record<string,
  unknown>>`, the same pattern already established in
  `EventsCalendar/slotCalendar.tsx`.
- `generateSlots` is passed from `index.tsx` typed as
  `(daySchedule: Array<Record<string, unknown>>) => Record<string,
  unknown>[]`; rather than widening it to `unknown` in
  `renderSchedule.tsx`'s props (which `index.tsx`'s narrower real
  signature can't satisfy contravariantly), matched the prop's declared
  type exactly and cast both the argument (from an indexed lookup typed
  `unknown`) and the returned array (to the local `Slot` shape) at each
  of the three call sites — consistent with the established "cast
  immediately after the call" pattern from earlier batches.
- Restored several stray `key={generateUUID()}` list keys (and one
  bare, key-less `<>...</>` fragment) to match the original exactly
  after an initial draft accidentally "improved" them to stable
  `key`s — a reminder that even React list-key choices are in scope for
  the "preserve exact behavior" rule, not just types.

## JsonSchema elements, forty-fifth batch: Address

Converted `index.tsx` (the entry wrapper choosing between the two render
modes), `components/recordsTree.tsx` (a class component, connected via
`connect`/`translate`/`withStyles`), `components/separatedRegisters.tsx`
(a hook-based effect-only component that injects a computed schema into
the task's `jsonSchema`), and the three schema-factory modules under
`components/schemas/` (`schema.ts`, `separatedRegister.ts`,
`separatedRegisterMulti.ts` — pure functions building deeply nested,
heterogeneous JSON-schema config objects, mostly Ukrainian address-form
strings and stringified predicate functions consumed by `evaluate`
elsewhere).

- `requestRegisterKeyRecords`/`requestRegisterKeyRecordsFilter` from
  `actions/registry` are cabinet-front-only (admin-front's copy lacks
  both), so `recordsTree.tsx` resolves them dynamically against redux's
  real `Dispatch` type — the same pattern used throughout this
  migration, most recently in the ScheduleCalendar batch.
- `recordsTree.tsx`'s HOC chain (`withStyles` → `translate` → `connect`)
  needed `as never` at each intermediate step to satisfy each wrapper's
  own generic inference, mirroring `SelectUser.tsx`'s established shape
  exactly: every intermediate cast is immediately consumed by the next
  wrapping call, and the *entire* chain's result is cast one final time
  at the export (`as unknown as React.ComponentType<Record<string,
  unknown>>`) — so no consumer ever sees a `never`-poisoned prop type.
  This is the same rule as the Wrapper.tsx/Phone.tsx lesson, just
  clarifying that intermediate `as never` casts are fine *as long as*
  the whole chain gets one overriding cast at the very end; the bug was
  never intermediate casts per se, but exporting a chain's raw result
  when part of it was cast to `never`.
- `actions/documentTemplate`'s `jsonSchemaInjection` (imported by
  `separatedRegisters.tsx`) is cabinet-front-only at the real-module
  level, but this was already covered by the existing
  `types/app-externalReader.d.ts` fallback ambient declaration from
  earlier batches — no new ambient file needed.
- `lodash/fp`'s ambient declarations (`types/lodash-fp.d.ts`) only
  covered `merge`/`equals`/`difference`; extended it with `mergeWith`
  (noting fp's auto-curried/rearg argument order puts the customizer
  *first*, unlike lodash's regular `mergeWith(object, source,
  customizer)`) and `cloneDeep`, both needed by
  `separatedRegisters.tsx`.
- `calcTriggers`/`calcTriggersMulti` in the schema modules are called
  from `separatedRegisters.tsx` with a `hidden` property in their
  options object, but neither function's original destructured
  parameter list ever included `hidden` — a pre-existing unused
  argument. Added it to each params interface as an optional,
  documented-but-unread field rather than stripping it from the call
  site, consistent with the established "accepted but never read"
  precedent (`FormGroup`'s `checkValid`/`checkRequired`, ScheduleCalendar's
  `weekCount`).
- `schema.js`'s `PropTypes` declarations (in `recordsTree.js`, not
  `index.jsx`) required several props (`classes`, `schema`, `template`,
  ...) that carry no runtime `defaultProps` fallback for the *outer*
  `index.jsx` wrapper's own props of the same name — PropTypes on the
  inner component doesn't get enforced by the outer component's
  props at all; this is normal React composition, not a bug, and needed
  no special handling beyond typing each component's own props
  independently.

## JsonSchema elements, forty-sixth batch: RegisterList

Converted `index.tsx` (~765 lines — the list/table data-fetching and
state-orchestration layer), `components/styles.ts`,
`components/pagination.tsx`, `components/ExportToExcelButton.tsx`,
`components/renderTable.tsx`, and `components/renderFilters.tsx`
(~675 lines — the most complex file, rendering per-filter-type controls:
string, select, date-range, checkbox, sort). `components/renderPopup.tsx`
had already been converted by the concurrent process before this batch
started.

- `styles.ts` had a literal duplicate `selectRoot` key (once as a static
  style object, once as `...theme.selectRoot`) — only the second ever
  took effect per JS object-literal semantics, same pattern as the
  `ContactConfirmation.jsx` duplicate-`sx`-key case from an earlier
  batch. Kept only the second, documented with a comment.
- `requestRegisterKeys`/`requestRegisterKeyRecords` (in
  `ExportToExcelButton.tsx`) and `requestRegisterKeyRecords` (in
  `index.tsx`, from `actions/registry`) are cabinet-front-only —
  admin-front's `registry.ts` exports a completely different set of
  actions (registers/keys CRUD, no records endpoints at all). Both
  files resolve these dynamically against redux's real `Dispatch`,
  the established cross-app pattern.
- `withStyles(styles)` (an externally-declared, separately-imported
  style function, as opposed to `makeStyles(inlineCallback)`) does not
  get TypeScript's contextual literal-narrowing for CSS union-typed
  properties, since the object literal's type is already frozen at the
  `styles.ts` declaration site before `withStyles` ever sees it. This
  surfaced as "does not satisfy the constraint 'ClassKeyInferable'"
  errors for `pointerEvents`, `clear`, `textAlign`, `flexWrap`,
  `flexDirection`, `textOverflow`, `overflow`, and `position` across
  `pagination.tsx` and `styles.ts` — each needed an explicit `as const`
  to freeze the literal type, consistent with the same fix already
  applied in `DataMap.tsx`, `CalculateButton.tsx`,
  `EventsCalendar/slotCalendar.tsx`, and `TimeSlots/index.tsx` in
  earlier batches. Once fixed, the large cascade of "Property 'x' does
  not exist on type 'ClassNameMap\<never\>'" errors (one per `classes.x`
  access) disappeared automatically, since they were all downstream
  consequences of the same root-cause type mismatch.
- `renderFilters.tsx`'s "clear filters" buttons reference
  `classes.clearButton`, which is never defined in `styles.ts` (only
  `clearFilter` exists) — another pre-existing dead-className reference,
  preserved via a cast on `classes` with an explanatory comment, same
  pattern as the `attentionText`/`hoverOff` quirks found in the
  ScheduleCalendar batch.
- A `<Typography variant="subheading2">` is not a real MUI Typography
  variant (`subtitle2` likely intended) — preserved verbatim via
  `variant={'subheading2' as never}`, the same cast-around-invalid-enum-
  value pattern used for `typography` props in several earlier batches
  (`RegisterTable`, `FormGroup`, `UnitSelect`, `NumberElement`,
  `TreeSelect`).
- `DatePicker`'s `error={error}` prop isn't part of `@mui/x-date-pickers`
  5.0.11's `DatePickerProps` type at all (TS suggests `onError` instead)
  — preserved via a small spread-cast (`{...({ error } as unknown as
  Record<string, unknown>)}`), the same technique already used for
  `<Snackbar variant="error">` in the Map batch.
- `index.tsx` had four `{ data: option } || rootDocument` expressions —
  since an object literal is always truthy, `|| rootDocument` never
  actually executes; this is pre-existing dead code, but unlike prior
  "preserve as a cast" quirks, TypeScript's `no-unnecessary-condition`-
  style check (`TS2872`, "This kind of expression is always truthy")
  makes this a **hard compile error**, not just a lint warning that can
  be cast around. Dropped the inert `|| rootDocument` fallback at all
  four sites (behaviorally identical, since it was never live) with a
  comment noting why, rather than casting — there is no type-level way
  to preserve an always-taken branch's dead alternative.
- `toggleItem`'s `opened` parameter is actually a `boolean` (`index ===
  expended` at the call site), not `number | false` as an initial draft
  assumed by pattern-matching against the sibling `expended` state's
  type — a reminder to check each call site's actual argument type
  rather than assuming it mirrors a similarly-named state variable
  elsewhere in the same file.

## JsonSchema elements, forty-seventh batch: VerifiedUserInfo

Converted the remaining seven files in this directory —
`index.tsx` (~500 lines), `components/userInputFields.tsx`,
`components/renderDateFormat.tsx`, `components/renderUnzrField.tsx`,
`components/renderAddressFormat.tsx`, `components/renderPassportFormat.tsx`
(~475 lines), and `components/renderFields.tsx` (~470 lines).
`renderCitizenshipField.tsx`, `renderCountryField.tsx`,
`renderPlaceField.tsx`, `renderRadioFormat.tsx`, and `renderTextField.tsx`
had already been converted by the concurrent process before this batch
started, and their strict (non-loosened) prop interfaces meant every
caller in the newly-converted files needed a `value`/`errors` cast at
the JSX boundary — those five sibling components export their strict
interface directly rather than casting to `React.ComponentType<Record
<string, unknown>>` at the bottom, unlike most HOC-wrapped components
elsewhere in this migration.
- `updateVerifiedUserInfo` (from `actions/task`) is cabinet-front-only;
  admin-front's `actions/task` has no such export. Resolved dynamically
  against the module namespace, the established cross-app pattern —
  the twist here is that `actions/task` and `application/actions/task`
  are the *same* file via this project's path mapping, so importing the
  missing name from either specifier produces the identical "has no
  exported member" error.
- `index.tsx`'s `styles` function is declared standalone and passed to
  `makeStyles(styles)` on a separate line, rather than inline as
  `makeStyles((theme) => ({...}))` — the same "no contextual literal
  narrowing" issue already documented in the RegisterList batch, this
  time for `position: 'relative'` and four separate `wordBreak:
  'break-word'` declarations, each needing `as const`.
- `index.tsx`'s `contentText` style had a literal duplicate `color` key
  (`#000000` then `#444444`) — same duplicate-key pattern as
  `RegisterList/components/styles.ts` and `ContactConfirmation.jsx`
  before it; kept only the second (effective) declaration.
- `renderFields.tsx` destructures `const { material } = theme;` from the
  top-level app-config import — `theme` has no real `material` field in
  this app's shape, so this always evaluates to `undefined`. This exact
  quirk was already found and documented in `TextBlock.tsx` in an
  earlier batch; reused the same `theme as unknown as { material?:
  boolean }` cast here rather than re-deriving a fix.
- `renderPassportFormat.tsx`'s `hiddenFields.includes(...)` call has no
  optional-chaining guard, which would throw if `hiddenFields` were ever
  `undefined` — but the top-level `VerifiedUserInfo.defaultProps` (now
  `index.tsx`) always supplies `hiddenFields: []`, so by the time this
  prop reaches `RenderPassportFormat` it is guaranteed non-`undefined`
  in practice. Typed it as a required `string[]` (not optional) to match
  that real runtime guarantee, rather than adding a defensive `?.` that
  the original never had.

## JsonSchema elements, forty-eighth batch: SpreadsheetLite

Converted the remaining 16 files in this directory — `index.tsx`
(~380 lines, the orchestrator), `DataSheetGridHeaded.tsx` (~255 lines,
wraps `react-datasheet-grid`'s `DynamicDataSheetGrid`), three helpers
(`useColumns.tsx`, `useHeaders.ts`, `useTooltip.ts`), and ten
`components/` files (cell renderers, toolbars, context menus, error
display, add-rows UI). `ClearDataButton.tsx`, `ColumnChooser.tsx`,
`CustomAddRowsComponentMaterial.tsx`, `ImportButton.tsx`,
`RedoButton.tsx`, and `UndoButton.tsx` had already been converted by the
concurrent process before this batch started.

- `react-datasheet-grid` ships its own `dist/types.d.ts`/`dist/index.d.ts`
  and resolves automatically — no ambient declaration needed for it, only
  for two packages that ship types without a `types`/`typings` field in
  `package.json` (the same auto-discovery gap as `react-leaflet-fullscreen`
  in an earlier batch): `react-draggable-bottom-sheet` (new
  `types/react-draggable-bottom-sheet.d.ts`, mirroring the shipped
  `dist/BottomSheet.d.ts`) and `react-virtualized/dist/commonjs/AutoSizer`
  (new `types/react-virtualized.d.ts` — the whole package ships no types
  at all, not even undiscoverable ones).
- The app's own `columns/*` factory functions in this directory (e.g.
  `textColumn` from `TextCell.tsx`) share a name with `react-datasheet-grid`'s
  own built-in `textColumn` export — both are imported side-by-side in
  `DataSheetGridHeaded.tsx` under different local names
  (`TextColumnUse` vs. the library's `textColumn`), so there's no actual
  collision, just a naming coincidence worth noting for future readers.
- `theme.js` (the shared `packages/front-core/theme.js` config object,
  resolved via the `'theme'` import specifier) is a plain object literal
  with no type annotation, so TypeScript infers its *exact* real shape —
  meaning `theme.defaultLayout`, `theme.material`, etc. (feature flags
  referenced throughout this whole migration, always `undefined` at
  runtime because the object never actually defines them) are now hard
  "property does not exist" errors, not silent `undefined` reads. Applied
  the established `theme as unknown as { defaultLayout?: boolean }` cast
  at every remaining call site in this batch that hadn't already been
  converted (`ErrorsBlock.tsx`, `CustomAddRowsComponent.tsx`,
  `DataSheetGridHeaded.tsx`, `index.tsx`) — `theme.typography.fontFamily`
  in `CustomAddRowsComponent.tsx`/`DataSheetGridHeaded.tsx` needed no cast
  since that field genuinely exists on the real object.
- `withStyles`/`makeStyles` called on a separately-declared `styles`
  object (not inline) needed the same `as const` treatment as the two
  prior batches, this time for `textAlign`, `whiteSpace` (via
  `wordBreak`), `flexDirection`, `position`, and `textTransform` across
  several files in this directory.
- `CustomSelectCell.jsx`'s `<Select isDisabled={columnData.disabled}>`
  passes a prop that doesn't exist on MUI's `Select` (the real prop is
  `disabled`) — another pre-existing invalid-prop quirk, preserved via a
  spread-cast (`{...({isDisabled: ...} as unknown as Record<string,
  unknown>)}`), the same technique used for `<Snackbar variant="error">`
  in the Map batch and `<DatePicker error={error}>` in the RegisterList
  batch.
- `RegisterColumn.jsx`'s `.MuiAutocomplete-root` style block declared
  `padding: 5` and later `padding: 0` in the same object literal — the
  same duplicate-key pattern as several earlier batches; kept the second
  (effective) value.
- `CustomAddRowsComponent.jsx`'s "+" button handler (`addRowCount`) does
  `rawValue + 1` where `rawValue` is normally a *string* (every
  keystroke's `onChange` sets it directly from `e.target.value`) — this
  is a genuine pre-existing bug: JS's `+` string-concatenates rather than
  adds when the left operand is a string (`'5' + 1 === '51'`, not `6`),
  so clicking the increment arrow while a value is typed doesn't actually
  increment it. `minusRowCount`'s `-` operator is unaffected since `-`
  always numeric-coerces. Preserved exactly via a type cast on the
  operand (not a `Number()` conversion, which would have silently fixed
  the bug) with a comment explaining the quirk.
- `ContextMenu.jsx` pushes a custom `{ type: 'INSERT_ROW_ABOVE', ... }`
  item into the array read from `getContextMenuItems()`, but the
  library's real `ContextMenuItem` union type doesn't include
  `'INSERT_ROW_ABOVE'` as a valid `type` at all — this file fully
  replaces the library's default context menu with an app-specific one
  via the `contextMenuComponent` prop, so it never needs to satisfy the
  library's own `ContextMenuItem` shape; typed `items` locally instead of
  importing the library's stricter type.
- `index.jsx` calls several of this batch's own components as *plain
  functions* rather than JSX (e.g. `ContextMenu({ t, value, handleChange,
  event })`, `CustomAddRowsComponent({ ...props, rows, errors })`) — a
  pre-existing pattern that bypasses normal JSX element creation (and,
  strictly, the Rules of Hooks, since these components call hooks
  internally) but works because `react-datasheet-grid` invokes the
  supplied `contextMenuComponent`/`addRowsComponent` callbacks from
  within its own render path. Preserved exactly; each callee's real
  prop-object shape (from the already-written `.tsx` conversions in this
  same batch) was used to type the call sites precisely.
- `useColumns.tsx`'s returned column objects mix `react-datasheet-grid`'s
  own `Partial<Column<...>>` shape (from `keyColumn(...)`) with several
  app-specific extra fields (`hidden`, `propertyName`, arbitrary spread
  JsonSchema properties) that don't exist on the library's `Column` type
  at all — typed the return as `Record<string, unknown>[]` rather than
  fighting the union of two incompatible shapes, then cast to a narrower
  local shape (`{id, hidden?, propertyName, type?}`) at the one call site
  in `index.tsx` that needs those specific fields.

## JsonSchema editor, forty-ninth batch: JsonSchemaProvider and snippet library

Converted the remaining 4 files in `components/JsonSchema/editor/` —
`JsonSchemaProvider.jsx` (the editor's context provider — schema state,
undo-free single-buffer edit/save flow, element insertion/deletion by
path), and three files under `editor/components/`: `SnippetList.tsx`
(the sidebar listing saved snippets/groups), `CreateControlSnippet.tsx`
(the create/edit dialog for a snippet), and `GroupedElementList.tsx`
(renders snippets grouped and sorted, with drag reordering). This
completes `components/JsonSchema/editor/` — only a handful of top-level
`components/JsonSchema/*` files remain (see below).

- `React.createContext()` was called with **zero arguments** in the
  original — legal in JS, but `createContext<T>(defaultValue: T)`'s
  parameter isn't optional in React's real types. Defined a `ProviderData`
  interface matching the real shape of the object passed to `<Provider
  value={...}>` and called `createContext<ProviderData | undefined>(undefined)`.
- `actions/snippets` (imported by `SnippetList.tsx`) and `immutability-helper`
  (imported by `GroupedElementList.tsx`) are both **admin-front-only** —
  the snippet library is admin-only tooling, so cabinet-front never
  installed the npm package and never wrote the actions module at all.
  Unlike every prior cross-app gap in this migration (one *export*
  missing from an otherwise-shared module), this is the first case of an
  entire *npm package* being genuinely absent from one app's
  `node_modules` — confirmed by checking both apps' installed packages
  directly, not just their source. Added `types/app-snippets.d.ts`
  (fallback declarations for all ten `actions/snippets` exports) and
  `types/immutability-helper.d.ts` (scoped to the one `$splice` command
  actually used) — both apps' typecheck and production build stayed
  green afterward, confirming cabinet-front's bundler genuinely never
  pulls this code path in, so the missing runtime dependency never
  matters there in practice.
- `GroupedElementList.tsx`, `CreateControlSnippet.tsx`, and `DraggableElement.tsx`
  (the last already converted by the concurrent process) each declare
  their own local `SnippetElement`/`Group`/`SnippetGroup`-shaped
  interfaces independently, structurally similar but nominally distinct
  — passing values between them repeatedly hit TS's "two different types
  with this name exist, but they are unrelated" error. Rather than
  unifying three independently-evolved local types into one shared
  export, cast at each boundary (or loosened `DraggableElement` to a
  generic `React.ComponentType<Record<string, unknown>>` where it was
  called with several extra, never-destructured props like `moveSnippet`
  and `draggingElement`).
- Confirmed the `Wrapper.tsx` lesson a third time: `GroupedElementList.tsx`'s
  original export chain (`translate('JsonSchemaEditor')(withStyles(styles)(GroupedElementList))`)
  needed an `as never` on the inner `styled` argument, but the *outer*
  `translate(...)` call was initially left uncast — reproducing the
  exact poisoning bug from the Popup and Phone batches (every caller's
  props, e.g. `<GroupedElementList groups={...} .../>` in `SnippetList.tsx`,
  failed with "Property 'groups' does not exist on type Omit&lt;{t:
  Translate}, 't'&gt;"). Fixed by adding the final `as unknown as
  React.ComponentType<Record<string, unknown>>` cast on the whole chain.
- `sort-array`'s ambient declaration (written in an earlier batch) types
  `by`/`order` as `string[]`/`unknown[]` only, but the real library
  accepts a single string too (it calls `arrayify()` internally on both
  options) — `GroupedElementList.jsx` passed plain strings
  (`by: 'sortIndex', order: 'asc'`). Wrapped both in one-element arrays
  at the two call sites rather than loosening the shared ambient type,
  since the library normalizes a lone string into a one-element array
  internally anyway — behaviorally a complete no-op.
- MUI's real `ButtonClasses` type has no `label` key (a removed MUI v4
  classKey, same category as the `Divider`/`Select` quirks from much
  earlier batches) — three `<Button classes={{root, label}}>` call sites
  in `SnippetList.tsx` needed the classes-object cast.

## JsonSchema top level, fiftieth batch: SchemaForm and friends — `components/JsonSchema/*` complete

Converted the last six files directly under `components/JsonSchema/`:
`SchemaForm.tsx` (~405 lines — the rendering engine every single form
element in both apps ultimately passes through), `SchemaStepper.tsx`
(~410 lines), `index.ts` (the barrel, pure re-exports — trivial rename),
`SchemaPreview.tsx`, `FormElement.tsx`, and `emptyValues.ts`. This is the
highest-fan-in code touched in the entire migration so far, so it got
extra scrutiny: a full verification pass (typecheck, `lint:types`, test,
build) was run in both apps immediately after `SchemaForm.tsx` alone,
*before* touching the other five files, specifically to isolate any
regression to the one file that everything else depends on. It came back
clean on the first attempt. **This completes all of
`components/JsonSchema/*`** — every `.jsx`/`.js` file under this
directory is now TypeScript except `ChangeEvent.js`, which was already
established as TypeScript-compatible via `allowJs` inference and never
needed conversion.

- `SchemaForm.tsx` dynamically resolves the actual field component via
  `{...formElements, ...customControls}[componentName]` and spreads
  *two* different dynamic objects (`schema` and the component's own
  `props`) onto whatever that resolves to — by far the widest-fan-out
  dynamic-dispatch point in the codebase, since every one of the ~130
  converted `elements/` components can be the target. Typed `schema` as
  the existing shared `JsonSchemaNode` (already has a permissive index
  signature from earlier work) and cast the resolved component itself to
  `React.ComponentType<Record<string, unknown>>` — the only workable
  option, since no single real prop type could describe every element's
  actual requirements simultaneously.
- Found the same "array used as a stringified object key" quirk
  documented for `Calculator.tsx` much earlier in this migration, in a
  new spot: `rootDocument.data[steps] && rootDocument.data[steps[activeStep]]`
  passes the `steps` *array* directly into a property-access bracket,
  which JS coerces to a comma-joined string (`"step1,step2"`) — a key
  that (for any real multi-step schema) never actually exists in
  `rootDocument.data`, making the whole expression evaluate to
  `undefined` and rendering the third argument to `evaluate(...)`
  permanently inert. Preserved via a same-value cast (`steps as unknown
  as string`) rather than fixing the indexing to what was presumably
  intended.
- `SchemaStepper.tsx`'s `theme` parameter (from `withStyles((theme) =>
  ({...}))`) reads several fields — `leftSidebarBg`, `stepIconActiveNumber`,
  `stepIconActive.backgroundColor`/`.fontWeight`, `hideStepper` — that
  aren't part of MUI's real `Theme` type at all; they're custom
  top-level fields from this app's own `theme.js` config object that
  `createTheme()` passes through unchanged. Rather than casting each
  access individually (the pattern used everywhere else `theme` carries
  custom fields), defined one local `AppTheme = Theme & {...}`
  intersection type and annotated the `styles` callback parameter with
  it directly — cleaner when a single component reads several such
  fields.
- `<StepButton completed={false}>` passes a prop that doesn't exist on
  MUI's real `StepButtonProps` at all (`completed` belongs on the parent
  `<Step>`, not `<StepButton>`) — another invalid-prop quirk in the
  established category, preserved via a spread-cast.
- Confirmed `errors[stepId]` indexes what `PropTypes.array.isRequired`
  claims is an array using a step *name* string, not a numeric index —
  the same "PropTypes lied about the real shape" pattern as
  RegisterList's `scheduleDays`; typed `errors` as `Record<string,
  unknown>` to match the real runtime shape.
- `FormElement.jsx` — confirmed via a repo-wide search to be genuinely
  dead code: never extended, never imported, not even re-exported from
  this directory's own `index.jsx`/`index.ts` barrel. It also calls
  `this.isRequired()`, a method that doesn't exist anywhere on the
  class (presumably meant to come from a subclass that was never
  written). Converted as-is rather than deleted, since — unlike
  `editor-old/` earlier in this migration — removal wasn't something the
  user asked for; the missing method was preserved via a cast rather
  than "fixed" by defining it.

## Fifty-first batch: `plugins`, `store`, `reducers`, `translation`

The first batch outside `components/JsonSchema/*`, covering the smallest
and most foundational remaining directories in `packages/front-core`:
`plugins/index.ts`, `store/configureStore.ts` + `store/index.ts`,
`reducers/index.ts`, and all six files in `translation/` (five pure
locale-data files plus `translation/index.ts`'s real logic).

- `plugins/index.ts` — no per-app override exists; converted
  `export default [];` to a typed `Plugin[]` with an interface covering
  the one field (`translations`) real code actually reads off a plugin,
  plus an index signature for everything else.
- `reducers/index.ts` — the bare `reducers` specifier resolves per-app to
  each app's own already-typed `application/reducers/index.ts`
  (a `ReducersMapObject`-shaped default export), so `combineReducers(reducers)`
  type-checks with no cast needed on that argument itself.
- **Regression caught and fixed before it shipped**: the first draft of
  `reducers/index.ts` wrapped the per-app `reducers` map in `as never`
  before passing it to `combineReducers`, and `configureStore.ts`
  similarly cast its own `reducers` import to `never` for `createStore`.
  Per the Wrapper.tsx lesson, casting an *intermediate* argument to
  `never` is normally fine — but here that argument fed directly into
  `createStore`'s own generic inference for the store's *state* type,
  so the poisoned `never` made TypeScript infer the whole store's state
  as `{}`. That silently broke type-checking for every unrelated
  consumer of `store.getState()` app-wide the moment `store`/`reducers`
  became real TypeScript — surfacing as `Property 'auth' does not exist
  on type '{}'` in `actions/auth.ts` and
  `JsonSchema/helpers/handleChangeAdapter.ts`, neither of which this
  batch touched. Removing both `as never` casts (and instead casting
  only the *call-site argument* to `combineReducers(reducers)(state, action)`,
  which doesn't feed the store's own generic inference) fixed all three
  files with no other changes.
- Making `store`/`reducers` real TypeScript also surfaced several
  **genuinely pre-existing, previously-invisible type mismatches** now
  that `store.getState()` and `store.dispatch` carry real types instead
  of falling through as untyped JS:
  - `actions/auth.ts`'s `isRole` reads `courtIdUserScopes` off
    `AuthState.info`, typed as `string[] | Record<string, string>` — a
    union where indexing `.includes` under the object-record branch
    resolves through its index signature to plain `string`, making the
    whole `.includes` expression not callable. Real usage always treats
    it as an array; cast to `string[]` at the call site to match actual
    runtime shape, same pattern as `RegisterList`'s `scheduleDays`.
  - `JsonSchema/helpers/handleChangeAdapter.ts` calls `handleTriggers(...)`
    with a `null` in the `userInfo` position and `info` (the real
    `AuthUser | null` from the store) one slot later, in what's actually
    `taskSchema?: { jsonSchema?: unknown }`'s position — a pre-existing
    positional quirk from the untyped-JS days, not something introduced
    here. Preserved exactly via a same-value cast on `info` rather than
    reordering the call to what was presumably intended.
  - `services/dataTable/useTable.ts` passes `store.dispatch` (now a real
    redux `Dispatch<AnyAction>`) into `services/api`'s `post`/`get`/`del`,
    which each declare their own narrower local `Dispatch = (action:
    unknown) => unknown` alias — incompatible under strict function-type
    variance. Cast each call site's `store.dispatch as never`, matching
    the `dispatch as never` idiom already used at dozens of call sites
    throughout `components/JsonSchema/elements/*`.
- `translation/index.ts` — the one file in `translation/` with real
  logic. Two `TS2698: Spread types may only be created from object
  types` errors, both from a `.reduce(...)` call over an `unknown[]`
  array: casting `acc` *inside* the callback body (`acc as Record<string,
  unknown>`) doesn't help TypeScript pick `Array.prototype.reduce`'s
  two-generic overload — it still falls back to the single-generic
  overload unifying the accumulator with the array's `unknown` element
  type, so the reduce's own result silently comes back typed `unknown`.
  Fixed by annotating the callback's parameter directly
  (`(acc: Record<string, unknown>, tr) => ...`), which resolves the
  correct overload.
- The five locale files (`de-DE.ts`, `en-GB.ts`, `fr-FR.ts`, `nl-NL.ts`,
  `uk-UA.ts`, ~3,800–4,600 lines of hand-maintained translation strings
  each) surfaced **133 duplicate-object-literal-key errors total** —
  by far the largest-scale occurrence of this migration's established
  "only the last declaration is ever live at runtime" quirk. Wrote a
  small one-off TypeScript-compiler-API codemod
  (not committed — ad hoc, used only for this batch) that walks every
  object literal in a file, groups sibling properties (and, separately,
  properties shadowed by a *later* `...spread` of a same-file top-level
  `const` object, e.g. `UserListPage`'s `...WorkflowProcesses` spread
  silently overwriting several explicit properties declared earlier in
  the same object) by effective key, and deletes every non-last
  contributor while leaving formatting otherwise untouched. Verified
  each output file still parses with zero syntax errors before running
  it against the next. No behavior change — every deleted property was
  already dead at runtime under normal JS "last write wins" semantics.
- Discovered `redux-logger` ships no types and has no `@types` package;
  added `types/redux-logger.d.ts` scoped to the one function actually
  used (`createLogger(options?: { collapsed?: boolean })`).
- Confirmed `history` v4.10.1's and `react-router-redux`'s existing
  ambient declarations already cover `createBrowserHistory({revertPopState})`
  and `routerMiddleware(history)` exactly as used — no changes needed.
  `redux-thunk` ships its own real types — no ambient needed either.
- Separately, the new `.eslintrc-types.cjs`/`lint:types` TypeScript-only
  ESLint pass flagged 346 pre-existing double-quoted string literals
  across three of the locale files, and (unrelated to this batch) eight
  already-converted `components/JsonSchema/*` files from earlier
  batches — inherited verbatim from the original `.js` sources, where
  this stricter TS-specific lint override never ran. All 346 were purely
  cosmetic (no escape justification, `quotes: ["single", "avoid-escape"]`
  just wasn't being enforced against these files before) and 100%
  auto-fixable with zero behavior risk, so fixed via `eslint --fix`
  rather than left as repo-wide lint debt. The remaining handful of
  pre-existing `no-unused-vars` warnings in those same
  already-converted files were left alone — warnings, not errors, and
  outside this batch's scope.

## Fifty-second batch: `helpers/getReaderMocks.ts`

The last remaining `.js` file in `helpers/` (every other file in that
directory was already TypeScript, converted by the concurrent process).
`getHeadersResponse`'s `headers` parameter had to be typed
`string | null | undefined` rather than just `string | undefined` —
both call sites (`cabinet-front`'s `externalReader.ts` and `task.ts`)
pass it a `Response.headers.get(...)` result directly, which is
`string | null` per the real DOM `Headers` type, not `string | undefined`.
`timeout`'s `null`-initialized `ReturnType<typeof setTimeout>` and the
`as ReturnType<typeof setTimeout>` cast at each `clearTimeout` call
match the established pattern from `CustomDataSelect.tsx`/
`SingleKeyRegister.tsx`/`PaymentWidget.tsx` earlier in this migration.

## Fifty-third batch: `hooks/*` (8 files)

All remaining `.js`/`.jsx` files in `hooks/`.

- `useAuth.ts` now goes through the concurrent process's new typed
  `useAppSelector`/`useAppDispatch` hooks (`core/store/hooks`, backed by
  each app's own `application/store/types.ts` — `RootState`/`AppDispatch`
  derived from that app's real reducer map) rather than a raw untyped
  `useSelector`, matching the one existing call site of this pattern
  (`components/Label/UnitNamesLabels.tsx`).
- That alone surfaced a genuine latent null-safety gap in
  `JsonSchema/editor/components/SnippetList.tsx`: `const { userUnits } =
  useAuth()` is typed `AuthUnit[] | null` (per `AuthState`), and the
  file called `userUnits.find(...)` with no guard — previously invisible
  since `useAuth()` returned `any`. Preserved the exact original
  throw-if-null behavior via a cast rather than adding a null check.
- `usePrompt.ts` / `htmlBodyParser.ts` / `useUndo.ts`: straightforward
  conversions, each preserving one throw-on-unexpected-input path via a
  cast rather than a runtime guard — `listener.preventDefault()` when
  neither `event` nor the deprecated `window.event` fired,
  `parts.split(...)` when the input HTML has no `<body>` tag, and
  `past.pop()`/`future.pop()` (typed `as T`) whose original `unknown`
  return already assumed non-empty.
- `withAuthorization.tsx` / `asModulePage.tsx`: single-step
  `connect()`/wrapper HOCs over an arbitrary `ComponentType` — cast at
  the one and only step (`Component as never` into `connect(...)`),
  consistent with the Wrapper.tsx lesson for chains this short.
- `useRefCollback.ts` and `useBroadcastChannel.ts` are dead code — zero
  importers anywhere in either app or front-core itself (confirmed via
  repo-wide search). Converted as-is rather than deleted, same
  precedent as `FormElement.jsx` earlier in this migration.

## Fifty-fourth batch: `services/*` (11 files) — `services/` complete

The remaining `.js` files in `services/`: `processList.ts`, `services/ai/*`
(2 files), and everything in `services/eds/*` (8 files). The rest of
`services/` — `api/*`, `dataTable/*` — was already converted by the
concurrent process by the time this batch started.

- `processList.ts` is a widely-shared cache/dedup utility (~40 call
  sites across both apps). Typed `key: string` and `handler:
  (...args: unknown[]) => unknown` generically rather than narrowing to
  match any specific caller, since dozens of already-typed `.tsx`
  callers each pass differently-shaped handlers. One caller
  (`PreviewDocumentDirect.tsx`) passed a handler whose second parameter
  is narrowed to `string`, which a generic `unknown[]` rest-param
  handler type can't accept contravariantly — cast at that one call
  site (`fetchData as never`) rather than loosening the shared utility's
  signature for one caller.
- `services/ai/helpers/getCompletionStream.ts` calls a bare `getConfig`
  that was never imported, and has zero callers anywhere in the
  codebase — calling it would throw `ReferenceError: getConfig is not
  defined`. Preserved via a `declare const getConfig` ambient
  declaration scoped to this file rather than wiring up the
  (presumably intended) import, since there are no callers to verify
  intended behavior against and this migration doesn't silently fix
  pre-existing bugs.
- `services/eds/signer.ts` (734 lines) is by far the largest file in
  this batch — a from-scratch PKCS12/PKCS7 signing implementation built
  on `node-forge`, which ships no types and has no `@types` package.
  Added `types/node-forge.d.ts`, scoped to exactly what this file uses
  (`asn1`, `pki`, `pkcs12`, `pkcs7`, `util`, `md` namespaces, plus
  `Certificate`/`PrivateKey`/`Asn1Node`/`ByteBuffer`/`Attribute`/
  `P7Message` shapes) — loose `[key: string]: unknown` index signatures
  throughout rather than fully modeling forge's real API surface, since
  every consumer of `Signer`/`services/eds` is still untyped `.jsx`.
  Note: `node-forge`'s types must be imported as named imports
  (`import forge, { Certificate, PrivateKey, ... } from 'node-forge'`)
  rather than referenced as `forge.Certificate` — the ambient module's
  default export is a value, not a namespace, so `forge.Xxx` as a type
  position resolves to "cannot find namespace" even though the same
  property works fine as a runtime value access.
- `services/eds/helpers/hashToInternalSign.ts` calls
  `signer.execute('HashToInternal', ...)`, a command `Signer.send()`'s
  switch statement doesn't actually handle (falls through to `default:
  throw new Error('Unknown command...')`) — a pre-existing gap, left
  alone.
- `services/eds/helpers/getEncodeCert.ts`, `services/eds/helpers/
  promisify.ts`, `services/eds/EdsException.ts`, and
  `services/eds/SignerTestUtil.ts` (empty file) — all confirmed dead
  code via repo-wide search (zero importers). Converted as-is per this
  migration's established precedent for dead code, rather than deleted.

**`services/` is now fully TypeScript.**

## Fifty-fifth batch: `layouts/*` (19 files) — `layouts/` complete

All remaining `.js`/`.jsx` files in `layouts/`: the `Navigator/` subtree (6
files), `DebugTools/` and its 8 `tools/`, plus `Content.tsx`,
`DrawerContent.tsx`, `Header.tsx`, and the top-level `LeftSidebar.tsx`.

- **Both apps fully override this entire directory tree.** Confirmed via
  `find`: `admin-front` and `cabinet-front` each have their own
  `src/application/layouts/LeftSidebar.jsx`, their own
  `.../layouts/components/Navigator/` (with a completely different
  internal structure per app — cabinet-front has its own `Item.jsx`;
  admin-front has `NavItem.jsx`/`NavSubItem.jsx`/`NavItemContent.jsx`
  instead), and their own `Header.jsx`. Every file in this batch is
  genuinely unreachable at runtime for both apps — the top-level bare
  specifiers (`layouts/components/Navigator`, `layouts/components/Header`,
  `layouts/LeftSidebar`) resolve straight to each app's own override
  before ever reaching `packages/front-core`. Still had to convert and
  fully type-check cleanly, since `tsc --noEmit`'s `include` glob checks
  every front-core `.ts`/`.tsx` file regardless of reachability.
- **Found and fixed a self-inflicted bug from this same shadowing**:
  `Navigator/index.tsx`'s own imports of its sibling `CategoryHeader`/
  `Item` originally used bare specifiers
  (`'layouts/components/Navigator/CategoryHeader'`) instead of relative
  ones, matching the pre-existing (untyped) code exactly. Under
  TypeScript's per-app path-mapping resolution, `admin-front` happens to
  have no `Item.jsx` of its own, so the bare specifier fell through to
  front-core's sibling file — but `cabinet-front` DOES have its own
  `Item.jsx`, so the same bare specifier resolved to *that* file instead,
  which doesn't export the `MenuItem` type this batch's `index.tsx`
  needs. Fixed by switching front-core's internal Navigator
  cross-references to relative imports (`./CategoryHeader`, `./Item`,
  `./HoverMenu`, `./itemStyles`), matching the one place the original
  code already did this right (`HoverMenu.jsx`'s `import Item from
  './Item'`) — this guarantees siblings always resolve to each other
  regardless of per-app shadowing, for both the type-checker and (if
  this code were ever reachable) the bundler.
- Two more cross-app whole-module-missing cases, same established
  pattern as `SuccessMessage` earlier: `modules/tasks/components/
  CreateTaskButton` and `components/BreadCrumbs` are cabinet-front-only
  (referenced from front-core's dead `Navigator/index.tsx` and
  `LeftSidebar.tsx` respectively) — added `types/app-createTaskButton.d.ts`
  and `types/app-breadCrumbs.d.ts` ambient fallbacks.
  `admin-front`'s own `application/index.jsx` doesn't export `getModules`
  at all (only `cabinet-front`'s does, as a named re-export) — used the
  established dynamic-resolution cast (`(application as unknown as
  {getModules?: ...}).getModules`) rather than adding the missing export,
  preserving the exact "throws when admin-front's dead code calls it"
  behavior.
- Added `NavLink` to `types/react-router-dom.d.ts` (react-router v5's
  `activeClassName`/`exact` props) — the ambient declaration didn't cover
  it yet, needed by `Item.tsx`/`CategoryHeader.tsx`.
- **`react-split-pane`'s own shipped `.d.ts` doesn't declare a `children`
  prop on `SplitPaneProps`** (a real gap in the package's own types,
  despite the component obviously rendering two child panes) — and since
  `SplitPaneProps` is a `type` alias rather than an `interface`, it can't
  be fixed via module augmentation (TS only merges declarations for
  `interface`, not `type`). Worked around per-file with `const
  SplitPaneAny = SplitPane as unknown as React.ComponentType<Record<
  string, unknown>>` and used that for the JSX element instead
  (`CustomInterfaceCheck.tsx`, `EDSFormTest.tsx`, `LeftSidebar.tsx`).
- Established several more `withStyles`/`makeStyles` CSS-literal-widening
  fixes matching the `as const` pattern from `SchemaStepper.tsx`
  (`position`, `overflowY`, `overflowX`, `flexDirection`, `boxSizing` all
  needed it across these files) and the `AppTheme = Theme & {...}`
  intersection pattern for reading custom `theme.js` fields (repeated in
  `itemStyles.ts`, `CategoryHeader.tsx`, `Header.tsx`, `LeftSidebar.tsx`,
  `Navigator/index.tsx`).
- `makeStyles((theme) => ...)` in `HashToInternal.tsx`/`VerifyHash.tsx`
  needed an explicit `(theme: Theme)` annotation — `@mui/styles`'
  `DefaultTheme` is an intentionally empty interface pending module
  augmentation, so `theme.spacing` doesn't exist on it by default;
  matches the established precedent from `Tabs/index.tsx` and others.
- Dropped every `.propTypes = {...}` static assignment and its
  now-unused `prop-types` import across this batch (`Content`,
  `DrawerContent`, `Header`, `LeftSidebar`, `CategoryHeader`,
  `Navigator/index`, `DebugTools/index`, `Curator`) — confirmed no
  already-converted `.tsx` file anywhere in this migration keeps one.
  PropTypes validation only ever prints a dev-console warning and never
  affects rendered output, so removing it is a pure no-op at runtime,
  unlike `.defaultProps` (kept everywhere — React 18 still honors it on
  function components, and it's a genuine runtime behavior).
- `Header.tsx` needed both the *raw* `theme.js` module import (typed via
  a small `RawThemeExtras` cast) and the `withStyles` callback's own
  `theme` parameter (typed via the `AppTheme` intersection) — two
  different variables sharing the name `theme` in the original code, one
  shadowing the other inside the styles callback.
- `EDSSignVerify.tsx`/`HashToInternal.tsx`/`VerifyHash.tsx`/
  `EDSFormTest.tsx` all call `edsService.getSigner()`, which can return
  `undefined` (`Signer | undefined`), then immediately call `.execute()`
  on it with no guard — preserved the original throw-if-signer-missing
  behavior via `as Signer` rather than adding an optional-chain.

**`layouts/` is now fully TypeScript.**

## Fifty-sixth batch: `modules/*` (13 files) — `modules/` complete

All remaining `.js`/`.jsx` files in `modules/`: the entire `profile/`
module (appbar widget, language selector, and the full `UserProfile`
page with its five sub-components) plus two tiny standalone validator
stubs under `userProfile/pages/Profile/variables/`.

- **First real subclass of `ModulePage` in this migration.**
  `components/ModulePage/index.tsx` (converted in an earlier batch) was
  written as a non-generic `class ModulePage extends Component<ModulePageProps>`,
  which only ever needed to support `t`/`title`. `UserProfile`'s
  `index.tsx` is the first subclass that also needs `auth`, `classes`,
  `loading`, `location`, and `actions` on `this.props`. Rather than
  casting `this.props` at every access site in the subclass, made
  `ModulePage` generic (`class ModulePage<P extends ModulePageProps =
  ModulePageProps> extends Component<P>`) — a pure, additive type-level
  change with a defaulted parameter, so every other already-converted
  non-generic usage keeps compiling unchanged.
- **Found and preserved a second real "undeclared bare identifier"
  runtime bug**, matching the `getCompletionStream.ts`/`getConfig` case
  from the `services/` batch: `ProfileAppbar.tsx`'s constructor
  destructures `cabinetUrl`/`adminPanelUrl` from `getConfig()` into
  local consts, assigns neither to `this`, and then `render()` (via
  `renderOuterLink`) references `cabinetUrl`/`adminPanelUrl` as bare
  identifiers — which resolve to nothing in that scope and throw
  `ReferenceError` at runtime, in the one branch that's gated behind
  `userIsGod && userIsAdmin`. Documented in place and preserved via a
  module-level `declare const cabinetUrl: string` / `declare const
  adminPanelUrl: string` (compiles, provides no real binding) rather
  than silently wiring them onto `this`.
- `UserProfile/index.tsx`'s `handleChangePhone` builds a bare
  `new Promise((resolve) => this.setState(..., resolve))` — since
  `resolve` is never called with a value, TS can't infer the Promise's
  type parameter from usage and defaults it to `unknown`, making
  `resolve`'s signature `(value: unknown) => void` incompatible with
  `setState`'s required `() => void` callback. Fixed by declaring
  `new Promise<void>(...)` and wrapping the callback (`() =>
  resolve()`) — behaviorally identical (the original never passed
  `resolve` a value either) and resolves the inference gap.
- Same file's `<ProfileLayout {...this.props} {...this.state} .../>` —
  spreading two strictly-typed objects into a strictly-typed sibling
  component's props tripped up on `ModulePageProps.t` being optional
  while `ProfileLayoutProps.t` is required (structurally, spreading an
  optional field never satisfies a required one). Since `ProfileLayout`
  is loaded via `React.lazy()` with no HOC chain to hang a final cast
  off of, cast the lazy import itself to `React.ComponentType<Record<
  string, unknown>>` instead of touching either side's real prop types.
- `EmailInput.tsx`'s `<EJVError error={error} />` passes a native
  `Error` instance where `EJVError`'s `SchemaError` prop type (an AJV
  validation-error shape with an index signature) is expected — a
  version of the recurring "real runtime value doesn't match the
  library's expected error shape" mismatch; cast at the call site
  rather than loosening `EJVError`'s prop type for every other caller.
- `ProfileAppbar.tsx`'s `<UserName {...userInfo} />` needed the
  component itself wrapped in a `React.ComponentType<Record<string,
  unknown>>` cast (not just the spread) — `UserName.jsx`'s destructured,
  default-less `{firstName, lastName, middleName}` makes TS infer all
  three as required, and no spread of a loosely-typed object can
  satisfy specific required keys.
- `PhoneEditModal.tsx` imports the bare `'theme'` specifier (not
  `'core/theme'`), which — unlike every other `theme` usage in this
  migration — resolves to each **app's own** `theme.js`, not front-core's
  shared one. Confirmed `skipPhoneVerification` doesn't exist on either
  app's `theme.js` (another permanently-`undefined` dead-flag field, same
  pattern as the many already-documented `theme.xxx` quirks) — typed via
  a `RawThemeExtras`-style cast rather than assuming it's front-core's
  shared theme shape.

**`modules/` is now fully TypeScript.**

## Fifty-seventh batch: `components/*` singles (21 files)

The first batch inside `components/` (182 remaining files, the largest
directory in `packages/front-core`, deferred until all other outside-
JsonSchema directories were done). Started with every top-level component
directory containing exactly one `.js`/`.jsx` file: `ValidatePhoneMessage`,
`TwoFactorCode`, `Table`, `SelectUserDialog`, `SelectFileArea`, `Scrollbar`,
`PrivateRoute/NoPermission`, `PDF`, `KeyboardDatePicker`, `HighlightText`,
`FullScreenDialog`, `FileViewerDialog`, `ExpansionPaper`, `ErrorScreen`,
`Disclaimer`, `ConfirmDialog`, `ChipTabs`, `ChangePassword`, `BpmnAi`,
`BlockScreenReforged`, `Altcha`.

- **`BpmnAi/index.tsx`** (2087 lines) was by far the largest file
  converted in this batch, and a genuine cross-app case: `actions/bpmnAi`
  exists **only in admin-front** (the BPMN AI assistant/builder is an
  admin-front-only feature) — added `types/app-bpmnAiActions.d.ts` as
  the established cross-app whole-module-missing fallback. Two of its
  npm dependencies (`react-markdown`, `remark-gfm`) are similarly
  admin-front-only — genuinely absent from cabinet-front's
  `node_modules`, not just untyped — needing both an ambient module
  fallback (`types/react-markdown.d.ts`) *and* confirmation the real
  admin-front-installed types resolve first where they exist. Also
  needed new ambient declarations for two untyped npm packages actually
  used in both apps: `react-syntax-highlighter` and (spilling into this
  same file) `mgr-pdf-viewer-react` for `PDF/index.tsx`.
- **`Table/index.tsx`** and **`ChipTabs/index.tsx`, `BpmnAi/index.tsx`**
  are all dead code confirmed via repo-wide search (zero importers of
  `components/Table` anywhere) or effectively so — converted per this
  migration's established precedent for dead code rather than deleted.
- Several more MUI invalid/nonexistent-prop quirks in the same
  established category: `<TableCell numeric={...}>` (an MUI v0.x prop,
  long removed — modern `TableCellProps` has no such field at all) in
  `Table/index.tsx`; `<IconButton className={{...}}>` in
  `FullScreenDialog.tsx` passing a plain object where `className`
  expects a string (React stringifies it to `"[object Object]"` at
  render — a real, preserved rendering bug, not a typo I introduced).
- **`react-dropzone@10.2.1` is installed, but its own shipped `.d.ts`
  describes a materially different, newer API** (hook-based
  `useDropzone`, no `activeClassName`/`id`/`onClick` props on the
  `<Dropzone>` component) — a real version/types mismatch inside the
  package itself, not something introduced by this migration. Worked
  around in `SelectFileArea.tsx` the same way as `react-split-pane`'s
  incomplete types earlier: cast the component reference itself
  (`DropzoneAny = Dropzone as unknown as React.ComponentType<Record<
  string, unknown>>`) rather than fight prop-by-prop.
- **`@mui/x-date-pickers@5`'s real `DatePicker` API is materially
  different from `KeyboardDatePicker.tsx`'s v4-era usage**
  (`open`/`onClose` combined with `renderInput`, plus
  `leftArrowButtonProps`/`rightArrowButtonProps`, which the current
  version doesn't have at all) — same whole-component-cast treatment,
  and also matches the already-established precedent in `RegisterList/
  components/renderFilters.tsx` of using `renderInput={(params: any) =>
  ...}` with an explicit lint-disable for this exact library's
  `renderInput` callback — the one place in this migration `any` (not
  `unknown`) is the established idiom, since `unknown` can't support the
  spread-and-reshape this callback needs.
- `ProfileAppbar`-style bug repeats in `Disclaimer/index.tsx`:
  `classNames({..., className, ...})` uses `className` as an object-
  literal **shorthand property** (`className: className`, using the
  literal string `"className"` as the CSS class name, not the prop's
  actual value) — a real, silent dead-code quirk in the original,
  preserved exactly.
- `ConfirmDialog.tsx`'s `<ProgressLine classes={classes.progressLineWrapper}>`
  passes a plain **string** into a prop that
  `Preloader/ProgressLine.jsx` (still untyped, not yet converted)
  destructures as `classes.root`/`classes.progress` — silently
  evaluates to `undefined` for both at runtime. Same pattern, different
  file: `FileViewerDialog.tsx` passes a `fileName` prop that
  `FilePreview/index.jsx` (also still untyped) never even destructures,
  a pure no-op pass-through. Both preserved via casts on the *consuming*
  side rather than touching the not-yet-converted receiving components.
- `SelectFileArea.tsx`'s `detect()` (from `detect-browser`) is typed to
  possibly return `null`; the original destructures `{ name }` from it
  unconditionally. Preserved the exact crash-if-null behavior with a
  non-null assertion rather than a defensive guard.

## Fifty-eighth batch: `components/UserSettings/*` and `components/Auth/*` (9 files)

- `UserSettingsDialog.tsx` calls a bare `t('EditorSettings')` with no
  `useTranslate` import in scope — same "undeclared bare identifier"
  bug as `ProfileAppbar.tsx`/`getCompletionStream.ts` earlier. The only
  real caller (`UserSettingsButton`) always passes a truthy `title`, so
  this line is never actually reached. Preserved via `declare const t`.
- `UserSettingsDialogView.tsx`'s `<DialogContent height="400px">` is
  another MUI invalid-prop case (`DialogContentProps` has no `height`
  field) — spread-cast, matching the established pattern.
- `Auth/index.tsx` — the top-level app-mount auth gate, the highest-
  fan-in file in this batch. Used the existing `AuthState`/`AuthUnit`
  types from `core/types/authState` directly rather than re-deriving
  loose shapes, since they already model this exact reducer slice.
  `application`'s `access`/`getInitActions` differ by app (admin-front:
  `{userHasRole: 'admin'}`; cabinet-front: `access = null`) — both still
  untyped `.jsx`, so `checkAccess(access, ...)` needed a cast since
  `access` can genuinely be `null` for one app but `checkAccess`'s
  `required` param isn't declared nullable.
- Added an ambient declaration for `jwt-decode` (installed at the old
  v2.2.0, which ships no types and predates the package's later
  bundled-types versions).
- `LoginScreen.ts` assigns `window.location = someString` directly
  (the legacy string-assignment navigation idiom, equivalent to setting
  `.href`) — real DOM types don't allow assigning a bare string to
  `Window.location`, so cast the assignment target rather than rewrite
  it to `.href` (behaviorally identical, but changing the exact
  expression form wasn't necessary to satisfy the type checker).

## Fifty-ninth batch: `components/BpmnSchema/*` and `components/FilePreview/*` (10 files)

- Added `types/bpmn-js.d.ts`: `bpmn-js` ships no types and there is no
  `@types` package. Declares `bpmn-js/lib/Modeler` and
  `bpmn-js/lib/NavigatedViewer`, both implementing a shared
  `BpmnJsInstance` shape (`get`/`on`/`off`/`importXML`/`saveXML`/
  `destroy`) scoped to exactly what `BPMNEditor.tsx`/`BPMNViewer.tsx`
  use. `.css` imports from `bpmn-js` are already covered by vite/client's
  ambient `*.css` module, so no separate declaration was needed for those.
- `Statuses.tsx` and `CustomEventAdapter.ts` (BpmnSchema's other two
  members) turned out to be dead code at runtime — `CustomEventAdapter`
  is only ever re-exported from `index.ts`, never consumed anywhere else
  in either app. Its `initHandlers`/`fire` methods access
  `this.eventBus` unconditionally, matching the original's unguarded
  access; preserved with `this.eventBus!.on(...)` (non-null assertion)
  rather than `?.` optional chaining, since the latter would silently
  change a would-be crash into a no-op if this code path were ever
  actually exercised.
- `CodeDocument.tsx` has a real "same prop, different runtime shape"
  quirk: `file` is a plain `string` for the sibling 'pdf'/image cases in
  `FilePreview/index.tsx`, but for the 'json'/'bpmn' branch handled here
  it's actually an object accessed as `file.filePath`. Typed the prop
  `unknown` and cast per-branch at the point of use rather than widening
  the prop type to a union that would leak the wrong shape into the
  'json' branch.
- `PdfDocument/index.tsx`: `makeStyles((theme) => ...)` was inferring
  `theme` as the empty `DefaultTheme`, hiding `.breakpoints` (4 call
  sites) — fixed by importing and annotating `(theme: Theme)`, the same
  fix used for earlier `withStyles`/`makeStyles` files this migration.
  `react-pdf`'s real `<Page>` type has no `tabIndex` prop at all, unlike
  the plain native `<div tabIndex="0">` elsewhere in the same file (those
  were normalized to `tabIndex={0}`, a behaviorally-identical numeric
  literal for a native DOM attribute) — since `Page` has no such prop to
  begin with, preserved the exact original string value via a spread-cast
  instead: `{...({ pageNumber, width, tabIndex: '0' } as unknown as
  Record<string, unknown>)}`.
- `xslx.tsx`: `xlsx` ships its own real types (`node_modules/xlsx/types`,
  v0.20.3), so no ambient declaration needed. Cast `FileReader` result,
  regex-match array access, and untyped row/column index access
  (`(r as unknown as Record<number, unknown>)[c.key]`) at each use site.
- `FilePreview/index.tsx`: the parent component. `PdfDocument`'s call
  site never actually reads `darkTheme` or `hideMainPDF` (confirmed via
  `PdfDocumentProps`, matching the original untyped `.jsx` which never
  destructured either) — both passed via one combined spread-cast rather
  than declaring them as real props. Same "accepted but never read"
  pattern applied to `<Preloader flex={true} />`: `Preloader/index.jsx`
  (still untyped, its own conversion comes later in `components/`) has
  no `flex` field in its real inferred prop shape — cast on the calling
  side via `{...({ flex: true } as unknown as Record<string, unknown>)}`
  rather than touching the not-yet-converted `Preloader` component.

## Sixtieth batch: `components/P7SForm/*` (4 files) and `components/Label/*` remainder (4 files)

- Added `types/promise-timeout.d.ts`: `promise-timeout` ships no types
  and there is no `@types` package — a one-function ambient module
  (`timeout<T>(promise, timeoutMillis): Promise<T>`, plus `TimeoutError`)
  scoped to its actual (trivial) real API, confirmed by reading its
  source directly.
- `FileKeySignForm.tsx`: `edsService.getSigner()` is typed to possibly
  return `undefined` (`[signer].filter((s) => s.inited).shift()`), but
  the original always calls `.execute(...)` on the result unguarded —
  preserved with a non-null assertion at each call site rather than a
  defensive check. `Signer.execute(...)`'s return type is `unknown`
  (async with no return annotation), so every call site that reads a
  property off the result needs a local cast (`PrivateKeyContainer`,
  `Certificate`) rather than widening `execute`'s own signature.
  `validate()`'s `server === null` check is dead code (state.`server`
  is a `number`, initialized to `0`, never set to `null` anywhere) —
  kept via `(server as unknown) === null` instead of deleting the
  always-false branch.
- `handleChange`'s dynamic `this.setState({ [name]: target.value, errors })`
  hit a `React.Component.setState` overload quirk: casting the argument
  to `Partial<State>` still fails because the single-object-argument
  overload resolves to `Pick<State, K>` from the object's own keys and
  rejects `| undefined` on any of them — `Partial<State>` reintroduces
  exactly that. Cast to `as never` instead (only ever called with
  `'selectedKey'`/`'password'`, both real `string | null` fields).
- `FileKeySignFormContent.tsx`/`index.tsx`: `<Button setId={...}>` and
  `<Tabs disabled={...}>` are both invalid props on their respective
  real MUI types (`setId` is a project-local convention with no
  corresponding declared prop on `Button`; `Tabs` has no `disabled` at
  all, only `Tab` does) — both preserved via spread-casts rather than
  dropped.
- `Label/UserName.tsx`: typed `mapStateToProps`'s `users` slice with a
  local minimal `UserRecord` shape (matching `reducers/users.ts`'s
  actual runtime fields) rather than importing that reducer's
  unexported internal `User`/`UsersState` types.
- `Label/Deadline.tsx` imports its sibling `Time.tsx` via a relative
  path (`./Time`) rather than the original bare `components/Label/Time`
  specifier, per the established front-core-internal-reference
  convention (guards against per-app override shadowing even though
  neither app currently overrides this particular file).
- Noted, not fixed (out of scope for this batch/directory): admin-front's
  `npm run typecheck` currently reports 6 pre-existing `TS2322` errors in
  `src/application/actions/{events,gateways,workflow}.ts` and
  `tasks/index.ts` — all outside `packages/front-core`, last modified
  two days before this batch, unrelated to `P7SForm`/`Label`/`BpmnSchema`/
  `FilePreview`. Confirmed via `git status`/file mtimes these predate
  and are untouched by this session's work; left for whichever pass is
  actively converting `application/actions/*` to resolve.

## Sixty-first batch: `components/DataGridPremium/*` (4 files), `components/TreeView/*` (3 files), `components/TreeList/*` (3 files)

- `DataGridPremium` is a large hand-rolled data-grid (not MUI's real
  `DataGrid`) with fully dynamic `columns`/`actions`/`row` shapes typed
  loosely via exported `Row = Record<string, unknown>`, `Column`, and
  `Actions` interfaces (re-exported from `index.tsx` for `Toolbar.tsx`
  to import). `makeStyles((theme) => ...)` needed the same `Theme`
  annotation fix as prior batches (both `index.tsx` and `Pagination.tsx`).
  `React.useCallback(actions.onColumnSortChange, [...])` doesn't type-check
  when the callback type includes `| undefined` (`useCallback`'s generic
  requires `T extends Function`) — cast the argument to the concrete
  function type at each of the three `useCallback(actions.onX, ...)` call
  sites. `allSelectableIds` needed an explicit `useMemo<unknown[]>(...)`
  generic: TS 5.5's inferred-predicate feature turns
  `.filter((id) => id !== undefined)` into a `NonNullable<unknown>`
  (i.e. `{}`) narrowing, which then rejects a plain `unknown` id in a
  later `.includes()` call.
- `Pagination.tsx`: `mainScrollbar` (from Redux `state.app.mainScrollbar`)
  follows the established `unknown`-typed pattern already used in
  `Scrollbar/index.tsx`'s own `mapStateToProps`; its `._container`/
  `.updateScroll()` reach past the real `react-perfect-scrollbar` type's
  public API into internal instance state, so cast to a minimal local
  `MainScrollbar` shape at each access rather than widening the real
  type.
- `TreeView/*` (dict-keyed recursive tree — distinct from the
  array-keyed `TreeList/*` despite the similar name) shares a
  `TreeViewRest` prop-bag interface across all three files for the
  recursive `...rest` spread between `TreeViewList` and `TreeListItem`.
  `<ListItem button>` is preserved via a spread-cast (MUI's real
  `ListItemProps` no longer has a bare `button` shorthand prop).
- `TreeList/TreeListItem.tsx` doesn't destructure `listWithAddIcon`,
  `forwardedRef`, or `itemRefs` even though `TreeList/index.tsx` passes
  all three — confirmed "accepted but never read" (no rest spread
  either, so they're silently dropped at runtime); preserved via a
  spread-cast at the call site in `TreeList/index.tsx` rather than
  adding the fields to `TreeListItem`'s real prop type.
- `TreeListSelect.tsx`: `selected` is genuinely `TreeItem | TreeItem[]`
  depending on call site (`renderButton`/`renderSelected` treat it as a
  single item; `renderRegisterSelect`/`renderSelectedValueName` treat it
  as an array) — kept the prop typed as the full union and cast per use
  site rather than picking one shape. `StringElement` (from
  `components/JsonSchema/elements/StringElement`, already TypeScript)
  is called twice without its required `stepName`/`rootDocument`/
  `parentValue` props — aliased to a local
  `React.ComponentType<Record<string, unknown>>` (`StringElementAny`)
  rather than spread-casting each call, since both calls are missing
  the same required props. `updatePosition` is a dynamically-assigned
  instance method (never set in the constructor, only inside
  `Popover`'s `action` callback) — declared as an optional class field
  (`updatePosition?: () => void`) rather than initialized.
- Reused `styles`'s theme fields (`leftSidebarBg`, `nestedItem`,
  `categoryWrapperActive`, `outlineColor`) via a local
  `AppTheme = Theme & {...}` intersection, per the established
  per-file pattern (not a shared type, matching `ConfirmDialog/index.tsx`'s
  precedent).

## Sixty-second batch: `components/StimulSoft/*` (3 files), `components/Snackbars/*` (3 files), `components/SelectFilesDialog/*` (3 files), `components/Select/*` (3 files)

- **Found but intentionally not fixed — flagging explicitly**:
  `SelectFilesDialogContent.tsx` has an inverted condition,
  `{!file && (<Card>...{file.name}...</Card>)}` (should almost
  certainly be `file &&`) — as written, the "selected file" card only
  attempts to render when there is NO file, so `file.name`/`file.size`
  execute against `null` and would throw at runtime. Confirmed by
  reading the original `.jsx` byte-for-byte — this is not a conversion
  artifact. Preserved exactly via `(file as unknown as File).name`
  rather than fixing the condition, per this migration's "never
  silently fix pre-existing bugs" rule, but this one seems worth the
  user's attention rather than just a doc footnote.
- Added three new ambient declarations: `types/xml-asset.d.ts`
  (`assetsInclude: ['**/*.xml']` in both apps' vite.config makes `.xml`
  imports resolve to a URL string — confirmed in vite.config.mjs);
  `types/stimulsoft.d.ts` (Stimulsoft Reports loads via `<script>` tags
  at runtime and attaches to `window.Stimulsoft`, ships no types —
  scoped to exactly the constructors/properties
  `ReportContainer`/`ReportViewer`/`ReportDesigner` touch, with every
  constructed instance typed as a loose `Record<string, unknown>` and
  cast at each deeper property-access site rather than modeling every
  nested options shape); `types/filesize.d.ts` (declared in
  `package.json` as `^6.4.0` but genuinely absent from both apps'
  `node_modules` — confirmed via no resolved entry in either
  package-lock.json; the build didn't fail on the missing package only
  because `SelectFilesDialog` turned out to be **dead code** — confirmed
  via a repo-wide grep finding zero importers outside its own
  directory in either app, so Vite/Rollup's module graph never actually
  visits the file that references it).
- Added `types/react-window.d.ts` and
  `types/react-window-infinite-loader.d.ts`: both packages are
  installed but ship no types and have no `@types` package, scoped to
  `VariableSizeList`/`InfiniteLoader`'s usage in
  `Select/components/ListboxComponent.tsx`.
- `ListboxComponent.tsx`'s prop interface briefly included an index
  signature (`[key: string]: unknown`) alongside its named `children`
  field for the `...other` rest capture — this caused
  `React.Children.toArray(children)` to see `children` typed as
  `unknown` instead of `ReactNode` (destructuring interacts oddly with
  index signatures through `React.forwardRef`'s prop utility types).
  Fixed by dropping the index signature — nothing needs it, since this
  component is only ever referenced as a bare value (`ListboxComponent`
  passed to MUI's `Autocomplete`), never invoked directly as a JSX tag
  with a checked prop object, so the interface can stay closed.
- **Cross-cutting regression from newly-typing `getTextWidth`/`Row`/`Column`/`Message`
  in shared files**: converting `ListboxComponent.jsx`'s `getTextWidth`
  and `DataGridPremium`'s `Row`/`Column` and `Snackbars/Message.jsx`
  from untyped JS to real TypeScript surfaced type mismatches in THREE
  already-converted call sites that were never touched this batch:
  `helpers/renderOneLine.tsx` and
  `StringElement/components/layout.tsx` call `getTextWidth` with
  `font: string | undefined` and `text: string | number` respectively
  (both real, confirmed usages) — widened `getTextWidth`'s signature to
  `(text: string | number, font?: string)` to match, rather than
  patching every caller. `ExternalReaderRegisterFilePreview/index.tsx`
  passes `<DataGrid rows={files} columns={columns} .../>` with locally
  fitting-but-not-identical `Row`/`Column` shapes — fixed with a
  spread-cast at that call site (safe here since every `DataGridProps`
  field is optional, unlike the earlier `FilePreview`/`FileViewerDialog`
  required-prop cases). `Auth/index.tsx` calls
  `new Message(msg, 'permanentWarning', false, false, callback)` —
  passing `false` for the `data` constructor arg (not an object) — a
  real, confirmed-only-occurrence-in-the-codebase quirk; widened
  `Message`'s `data` field/param to `Record<string, unknown> | false`
  rather than casting at that one call site, and propagated the same
  widened type into `Snackbar.tsx`'s `SnackbarError.data`.

## Sixty-third batch: `components/Preloader/*` (3), `components/Virtualized/*` (2), `components/Snackbar/*` (2), `components/FileDataList/*` (2), `components/DataSheet/*` (2), `components/DataList/*` (2)

- Confirmed `Preloader/index.tsx`'s real prop shape is exactly
  `{ classes }` — every `<Preloader flex={true} />` /
  `<Preloader className={...} />` call site across this migration
  (`FilePreview`, `StimulSoft/ReportContainer`, `DataList/index.tsx`)
  was already correctly treated as "accepted but never read" via a
  spread-cast, now verified against the real converted component
  rather than an assumption.
- **Found but intentionally not fixed — flagging explicitly**:
  `components/Snackbar/Snackbar.tsx` and `SnackbarContent.tsx` (the
  singular-named directory, distinct from the already-converted
  `Snackbars/*`) both render `{icon ? <icon className={classes.icon} /> : null}`
  where `icon` is a `string` prop. A lowercase JSX tag name is always
  compiled to a literal DOM element name, never a variable lookup — so
  this renders a meaningless empty `<icon>` element and the actual
  icon string content is never displayed. Confirmed via a repo-wide
  grep that `components/Snackbar/*` has zero importers in either app
  (dead code, like `SelectFilesDialog` from the previous batch), so
  this bug has no live effect today, but is a second real, confirmed
  defect in this area worth the user's attention. Preserved exactly by
  swapping the JSX literal for the equivalent
  `React.createElement('icon', { className: classes.icon })` — JSX
  itself cannot express `<icon>` as anything other than a real
  `JSX.IntrinsicElements` lookup, so the literal tag doesn't compile,
  but `createElement` with a bare string type isn't validated against
  `IntrinsicElements` and reproduces the identical runtime behavior.
  Also: `variables/styles/snackbarContentStyle.jsx`, the style import
  both files depend on, doesn't exist anywhere in the repo — a second
  confirmation this whole directory is dead/abandoned. Added
  `types/app-snackbarContentStyle.d.ts` as a fallback so the (unreachable)
  import still type-checks. Real MUI v5 `Snackbar` has no
  `SnackbarContentProps` prop (removed since MUI v4) — preserved via a
  spread-cast rather than dropped.
- `DataSheet/index.tsx` (the most structurally involved file this
  batch): the class extends `react-datasheet`'s `ReactDataSheet` and
  overrides more than a dozen of its internal/protected methods
  (`_setState`, `handleKey`, `handleCopy`, `handlePaste`, `onMouseDown`,
  `onMouseOver`, `onMouseUp`, `pageClick`, etc.) and reads internal
  instance fields (`dgDom`, `editing`, `defaultState`) that the
  package's own shipped `.d.ts` doesn't declare at all (it only exposes
  `getSelectedCells` and a `DataSheetState` with a handful of optional
  fields) — the established "shipped types describe a materially
  narrower API than what's used" pattern, but for a base class being
  *extended* rather than a component being rendered. Fixed by casting
  the imported class itself to a constructor type returning a locally
  declared `DataSheetInstance` interface covering every member actually
  touched, then extending that cast reference:
  `class DataSheet extends (ReactDataSheet as unknown as new (props) => DataSheetInstance)`.
  Added `types/react-datasheet-datacell.d.ts` (the deep import
  `react-datasheet/lib/DataCell` isn't covered by the package's
  root-only `"types"` field) and
  `types/react-virtualized-autosizer.d.ts` (`react-virtualized` ships
  no types at all, no `@types` package, scoped to `AutoSizer`'s render-prop
  usage here).
- `DataList/Pagination.tsx`'s `_.uniq` call surfaced a gap in the
  existing shared `types/lodash-fp.d.ts` ambient declaration (added in
  an earlier batch, scoped only to the handful of `lodash/fp` functions
  used at the time) — added a generic `uniq<T>(array: T[]): T[]` member
  rather than creating a second, conflicting declaration for the same
  module.
- `FileDataList/ListTemplate.tsx` calls into three still-untyped
  `FileDataTable/components/AttachesActions/*` components
  (`ShowPreview`, `DownloadFile`, `DownloadP7SFile`) passing a
  `fileStorage` prop none of them destructure or read — another
  "accepted but never read" case, but this time via the whole-component-cast
  approach (aliasing each import to
  `React.ComponentType<Record<string, unknown>>`) rather than a
  per-call spread-cast, since a spread-cast surfaced "missing required
  property" errors for their other (real, required) fields — the same
  distinction documented for `FileViewerDialog`/`FilePreview` earlier
  in this migration. `FileDataList/index.tsx` needed the same
  whole-component-cast treatment for `DataList` itself, since
  `DataListProps.count`/`ItemTemplate` are required.

## Sixty-fourth batch: `components/Attach/*` (7 files)

- The most thoroughly dead/abandoned directory found so far in this
  migration. Confirmed zero importers anywhere in either app (same
  check as `SelectFilesDialog`/`Snackbar` earlier), and it depends on
  **eight** modules that don't exist anywhere in the repo: five style
  objects (`variables/styles/attaches`, `attachesWizardStep`,
  `customInputStyle`, `tableStyle`, `claimList` — plain objects spread
  with `...`, not functions, unlike the `Snackbar` batch's single
  missing style function), two helpers (`helpers/getAttachName`,
  `helpers/getAttachStates`), and a `components` barrel import
  (`import { Table } from 'components'` / `import { Button } from
  'components'`) — no `components/index.ts` exists in this repo at all.
  `AttachTable.tsx`'s `mapStateToProps` also reads a `datafetched`
  Redux slice that has no corresponding reducer anywhere. Added
  `types/app-attach-dead-code.d.ts` consolidating ambient fallbacks for
  all of these so the directory still type-checks; none of them were
  ever actually reachable at runtime, so no attempt was made to wire up
  real implementations.
- `AttachList.tsx`'s `attachSetId = (index) => (elmentName) =>
  setId(`${index ? ... : ''}${elmentName}`)` has a real, load-bearing
  quirk: the truthy check on `index` (not `index !== undefined`) means
  the falsy value `0` — the very first item in a `.map((attach, index)
  => ...)` — gets treated the same as "no index provided", so the first
  attach's generated element IDs are missing their numeric prefix while
  every subsequent one has it. Also called once with the *string*
  `'table'` instead of a number (`attachSetId('table')`), relying on
  JS's `+` operator falling back to string concatenation
  (`'table' + 1 === 'table1'`) — typed the parameter `number | string`
  and preserved the exact expression (with an inner cast, not a value
  coercion) rather than "fixing" either quirk.
- `AttachTable.tsx`/`Attach.tsx`'s calls to the already-converted
  `helpers/downloadBase64Attach` pass `{ propsName, fileName,
  userFileName }` as the first argument, but that helper's real
  (already-typed) parameter shape is `{ fileName, description,
  scanDocumentName }` — `propsName`/`userFileName` don't exist on it at
  all, a call site that never matched the real signature. Cast via
  `Parameters<typeof downloadBase64Attach>[0]` rather than exporting
  the helper's previously-internal parameter interface just for this
  one dead call site.
- `Preview.tsx`/`PreviewDialog.tsx` call several already-converted,
  strongly-typed components (`Media`, `HTMLPreview`, `UnknownFormat`)
  with prop objects missing those components' required fields — spread-casting
  to `Record<string, unknown>` surfaced "missing required property"
  errors (the same distinction as `FileViewerDialog`/`FilePreview`
  earlier), so each was aliased to a
  `React.ComponentType<Record<string, unknown>>` at the import site
  instead.
- `AttachList.tsx`'s `<Attach {...spreadProps} />` initially had `key`
  folded into the spread-cast object — React does still honor a `key`
  field inside a spread props object (special-cased in
  `createElement`), so behavior was correct, but `eslint-plugin-react`'s
  `react/jsx-key` rule only recognizes a literal `key=` JSX attribute
  and flagged a new warning. Pulled `key` back out to a literal
  attribute (keeping everything else in the spread) to keep lint clean
  without changing runtime behavior.

## Sixty-fifth batch: `components/CustomInput/*` (8 files)

- Mixed batch: `CustomDatePicker.tsx` and `FileInputField.tsx` are
  real, live components (used by `JsonSchema/elements/Date.tsx`,
  `modules/profile/.../ProfileLayout.tsx`, and `P7SForm/FileKeySignFormContent.tsx`
  respectively); `CustomCheckboxesFilter.tsx`, `CustomInput.tsx`,
  `CustomInputWrapper.tsx`, `CustomDateTimePicker.tsx`, and
  `DateRangePicker.tsx` are all confirmed dead (zero importers
  anywhere in either app, reusing the same `variables/styles/customInputStyle`
  ambient fallback already added for the `Attach` batch).
- `CustomDatePicker.tsx` uses the legacy `@material-ui/pickers`-era
  prop surface on `DesktopDatePicker` (`keyboard`, `autoOk`,
  `cancelLabel`, `disableToolbar`, `leftArrowButtonProps`,
  `rightArrowButtonProps`, `shouldDisableDate` — none of which exist on
  the installed `@mui/x-date-pickers`' real type) — same
  version/API-mismatch pattern as `EDSFormTest`/`react-dropzone`
  earlier in this migration; cast the whole `DesktopDatePicker`
  reference to `React.ComponentType<Record<string, unknown>>` rather
  than fighting each invalid prop individually, since nearly the whole
  prop list is affected. `DateRangePicker.tsx` (dead) and
  `CustomDateTimePicker.tsx` (dead) needed the same whole-component
  cast for `CustomDatePicker`/`DateTimePicker` respectively.
- `FileInputField.tsx` reuses the exact `react-dropzone@10.2.1`
  version/types mismatch already documented for
  `SelectFileArea/index.tsx` — same `DropzoneAny` alias pattern.
- `TextFieldDummy.tsx` (real, used by `JsonSchema/elements/Date.tsx`,
  already consumed there via a loose cast) needed a cast on
  `React.Children.toArray(children)` results before accessing
  `.props.value`/`.props.children`, since array elements returned by
  `Children.toArray` are typed as `ReactChild` (string | number |
  ReactElement), not guaranteed to have `.props`.
- `CustomCheckboxesFilter.tsx` (dead): `value` is typed via PropTypes
  as `object` with a default of `{}`, but is used exclusively as an
  array (`toArray(value)`, `(value || []).includes(id)`) — another
  "PropTypes lying about the real runtime shape" case; typed the prop
  `unknown` and cast per use site rather than fixing the PropTypes-implied
  shape or the arguably-wrong `{}` default.

## Sixty-sixth batch: `components/Editor/*` (14 files)

- **Found but intentionally not fixed — flagging explicitly, this one
  is LIVE**: `DragProvider.tsx` (the drag-and-drop handler wrapping the
  Monaco editor) references a bare `monaco` identifier in two code
  paths — `onDragEnd`'s auto-format check/`new monaco.Range(...)`, and
  `handleDrop`'s `appendText`'s format check/`new monaco.Range(...)` —
  with no import, no global declaration, and no bundler `ProvidePlugin`
  anywhere in either app's vite config. Unlike the two previous
  confirmed bugs this session (`SelectFilesDialog`, `Snackbar`), this
  component is genuinely live: `Editor` (the directory this belongs to)
  is imported from 16+ call sites across both apps, including
  `CodeEditDialog`, `JsonSchema/editor`, and several `DebugTools`
  pages. If a user ever drags a file/text onto a Monaco editor instance
  with format-on-type enabled (or onto the "cdr dnd-target" drop
  zone), this throws `ReferenceError: monaco is not defined`. Preserved
  exactly via `declare const monaco: Monaco;` (typed via
  `@monaco-editor/react`'s own `Monaco` export, see below) rather than
  wiring up the obviously-intended `useMonaco()` import, per this
  migration's rule — but this one seems worth fixing for real,
  independent of the TS conversion.
- `EditorDialog.tsx` has an actual Rules-of-Hooks violation:
  `const onSave = handleSave && useCallback(...)` calls `useCallback`
  conditionally based on a prop value. If `handleSave` ever changes
  between falsy and truthy across renders of the same component
  instance, React's hook-call-order invariant breaks. Lower severity
  than the `monaco` bug (most callers pass a stable `handleSave`), but
  noted rather than silently normalized to an unconditional hook call.
- `monaco-editor`'s own package.json declares an `exports` map with
  `types: "./esm/vs/index.d.ts"` for its root entry, but this project's
  `moduleResolution` setting doesn't resolve that map for a *direct*
  `import ... from 'monaco-editor'` — every file that imported types
  from it directly failed with "Could not find a declaration file for
  module 'monaco-editor'". Fixed everywhere by deriving the needed
  types from `@monaco-editor/react`'s own re-exports instead (which
  resolves fine, since TS pre-resolved that package's own `.d.ts` at
  its build time): `Monaco` (its own exported alias for the real
  monaco namespace type), `Parameters<OnMount>[0]` for the editor
  instance type, and
  `Parameters<Parameters<Monaco['languages']['registerHoverProvider']>[1]['provideHover']>`
  to reach `provideHover`'s `model`/`position` parameter types (needed
  in both `useLanguageProvider.tsx` and `useControlDictionaryProvider.tsx`
  — TS doesn't contextually infer parameter types for a generic
  interface method implemented as a plain object-literal property).
- `defaultEditorOptions.ts` had two duplicate keys with identical
  values (`scrollBeyondLastLine`, `automaticLayout`, each declared
  twice) — real duplicate-object-literal-key errors under TypeScript
  (same class of issue as the batch-51 locale-file codemod), fixed by
  dropping the earlier of each pair (no behavior change, since both
  copies held the same value).
- `DiffEditor.tsx` always passes `defaultLanguage="json"` to
  `@monaco-editor/react`'s real `DiffEditor`, whose actual prop is
  `language` — `defaultLanguage` isn't a real prop at all and was
  already being silently dropped. Cast the whole `MonacoDiffEditor`
  reference rather than the individual prop, since the surrounding
  `{...props}` spread (an intentionally loose passthrough interface)
  made a single-prop spread-cast awkward here.
- **Cross-cutting regression from `Editor`'s own props becoming
  strictly typed**: `Editor`'s `onChange`/`value` props now match the
  real Monaco `OnChange` signature (`value: string | undefined`),
  which broke five already-converted call sites that declared or
  passed narrower types assuming `value` is always a plain `string`:
  `CreateControlSnippet.tsx` (`RenderCodeEditorProps.onChange: (value:
  string) => void`), `UserSettingsDialogView.tsx` (`onChange={setValue}`
  where `setValue: (value: string) => void`), `CustomInterfaceCheck.tsx`
  (two `<Editor>` call sites passing `useState<string | boolean>`'s
  setter directly as `onChange`, and `func || ''` as `value` — which
  can itself evaluate to the boolean `true` when `func` is `true`, a
  real quirk from `||`'s short-circuit-returns-the-truthy-operand
  behavior, not just a string-vs-undefined mismatch), and
  `EDSFormTest.tsx` (`value={result}` where `result: unknown`). Fixed
  each at the call site with a targeted cast rather than loosening
  `Editor`'s own real, correct prop types.

### Post-batch fix: real dev-server crash traced to a circular import

After landing the batch above, the app failed to load in the browser with
`ReferenceError: Cannot access 'CodeEditDialogUntyped' before initialization`
at `JsonSchema/elements/CodeEditor.tsx:27`. Traced the full cycle by fetching
each module's transformed source directly from the running Vite dev server
(`curl http://localhost:5173/@fs/...`) rather than guessing from static
source, since manual reasoning about circular-ESM evaluation order is
extremely easy to get wrong:

`JsonSchema/elements/CodeEditor.tsx` → `components/CodeEditDialog` →
`CodeEditDialog/CodeEditor.jsx` → `components/Editor` →
`Editor/EditorDialog.tsx` → `components/UserSettings` (barrel) →
`UserSettingsButton.tsx` → `UserSettingsDialog.tsx` →
`UserSettingsDialogView.tsx` → `components/JsonSchema` (for `SchemaForm`) →
`SchemaForm.tsx`'s `formElements` import → resolves (per-app path override)
to `components/admin-front/.../JsonSchema/elements/index.jsx` — which
`import`s `CodeEditor` **statically** and assigns it directly into a
top-level `export default { ..., CodeEditor, ... }` object literal, closing
the cycle back onto the original module while it's still mid-evaluation.
That file already carried `/* eslint-disable import/no-cycle */` at its
top — the original authors knew this file cycles, but every *other*
element in front-core's own default registry (`components/JsonSchema/elements/index.tsx`)
is `React.lazy`-loaded specifically to keep such cycles asynchronous (and
`SchemaForm.tsx` already renders elements inside a `<Suspense>` boundary to
support that) — this one admin-front-only override just hadn't followed
that pattern for `CodeEditor`.

Fixed two ways:
- `components/Editor/hooks/useOptions.tsx`: changed to import
  `useUserSettings` from its concrete file rather than the
  `components/UserSettings` barrel, avoiding one unnecessary pull-through
  of `UserSettingsDialogView` (harmless regardless, but reduces cycle
  surface for no cost).
- `components/admin-front/src/application/components/JsonSchema/elements/index.jsx`
  (outside `packages/front-core`, not part of this migration's normal
  scope, but the actual closing edge of the cycle): changed `CodeEditor`
  from a static import to `React.lazy(() => import(...))`, matching how
  every other element is already loaded in front-core's own registry.
  Dynamic `import()` is *always* deferred to a separate async chunk, which
  breaks this specific cycle unconditionally rather than depending on
  fragile module-evaluation ordering.

Confirmed the fix by re-fetching the transformed module from the live dev
server and verifying `CodeEditor` now compiles to a `React.lazy(...)` call
against a dynamic `import()`, then re-ran the full typecheck/build for
admin-front.

**Second occurrence of the same class of bug**: after the fix above, the
app crashed again — same cycle, different entry point:
`ReferenceError: Cannot access 'formElements' before initialization` at
`JsonSchema/editor/editors/VisualEditor/components/SortableField.tsx:34`.
This file does `const controls = formElements as unknown as ...;` at
**module top level** (outside any function) — unlike every other consumer
of `formElements` in this codebase (`SchemaForm.tsx`, `SchemaPreview.tsx`,
confirmed by grep), which all read it lazily inside a component function
body or render callback. A module-top-level read of a value that's part of
a circular import chain is inherently fragile: it only survives if nothing
upstream in the cycle happens to still be mid-evaluation at that exact
moment, which depends on which route into the cycle fired first — exactly
the kind of thing that "worked" until an unrelated change (making
`CodeEditor` lazy) shifted which path gets taken first. Fixed by moving the
`const controls = ...` line from module scope into the component function
body (computed per render — free, since it's just a type cast with no
computation), matching the safe pattern already used everywhere else.
Grepped the whole repo (both apps + front-core) for any other
module-top-level `= formElements` assignment; this was the only one.

## Lesson for verifying this migration's own conversions

`npm run build` (Rollup) tolerates circular ES module imports that
`vite dev`'s native-ESM serving does not, because Rollup's bundler
statically re-orders and hoists module output, while native ESM in the
browser evaluates the dependency graph exactly as connected — this whole
class of bug produced zero signal across every check in the 5-step
verification loop (typecheck/lint/test/build) used throughout this
migration, and only surfaced when the user actually loaded the app in a
browser against the dev server. Neither symptom is something `tsc`,
`eslint`, `vitest`, or `vite build` will ever catch. When a batch touches a
file that's part of a pre-existing circular-looking import chain (a
directory whose barrel re-exports something that's also imported by one of
its own dependents), the extra step worth taking is a grep for
module-top-level (not inside a function/component body) reads of the
would-be-circular import — that's the one pattern that turns a normally-safe
JS circular import into a real crash.

## Sixty-seventh batch: `components/CodeEditDialog/*` (21 files)

- **Ace-editor-to-Monaco migration leftovers, silently inert rather than
  crashing**: several files still reference Ace-specific APIs from before
  the editor was swapped to Monaco. `useJson5Validator.ts`'s
  `editorInstance?.editor?.getSession()` always returns `undefined` against
  a real Monaco instance, so it silently never validates. `helpers/highlightCyrillic.ts`
  and `helpers/highlightReadonlyFields.ts` operate entirely on Ace's
  `session.doc`/marker APIs and are dead code — confirmed via repo-wide
  grep, zero importers. `useSelectionMonacoEditor.ts`'s `onFunctionChange`
  path still reads `aceRef.editor.renderer.scrollTop`, a no-op against
  Monaco. None of these were "fixed" — preserved exactly with a comment
  documenting why each is inert.
- **Second live `monaco` bare-reference bug, same class as the
  `DragProvider.tsx` one documented in batch 66**: `useSelectionMonacoEditor.ts`'s
  `onFunctionChange` calls `new monaco.Range(...)` with no import, global
  declaration, or bundler `ProvidePlugin` anywhere. Reachable whenever a
  user edits a detected inline function via `FunctionEditor` and saves.
  Preserved via the same `declare const monaco: Monaco;` pattern (typed
  through `@monaco-editor/react`'s own `Monaco` export) rather than wiring
  up a real import — flagging again since it's genuinely live, not just
  preserved for type-compat.
- **Self-caught circular-import near-miss**: while converting
  `FunctionEditor.tsx` and `CodeEditDialog/CodeEditor.tsx`, initially wrote
  module-top-level `const Editor = EditorRaw as unknown as ...;` casts in
  both (mirroring a pattern used safely many times elsewhere this session
  for non-circular libraries), then caught mid-session that both files sit
  directly on the `components/Editor` → `components/UserSettings` →
  `components/JsonSchema` cycle documented in batch 66's post-batch fixes,
  and moved both casts inside their component function bodies before
  staging. Followed up with a proactive repo-wide grep for the same risky
  pattern across all `Editor`/`UserSettings`-adjacent files, which caught
  one more instance: `components/Editor/hooks/useControlDictionaryProvider.tsx`
  was still importing `useUserSettings` from the `components/UserSettings`
  barrel rather than its concrete file — changed to match the
  `useOptions.tsx` fix from batch 66. Re-verified after landing the whole
  batch by fetching `CodeEditDialog/CodeEditor.tsx` and `FunctionEditor.tsx`'s
  transformed source directly from the live Vite dev server
  (`curl http://localhost:5173/@fs/...`) and confirming both `const Editor
  = EditorRaw` assignments compile to lines inside their component
  functions, well after the import statements — not at module scope.
- **`react-dnd@11.1.3`'s shipped types don't hold up under this app's
  TypeScript/`@types/react` versions** (the rest of the codebase has since
  moved to `@dnd-kit/core` for drag-and-drop; this directory's
  `VisualEditor` subtree is the last consumer of the old library). Its
  `useDrop`/`useDrag` generic signatures
  (`<DragObject extends DragObjectWithType, DropResult, CollectedProps>`)
  can't be inferred from this code's spec objects (`hover`/`drop`'s item
  shape doesn't carry the library's required `type` field), collapsing
  `CollectedProps` to `unknown` and rejecting the `hover`/`drop` callbacks
  outright. Fixed with the established loose-cast pattern for
  version-mismatched npm packages: cast the spec object `as never` (with
  callback parameters given explicit `DropTargetMonitor`/`DragSourceMonitor`
  annotations, since casting away the spec's own type also removes the
  contextual typing those parameters would otherwise get) and cast the
  returned tuple to the shape the code actually destructures. Applied in
  `DraggableElement.tsx`, `GroupedElementList.tsx`, and `SchemaItem.tsx`.
  Same root cause for `react-dnd`'s `DndProvider`: its `React.FC` return
  type doesn't carry `children` under this app's `@types/react`, fixed
  with one loose cast in `JsonSchemaProvider.tsx`. Also hit the
  already-established MUI-removed-`classKey` pattern once more
  (`Button`'s `classes={{ root, label }}` — v5 dropped `label`) in
  `DraggableElement.tsx`.
- **Found but not fixed — real, pre-existing, cross-app dependency-version
  bug, currently latent**: `components/muiIcons.ts` (converted in an
  earlier "singles" batch this session) unconditionally imports
  `@mui/icons-material/EditCalendar`. admin-front's pinned version
  (5.14.1) has that icon; cabinet-front's pinned version (5.10.14, exact,
  no range) does not — confirmed the file genuinely doesn't exist in
  cabinet-front's installed package (`node -e "require.resolve(...)"`
  fails there). This predates the TS migration (same import existed in the
  original `.js`) and was invisible until `tsc` started checking this file
  for real. It's reachable in the live app: `muiIcons` is also used by
  `JsonSchema/editor/components/IconList.tsx` and admin-front's
  `IconSelect.jsx`, not just this batch's (mostly dead) `VisualEditor`
  subtree. Ran `vite build` for cabinet-front to check the actual blast
  radius: it succeeds cleanly and the built output contains no reference
  to `EditCalendar` at all, meaning nothing in cabinet-front's real bundled
  entry graph currently reaches `IconList.tsx` — `tsc`'s `include` pattern
  type-checks all of `packages/front-core` unconditionally regardless of
  per-app reachability, which is why this only shows up in typecheck and
  not in the build. Since it's genuinely unreachable today but would break
  cabinet-front's build the moment something changes that, added a
  cabinet-front-**only** ambient shim
  (`components/cabinet-front/src/types/muiIconsShim.d.ts`, inside that
  app's own `src/`, not shared `packages/front-core/types/`, so it can't
  collide with admin-front's real type declarations for the same module)
  to satisfy the type checker without touching runtime resolution in
  either app. The underlying version mismatch is a real bug independent of
  this migration and should be fixed separately (e.g. upgrading
  cabinet-front's `@mui/icons-material`).
- Other dead code confirmed via repo-wide grep, converted as-is with no
  behavior changes: `editors/HTMLEditor.tsx` (zero importers besides
  itself) and `editors/VisualEditor/components/ElementList/components/CollapseButton.tsx`
  (a different, actively-used `CollapseButton` of the same name lives at
  `components/JsonSchema/editor/components/CollapseButton.tsx`).
- `types/sort-array.d.ts` (existing ambient declaration from an earlier
  batch) only typed `by?: string[]`/`order?: unknown[]`, but
  `GroupedElementList.tsx`'s real usage passes plain strings
  (`by: 'sortIndex', order: 'asc'`). Widened to `string | string[]` /
  `string | unknown[]` at the shared ambient type rather than casting at
  each call site, since a second real consumer (the pre-existing
  `JsonSchema/editor` one) now needs the same shape.
- Preserved without "fixing": `JsonSchemaProvider.tsx`'s
  `value = {} as unknown as string` default prop (the original mismatched
  `{}` default, not the `''` the JSON-string usage elsewhere would imply);
  `VisualEditor/index.tsx`'s `getElementType(null, editPath)` call, which
  would throw if `editPath` is ever non-empty (the function only guards
  the empty-path case); `DraggableElement.tsx`'s drag item objects, which
  have always been missing the `index` field that `hover`'s reorder logic
  reads and mutates (present in the original `.jsx` too — a real,
  pre-existing, silently-broken reorder edge case, not introduced here).

## Sixty-eighth batch: `components/FileDataTable/*` (18 files)

- **Same cross-app `theme` dynamic-resolution pattern as `formElements`**
  (see batch 66/67): the bare `'theme'` specifier resolves per-app via the
  generic `"*"` path fallback to each app's own local theme module
  (`admin-front/src/application/theme.js`,
  `cabinet-front/src/superstructure/theme.js`). Five files here read a
  custom `theme?.fileDataTableTypePremium` flag. **Correction, discovered
  while converting `theme.js`/`App.jsx` in a later batch**: the claim
  originally written here — that neither real app's theme declares this
  flag — was only half right. `admin-front/src/application/theme.js` is a
  genuinely separate object that really does lack it (`fileDataTableTypePremium`
  is `undefined` there, as stated). But `cabinet-front/src/superstructure/theme.js`
  is not a separate object at all — it's a one-line re-export,
  `export { default } from 'core/theme';`, i.e. `packages/front-core/theme.ts`
  itself — which **does** declare `fileDataTableTypePremium: true`. So this
  flag (and every other custom key on `packages/front-core/theme.ts`) is
  real and `true` in cabinet-front's actual runtime, `undefined` in
  admin-front's — a genuine behavioral difference between the two apps
  (e.g. cabinet-front's `FileDataTable` really does render through the
  `DataGridPremium` branch and the "premium" icon set; admin-front's
  doesn't), not the "always undefined in both" situation described below.
  The `themeRaw as unknown as { fileDataTableTypePremium?: boolean }` casts
  used throughout this batch and the CodeEditDialog one are still
  type-accurate for both apps regardless (the flag genuinely is optional,
  just not "always absent") — no code changes were needed once this was
  caught, only this correction.
- `fileTableSettings.tsx`'s parameter object is called from
  `FileDataTable/index.tsx`'s `getSettings` with the exact same
  `{ t, fileStorage, ... }` shape used for the `dataTableSettings` branch,
  but the original `fileTableSettings.jsx` never destructured
  `fileStorage` — a harmless always-ignored extra field passed at every
  call site. Added `fileStorage?: ...` to its param interface (unused in
  the body, matching the original) rather than stripping the field at the
  call site, since removing it would touch `FileDataTable/index.tsx`'s
  shared `getSettings` for no behavioral gain.
- `print-js` and `jszip` both ship real, usable `.d.ts` files already
  (`print-js`'s `Configuration.printable`/`properties` are `any`-typed,
  permissive enough that no cast was needed at any `printJS(...)` call
  site in this batch, including the ones in `SignatureDetails.tsx` and
  `DownloadAllButton.tsx`) — no ambient declarations needed for either.
- Preserved without "fixing": `SignatureDetails.tsx`'s asymmetry between
  its two print paths — the multi-signature branch does
  `serial.toUpperCase()` (throws if `serial` is ever falsy), while the
  single-signature branch guards with `(serial || '').toUpperCase()`;
  kept both exactly as-is via a cast on the ungueded one rather than
  "fixing" the inconsistency.

## Sixty-ninth batch: `components/DataTable/*` (26 files)

- **Real, pre-existing, silently-broken debounce in `DataTablePagination.tsx`**:
  the page-number `TextField`'s `onChange` does
  `let [timeout] = React.useState(null); ... clearTimeout(timeout); timeout = setTimeout(...)`
  — only the state *value* is destructured, never its setter, and `timeout`
  is reassigned as a plain local variable rather than through React's
  setter. Since the component function re-runs on every render, this local
  binding resets to `null` each time, so `clearTimeout(timeout)` on a fresh
  keystroke is almost always clearing nothing, and superseded timeouts pile
  up uncancelled rather than being debounced. Preserved exactly (not
  switched to a real `useRef`/`useState`-with-setter pair, which would
  change actual behavior) and flagged with a comment at the call site.
- **Real, pre-existing dead style found while converting `SelectFilterHandler.tsx`**:
  `darkThemeSelect: { color: navigator.fillIcon, ... }` reads a `fillIcon`
  property off the browser's global `navigator` object, which has no such
  property — always `undefined`, a dead CSS declaration. Preserved via a
  cast with a comment rather than corrected to whatever theme property was
  likely intended.
- **Real, pre-existing broken filter-membership check in `MultiSelectFilterHandler.tsx`**:
  `selectedValues` is always a `string[]` (stringified ids), but the
  options filter does `!selectedValues.find((item) => item.id == opt.id)`
  — treating each string as if it had an `.id` property. Since strings
  don't, `item.id` is always `undefined`, so this `.find()` never matches
  and the filter clause is permanently a no-op. Preserved with a cast
  rather than fixed to `!selectedValues.includes(opt.id.toString())` (the
  evidently-intended check, used correctly two lines below in the same
  file).
- **Version-mismatch quirks, same class as prior batches' `react-dnd`/`DndProvider`
  findings, all fixed with the established loose-cast pattern**:
  - `@mui/x-date-pickers@5`'s `DesktopDatePicker` doesn't support this
    code's v4-era API (`open`/`onClose` combined with `renderInput`,
    `disableToolbar`, `disableMaskedInput`, `disableHighlightToday`,
    string `variant`) — same mismatch already documented for
    `components/KeyboardDatePicker/index.tsx`; cast to a loose component
    type and typed `renderInput`'s `params` as `any` with the same
    established eslint-disable, matching that precedent exactly.
  - `@mui/material`'s bare `Popper` resolves (under this app's installed
    `@types/react`) to a `Pick<PopperProps, ...>` that treats several
    normally-optional HTML attributes as required — a real type-level
    quirk, not a real prop requirement; cast to a loose component type in
    `SearchInput/FilterHandlers.tsx` rather than fighting it.
  - `InputBase`'s real type has no `variant` prop at all (that's only on
    `TextField`/`FilledInput`/`OutlinedInput`); `SearchInput/InputComponent.tsx`
    passes one anyway — a pre-existing prop that's always been silently
    dropped, not introduced here. Spread it in via a loosely-typed object
    rather than adding a prop MUI doesn't actually accept.
  - `FilterHandlers.tsx`'s `Popper` `modifiers` prop is still in MUI v4's
    keyed-object shape (`{ flip: { enabled }, preventOverflow: {...} }`),
    which the installed v5 Popper (Popper.js v2's array-of-modifiers API)
    doesn't understand — already a silent no-op in production. Preserved
    exactly rather than "upgraded" to the v5 array shape, which would
    actually change behavior (flip/preventOverflow would start doing
    something for the first time).
  - `DataTableFilterPresetBar.tsx` passes MUI v4's `Chip` `variant="default"`,
    a value the real v5 `Chip` type no longer accepts (`'filled' | 'outlined'`
    only) — preserved via cast rather than changed to `'filled'`, since
    that would alter the rendered CSS classes from what ships today.
- The `FilterHandler` base class (a plain `React.Component` subclassed by
  eight sibling filter-handler components, each overriding
  `renderIcon`/`renderChip`/`renderHandler`/lifecycle methods and adding
  its own `state` shape) is typed with one shared, deliberately loose
  `FilterHandlerProps` interface carrying every field any subclass reads,
  plus an index signature — subclasses read `this.props` directly against
  that shared shape rather than each declaring a narrower generic
  parameterization, and cast `this.state` to their own local state
  interface at each read site (never at the assignment site, where a
  fresh object literal already satisfies the base class's index-signature
  state type without a cast).
- Dead code: `DataTable/index.tsx`'s `handleClick` method is defined but
  never invoked anywhere in the class (`renderBody` calls
  `onRowClick.bind(this, row, key)` directly instead) — kept as-is with a
  comment.

### Post-batch fix: another module-top-level circular-import crash

After this batch landed, the app crashed in the browser with
`ReferenceError: Cannot access 'DataTableRaw' before initialization` at
`DataTableStated.tsx:6`, reported by the user — the same bug class
documented in the CodeEditDialog batch (66/67), but a **new, local cycle**
this time, and one the batch's own safety grep didn't catch because that
grep only checked for the `Editor`/`UserSettings`/`JsonSchema` cycle
specifically:

`components/DataTable/index.tsx` re-exports `DataTableStated` from its own
sibling file (`export { default as DataTableStated } from './DataTableStated';`),
while `DataTableStated.tsx` imports the default export back from
`components/DataTable` (i.e. `index.tsx`) — a two-file cycle entirely
internal to this directory. This cycle existed in the original untyped
`.jsx` too, but never crashed, because the original files only ever
referenced `DataTable` inside their render/component functions — the
conversion's `const DataTable = DataTableRaw as unknown as ...;` cast,
written at module top level (mirroring the pattern used safely for every
*non-circular* import in this same batch), is what turned it into a
real TDZ crash.

Fixed by moving that cast inside `DataTableStated`'s component function
body. Then proactively grepped the whole repo for every other
`from 'components/DataTable'` import and checked each for the same
pattern, since the barrel is now provably self-referential: found and
fixed two more, both **pre-existing files from an earlier/concurrent
migration pass, not part of this batch** — `JsonSchema/elements/UserList/UserTable.tsx`
and `JsonSchema/elements/UserSelect/index.tsx` — each had the identical
`const DataTableStated = DataTableStatedUntyped as unknown as ...;` at
module scope, latent until this batch made `components/DataTable` a
confirmed cycle. Also fixed `components/DataTable/components/UserIdsFilterHandler.tsx`
itself (a class component; the cast moved into `renderHandler()` instead
of a function body, since methods run at call time the same way). All
four fixes verified against the live Vite dev server's transformed output
(`curl http://localhost:5173/@fs/...`) to confirm each cast now compiles
to a line inside its function, not at module scope. All other top-level
casts introduced in this batch were re-audited and confirmed to be
one-directional (a parent casting a child it imports, never a dependency
that imports back) — safe.

## Found while auditing remaining work: a stale `.js` silently shadowed its own `.ts` conversion

`components/muiIcons.ts` (converted in an earlier "singles" batch) was
never `git rm`'d from its original `.js` — both files existed side by
side. Both apps' Vite configs resolve bare-ish specifiers with
`extensions = ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']` — **`.js` is
checked before `.ts`** — so the running app had been serving the old
untyped `muiIcons.js` this entire time, while `tsc` (which prefers
`.ts`/`.tsx` over `.js` in its own resolution) type-checked the new
`.ts` file. Diffed the two: purely additive typing, zero behavioral
differences, so no runtime regression — but this is a real risk for the
migration's own process generally, not just this file: **whenever a batch's
`git rm` of the old file is skipped or delayed, the dev server and
production build keep silently serving the untyped original**, and
neither `tsc` nor `eslint` nor `vitest` would ever surface it (only
`vite build`'s output listing, or noticing the file still exists, would).
Removed the stale `muiIcons.js` now. Worth a quick repo-wide sanity sweep
(`find packages/front-core -name "*.jsx" -o -name "*.js"` cross-checked
against sibling `.tsx`/`.ts` files of the same basename) the next time a
batch's completion is in doubt.

## Seventieth batch: remaining `packages/front-core` singles — `App.jsx`, `theme.js`, `MaterialSymbolIcon.jsx`, `PKCS7SignerExample.jsx`

- **`App.jsx`/`theme.js` are genuinely live code, not dead weight** —
  confirmed by tracing `src/index.js` in both apps: admin-front has its
  own `src/application/App.jsx` which shadows this file entirely via the
  "*" path fallback order, but **cabinet-front has no local `App.jsx` at
  all**, so its `await import('App')` resolves straight through to
  `packages/front-core/App.tsx`. This is cabinet-front's actual app
  bootstrap: theme setup, Redux `Provider`, i18n, dayjs locale wiring, the
  `AppRouter`/`WebChat` lazy boundary. Converted preserving every import
  and prop exactly; `createMuiTheme(theme as never)` is the one place
  `theme.ts`'s deliberately-unannotated shape meets a strictly-typed
  function boundary (see below).
- **Found and fixed while converting `theme.ts`: an allowJs re-export
  degrades a mapped type to `{}`.** Initially typed `theme.ts`'s default
  export as `Record<string, unknown>` (this is a ~700-line legacy
  MUI-v4-shaped object — see `helpers/createMuiTheme.ts`'s own
  `LegacyThemeOptions` type, already built to tolerate exactly this shape
  — so a full field-by-field `ThemeOptions` typing looked like pure
  literal-widening busywork for a type nothing but one cast site actually
  needs). That broke cabinet-front's typecheck: `JsonSchema/elements/SpreadsheetLite/DataSheetGridHeaded.tsx`
  and `.../CustomAddRowsComponent.tsx` both do `theme?.typography?.fontFamily`
  against the bare `'theme'` import, which for cabinet-front resolves to
  `src/superstructure/theme.js` — itself just `export { default } from
  'core/theme';`, i.e. this exact file. Once `theme.ts` had an explicit
  `Record<string, unknown>` annotation, that mapped type crossing back
  through the plain-JS re-export (`allowJs`, `checkJs: false`) collapsed
  to `{}` for consumers, breaking every `theme?.knownKey` read throughout
  the app. Fixed by removing the annotation entirely and letting
  TypeScript infer the real literal object shape (exactly what happened
  when this file was untyped `.js`) — the one place that needs a stricter
  type (`createMuiTheme`'s `LegacyThemeOptions` parameter) already casts
  with `as never` at its own call site, so the wide inferred shape costs
  nothing there.
- **Correction to a batch-68 (`FileDataTable`) claim, discovered by the
  above**: that entry said neither app's real theme declares
  `fileDataTableTypePremium`. That's true for admin-front (a genuinely
  separate theme object) but **wrong for cabinet-front** — since its
  `theme.js` is a re-export of this exact file, cabinet-front's real
  `theme.fileDataTableTypePremium` is `true`. Corrected in place rather
  than left standing; no code changes were needed since the existing
  `as unknown as { fileDataTableTypePremium?: boolean }` casts from that
  batch are accurate either way, but the behavioral claim (which app
  actually renders the "premium" DataGrid/icon branches) was backwards.
- `PKCS7SignerExample.jsx` was a completely empty file (0 bytes) with zero
  importers anywhere in the repo (confirmed via repo-wide grep) — removed
  outright via `git rm` rather than converting an empty file to `.ts`.
- `MaterialSymbolIcon.jsx`: straightforward, typed `name`/`sx` props via
  `React.HTMLAttributes<HTMLSpanElement>`, no quirks.

## Seventy-first batch: `components/admin-front/src/application/modules/*` — first 10 modules (26 files)

First batch of the app-level page/feature layer (`application/modules/*`, ~300 files in admin-front, ~175 in cabinet-front, not touched before this session): `profile`, `debugLogs`, `healthCheck`, `mocks`, `multiLang`, `settings`, `favorites`, `home`, `metrics`, `processes`.

- **New pattern in this territory**: each module's top-level `index.jsx` is a route/navigation config object (`{ routes: [{ path, component, title, access }], navigation: [...] }`), not a component — consumed by the already-typed `components/AppRouter/index.tsx`, which types the consumer side deliberately loosely (`interface RouteModule { routes?: RouteDef[]; [key: string]: unknown; }`). Matched that looseness on the producing side rather than inventing a strict shared route-config interface. Some modules export the object directly (`debugLogs`, `healthCheck`, `favorites`, `home`, `settings`, `processes`), others export a factory function gated behind a config flag (`mocks`'s `getEnableMockModules()` returns `{}` unless `config.enabledMocksPage`; `metrics`'s `getMetricsModule()` always returns the same object, no gating despite the factory shape).
- **Real, pre-existing crash bug found in `mocks/pages/MockList/index.tsx`**: one `useMemo`'s dependency array listed `errors` — a variable never declared anywhere in the component (confirmed via `git show` on the original: that's the only occurrence of the identifier in the whole file). Referencing an undeclared identifier in a dependency-array literal throws `ReferenceError: errors is not defined` at render time, so this page has apparently never been able to render — TypeScript can't compile a reference to an undeclared name, so this HAD to be removed to convert the file (unlike the usual preserve-via-cast approach). This page is only reachable when `config.enabledMocksPage` is on, which likely explains why nobody hit it. Flagging explicitly since it's a real, live crash for any environment with that flag enabled, not a preserved-but-inert quirk.
- **Established the `dispatch(thunk() as never)` pattern for direct `useDispatch()` + thunk-action-creator usage** (as opposed to `bindActionCreators`, already covered by prior batches): this codebase's Redux store is built with plain `redux`'s `createStore` + `applyMiddleware(thunk)`, so `dispatch`'s real runtime behavior unwraps thunks and returns their result, but `dispatch`'s TypeScript type (base `Dispatch<AnyAction>`, no thunk augmentation) doesn't know that — `dispatch(someThunk)` doesn't type-check at all without a cast, and even with `dispatch(x() as never)`, the call's return type resolves to `never`, which breaks any later `instanceof`/property access on the awaited result (TS2358: "left-hand side of instanceof must be any/object/type parameter" — `never` doesn't qualify). Fixed throughout `multiLang/pages/TranslationsPage/index.tsx` (its heaviest user) by adding an explicit outer type annotation on the awaited result (`const result: unknown = await dispatch(x() as never)`, or `(await dispatch(...)) as SomeRealType`) at every call site whose result is later used — matches the precedent already set in `JsonSchema/elements/ExternalReaderRegisterFilePreview/index.tsx` from an earlier batch.
- **Same `DatePicker` v4-vs-v5 API mismatch already documented for `components/KeyboardDatePicker/index.tsx`**, hit again in `metrics/pages/ProcessesMetrics/index.tsx` (`open`/`onClose` combined with `renderInput`, string `value`) — cast to a loose component type rather than migrating to the real v5 API, matching that precedent exactly.
- `md5` (used in `profile/components/ProfileAppbar.tsx` for a Gravatar hash) ships no types and is an admin-front-only dependency (not in cabinet-front's `package.json`) — added an ambient declaration scoped to `components/admin-front/src/types/md5.d.ts` (app-local, not the shared `packages/front-core/types/`) rather than a repo-wide one for a package only one app actually has installed.
- **Confirmed circular-import safety**: `favorites/pages/FavoritesList.tsx` imports `DataTableStated` from the `components/DataTable` barrel — the confirmed self-referential cycle from the DataTable batch. Deferred the cast inside the component function body from the start (not a post-hoc fix this time). `multiLang/pages/TranslationsPage/index.tsx` imports the barrel's plain default `DataTable` export instead, which is not itself part of that two-file cycle (only `DataTableStated` re-exports back into it) — left as a module-top-level cast, matching the already-established-safe precedent in `FileDataTable/index.tsx`.
- `checkAccess`'s own `Unit` interface (from an earlier batch) declares `id: number` as required; `home/pages/Home/index.tsx`'s local `Unit` type (built from `userUnits` state, where `id` isn't always guaranteed present in every calling context) only had it optional — cast at the `checkAccess(...)` call site rather than either loosening the shared helper's real type or unsafely widening the local one.

## Seventy-second batch: `components/admin-front/src/application/modules/*` — `elastic`, `kibana`, `ui` (18 files)

Second batch of the app-level page/feature layer.

- **Real, pre-existing dead/broken file removed outright**: `elastic/pages/ElasticSettings.jsx` had no `export default` at all — it called `asModulePage(ElasticSettings)` where `ElasticSettings` is never defined anywhere in the file (only imported dependencies and a stray comment: `// Removed the export of ElasticSettings as it is no longer used.`). Confirmed via repo-wide grep that nothing imports this file. TypeScript can't compile a reference to an undeclared identifier, so — same as the empty `PKCS7SignerExample.jsx` precedent from an earlier front-core batch — removed via `git rm` rather than converting a file with no working export. `elastic/components/ReindexRequestStatus.tsx` was that dead file's only consumer; it's now itself orphaned (converted anyway, since it's a structurally valid, self-contained component — just unreachable).
- **Confirmed another dead file**: `kibana/component/Navigation/index.tsx` (`KibanaNavigation`) has zero importers anywhere in the repo (confirmed via grep) — its own module's route config (`kibana/index.tsx`) returns `navigation: []`, empty, so this sidebar-entry component was never wired in. Converted preserving its (also-unused) `access` defaultProp for fidelity via a static post-definition assignment rather than dropping it, since nothing rules out some other dynamic-lookup convention reading it that a static grep wouldn't catch.
- **Preserved, not "fixed": an `alt` prop silently dropped by a real MUI icon component.** `KibanaNavigation`'s `<ExpandMoreIcon alt={t('KibanaReports')} />` — `SvgIcon`-based icons have no `alt` prop in this MUI version; it's always been a no-op. Cast via a loose prop spread rather than swapping to a real `aria-label`, which would be a behavior change (an actually-rendered attribute vs. nothing), not a type fix.
- Same `DatePicker`/`AccordionSummary` classes-key MUI v4-vs-v5 mismatches already documented in prior batches (`KeyboardDatePicker`, `DataTable`'s `classes={{root,label}}` precedent) — hit again in `elastic/pages/Monitoring.tsx` (`DatePicker`'s `renderInput`/`disableHighlightToday`) and `kibana/component/Navigation/index.tsx` (`AccordionSummary`'s `classes.expandIcon`, a key the real v5 `AccordionSummaryClasses` type no longer has). Same loose-cast treatment both times.
- **Cross-file local-interface mismatches from independently-typed sibling files**: `ReportActions`, `EditTemplateItem`, and `KibanaReportList`'s own page component each declared their own local `ReportItem` interface with slightly different required fields (`id` here, `data` there). Passing a callback typed against one file's `ReportItem` into a prop expecting another file's differently-shaped `ReportItem` of the same name fails contravariantly even though both are "the same kind of object" conceptually. Cast at each `handleChangeReport`/`handleDeleteReport` prop-passing site rather than hoisting one shared interface across three unrelated files for two callback props.
- Same store-level `Dispatch<AnyAction>` vs. `services/api`'s own local `Dispatch = (action: unknown) => unknown` type mismatch already established in the prior batch's thunk-dispatch notes — hit again in `ui/pages/FilterList/index.tsx`'s `mapDispatch`, where `dispatch` (typed via real redux `Dispatch`) is passed straight into `api.post`/`api.put`/`api.del`. Cast `dispatch as never` at each of the three call sites.
- No circular-import risk in this batch: the only `components/JsonSchema` imports here (`SchemaFormModal`, `SchemaForm`, `handleChangeAdapter`, `validateData`) are one-directional — nothing in `JsonSchema`'s own subtree imports back from `application/modules/*`, so these aren't part of any cycle despite `JsonSchema` being on the "risky directories" list for the `Editor`/`UserSettings` cycle specifically.

## Seventy-third batch: `components/admin-front/src/application/modules/*` — `processStatistics`, `fileLibrary` (30 files)

Third batch of the app-level page/feature layer.

- `moment`'s `.add()`/`.startOf()` overloads want slightly different unit-string union types (`DurationConstructor` vs. `StartOf`) even though the actual string literals used here (`'day'`/`'month'`/`'year'`) satisfy both — typed the shared `datePeriods` lookup as plain `Record<string, string>` and cast to the specific expected union at each of the two call sites in `WorkflowDynamicsChart.tsx`, rather than fighting a single shared type that would satisfy both overloads at once.
- `query-string`'s `stringify()` wants a `StringifiableRecord` (values narrowed to string/number/boolean/arrays thereof); `helpers/toUnderscore.ts`'s `toUnderscoreObject()` returns a loose `Record<string, unknown>` — cast at the one call site in `WorkflowDynamicsChart.tsx` rather than narrowing that shared helper's real, correctly-loose return type.
- Preserved without "fixing": `StatisticsPage/index.tsx`'s `handleChangeDropdown` resets `filters` (otherwise always used as an object — `{...filters}`, `filters[name]`) to `[]` on every dropdown change — behaviorally identical to `{}` for this file's access/spread patterns, but keeping the literal `[]` (via a cast) rather than silently normalizing it to `{}`.
- `usePeriodOptions.ts`'s default case returns `[{}]` — a single option object missing both `value` and `label` — rather than an empty array or throwing. Typed `PeriodOption`'s fields optional to match, and cast at the two read sites in `UntilThisMomentSelect.tsx` that assume they're present (`option.value`, `option.label`), preserving the original's implicit assumption that this default case is unreachable in practice rather than proving it.
- Two files needed the same harmless "unused prop passed at every call site" pattern already established in the `FileDataTable` batch (`fileTableSettings.tsx`'s `fileStorage`): `WorkflowDynamicsPage`'s `DateSelect.tsx` receives a `period` prop from `UntilThisMomentSelect.tsx` that its original `.jsx` never destructured — added as an optional, documented-as-unused field rather than removed at the call site.
- Same `DatePicker` v4-vs-v5 API mismatch already documented for `components/KeyboardDatePicker/index.tsx`, hit twice more in this batch (`WorkflowDynamicsPage/components/DateSelect.tsx`, `StatisticsPage/index.tsx`) — same loose-cast treatment both times.
- No circular-import risk: neither directory imports `components/Editor`, `components/UserSettings`, `components/CodeEditDialog`, `components/DataTable`'s `DataTableStated`, or `components/JsonSchema` in a way that closes a cycle — `StatisticsPage/index.tsx`'s `StringElement` import from `components/JsonSchema/elements/StringElement` and `fileLibrary`'s `components/DataTable` (plain default export, not `DataTableStated`) are both used the same way as already-confirmed-safe precedents from prior batches.

## Seventy-fourth batch: `components/admin-front/src/application/modules/*` — `customInterfaces`, `reports` (40 files)

- **Real, pre-existing bug found in three separate files**: `RenameReportDialog.tsx` (both the `ReportList` and `ReportTemplates` copies) and `AccessReportDialog.tsx` all compute their JSON-schema object via `React.useCallback(schemaObjectLiteral, [t])` — passing a plain object where `useCallback` expects a function. This "works" only because `useCallback(fn, deps)` never calls `fn`; it just memoizes and returns whatever was passed, so the object survives unchanged. Should have been `useMemo`. TypeScript's real `useCallback<T extends Function>` signature rejects a non-function argument outright, so preserving this needed an explicit double-cast (`(obj as unknown) as () => void`, then the `useCallback` result cast back to `Record<string, unknown>`) rather than the one-line fix of swapping to `useMemo`.
- **Real, pre-existing typo, found twice**: `ReportTemplates/index.tsx`'s inline `getDataUrl` and `ReportDraftSelect/helpers/getDataUrl.ts` both pass `qs.stringify(..., { arrayFormat: 'index' })` — `qs`'s real `ArrayFormat` type only accepts `'indices' | 'brackets' | 'repeat' | 'comma'`; `'index'` isn't one of them, so `qs` silently falls back to its default array-serialization behavior at runtime. Preserved via `as never` rather than corrected to `'indices'` (a real, if likely originally-unintended, behavior).
- **Dead code, confirmed via repo-wide grep, converted anyway for consistency**: `ReportTemplates/components/EditReportDialog.tsx` has zero importers anywhere in the app (it's commented out, imports removed, in `ReportTemplates/index.tsx`) but was still fully converted rather than dropped, since — unlike the empty/no-export-at-all files removed in earlier batches — this one is complete, working code that could be wired back up.
- New ambient declaration: `types/react-virtualized-grid.d.ts` for `react-virtualized/dist/commonjs/Grid` (a sibling of the already-declared `AutoSizer` submodule), scoped to `CabinetMenu/components/IconSelect.tsx`'s usage (a virtualized icon-picker grid).
- `CabinetMenuDialog.tsx` and friends read/write a translations record keyed by `getCurrentLanguageCode()`, whose real return type is `string | null` (confirmed against `helpers/localization.ts`) — every function taking that value as a parameter was typed `string | null` to match, rather than casting away the `null` at each call site.
- Cross-file local-interface mismatches recurred here too (`ReportTemplates/components/ReportActions/index.tsx` passing its own `handleChangeReport` — typed against a local `ReportLike` — into `EditTemplateItem`/`AccessTemplateItem`, each with their own slightly different local `ReportLike`): cast at the passing site, same as prior batches' precedent, rather than unifying the interfaces.
- `propertiesEach`'s real callback type (`PropertiesEachCallback`, expecting a `JsonSchemaNode` first argument) doesn't structurally match the looser inline callback shape (`{ description?: string }`) used at both of this batch's two call sites (`ReportFilters.tsx`, `ReportList/index.tsx`) — cast the callback itself rather than typing it against the full `JsonSchemaNode` shape for a one-off inline usage.

## Seventy-fifth batch: `components/admin-front/src/application/modules/*` — `registry` (32 files)

- **Dead code found and handled per established precedent, three separate ways**:
  - `RegistryList/components/RegisterActions/ExportRegisters/old.jsx` (the whole `ExportRegisters/` subtree, actually — `index.jsx`, `ExportRegistryDialog.jsx`, `RegisterKeyTable.jsx`, and `old.jsx` itself) has zero importers anywhere: `RegisterActions/index.jsx`, the only file that ever referenced it, has the import and JSX usage both commented out (`// import ExportRegisters from './ExportRegisters';` / `{/* <ExportRegisters {...menuItemProps} /> */}`). `old.jsx` is a class-component predecessor of the current functional `index.jsx`+`ExportRegistryDialog.jsx` pair (confirmed by reading both — same props, same `t('ExportRegister')` menu item, same dialog flow, clearly superseded). Converted the whole subtree anyway, since it's complete working code, not empty or broken.
  - `RegistryList/components/RegistryKeys.jsx` also has zero importers (the only text match for "RegistryKeys" anywhere else in the repo turned out to be an unrelated method name, `getRegistryKeys`, in a different file) — converted anyway for the same reason.
- **Real, pre-existing type-level quirk exploited by the original JS, found while typing `KeyFormModal.tsx`**: `applyDefaults`/`setDefaultData` read and write `result.toString`/`value.toString` as plain data keys (`result.toString = schemaResult.properties.toString.defaultSchema`) — using `toString` as an ordinary property name, not calling the method. TypeScript resolves a literal `.toString` property access to the real `Object.prototype.toString: () => string` instead of an object's index signature, regardless of the index signature's own declared value type, so `schemaResult.properties.toString.defaultSchema` doesn't compile as written. Added a small `getSchemaProperty(properties, key: string)` helper — a *non-literal* string key forces TypeScript to use the index signature instead of the special-cased inherited member — rather than renaming the schema's real `toString` field, which is genuine, load-bearing data (the key `SchemaForm` itself reads to build the `toString` control).
- `checkAccess`'s real signature (`(required, userInfo: UserInfo = {}, userUnits: Unit[] = []): unknown`, already typed in front-core) types `Unit.id` as `number`, not `string` — `KeyListPage`'s and `RegistryListPage`'s own `userUnits` props were typed to match (`{ id: number }[]`), which also fixed a downstream `exportEnabledUnits.some(...)` comparison that would otherwise compare `number` against a locally-mistyped `string`. `checkAccess`'s `unknown` return was cast to `boolean` at each of its two call sites, both because it's used directly as a JSX-conditional (`{isEditable && (...)}`, which needs a real boolean/falsy value, not `unknown`, to satisfy `ReactNode`) and because `!isEditable` needs a boolean.
- Same `useDispatch()` + thunk-call pattern noted in prior batches (`dispatch(thunk() as never)` collapses the awaited result to `never`, breaking any later `instanceof`/property check) — fixed throughout `KeyList/index.tsx` by keeping the `as never` cast on the *call* but adding an explicit type annotation on the awaited result (`(await dispatch(...)) as SomeType | Error`) rather than casting the whole expression.
- Cross-file "extra prop passed but never destructured" pattern recurred again: `KeyFormModal.tsx`'s `customControls.KeySelect` wiring passes `registerId` into `<KeySelect>`, which never used it in the original either — added as an optional, documented-unused field rather than dropped. Separately, `KeySelectProps.path` (always injected by `SchemaForm` at runtime) had to be widened from required to optional, since the `customControls` callback's own `props` parameter is necessarily typed as a loose `Record<string, unknown>` and TypeScript can't prove it contains a `path` field just from being spread.
- Same MUI v4/v5 mismatch class as prior batches: `FormGroup`'s real v5 type has no `error` prop (that moved to `FormControl`) — cast at the one call site rather than restructuring the form.

## Seventy-sixth batch: `components/admin-front/src/application/modules/*` — `users` (38 files)

- **Real, live bug found and preserved, not fixed**: `UserActions/Toggle2FA.tsx`
  called an undeclared `handleCloseDialog()` after successfully toggling
  2FA — this component has no dialog to close at all, so it's a genuine
  `ReferenceError` on every successful toggle, always thrown and silently
  swallowed by the surrounding `catch` (which only does `setLoading(false)`).
  Removed the call, since TS can't compile a reference to an undeclared
  identifier — same precedent as the `MockList`/`errors` bug from an
  earlier batch. The 2FA toggle itself still completes correctly; only the
  (already broken) post-success cleanup call is gone.
- **Real, pre-existing copy-paste bug found and preserved**:
  `UserIsAdminMenuItem.defaultProps.actions` was `{ blockUser, unblockUser }`
  — the exact default from a *different* sibling component
  (`UserActiveMenuItem`) — instead of `{ unsetAdmin, setAdmin }`, which is
  what this component actually destructures and calls. If `actions` is
  ever not passed, `handler(id)` would throw (`unsetAdmin`/`setAdmin` both
  `undefined`). Preserved exactly via a same-shaped cast rather than
  correcting the mismatched default.
- **Dead code, converted anyway per established precedent** (complete,
  working code, not empty/broken): `UserAccessJournal/components/OperationType.tsx`
  (zero importers — the only "OperationType" hits elsewhere are a
  `t('OperationType')` translation-key string, not a component reference)
  and the three sibling files `UserList/components/{DeleteUnits,ExportUnits,ImportUnits}.tsx`
  (near-duplicates of `UnitList/components/{DeleteUnits,ExportUnits,ImportUnits}.tsx`,
  confirmed unimported anywhere within `UserList` or elsewhere in the repo).
- **Self-caught mistakes during conversion, fixed before verification** —
  worth naming since this batch's `Unit/index.tsx` in particular was large
  and easy to slip on: (1) initially dropped `UnitList/components/ImportUnits.tsx`'s
  own `withStyles(styles)` wrapper and local `styles` object entirely while
  converting — would have made `classes` always `undefined`, a real crash
  introduced by the conversion itself, not present in the original. Caught
  by re-reading the file against the original before moving on, restored
  both. (2) `Unit/index.tsx`'s `render()` method briefly gained a spurious
  wrapping `<div>` around `<LeftSidebarLayout>` that doesn't exist in the
  original — caught the same way, removed. (3) `UnitList/index.tsx`'s
  error-message construction, `new Message(t(created), 'error')`, passes
  the whole `Error` object (`created`) to `t`, not `created.message` — a
  pre-existing quirk (translate() presumably stringifies whatever it's
  given); initially "fixed" this to `.message` while adding types, caught
  it, reverted to passing the raw object with a cast and a comment.
- `ModulePage`'s own already-typed base class (from an earlier batch)
  declares `componentDidUpdate(): void` — a real React lifecycle method,
  but typed with zero parameters rather than React's actual
  `(prevProps, prevState, snapshot?)` signature. `Unit/index.tsx`'s
  override needs `prevProps` (to compare the route's `unitId` param
  against the current one), which TypeScript rejects as an invalid
  override (a subclass can't *require* more parameters than the base
  declares). Fixed by making the override's parameter optional and
  asserting it's present inside the body (`prevProps as UnitPageProps`) —
  satisfies the override-compatibility check without touching the shared
  base class or its other subclasses.
- Same `handleChangeAdapter(value, handler)` signature mismatch recurred
  throughout `Unit/index.tsx` and `UserUnitsMenuItem.tsx` — `handleChangeAdapter`'s
  real second parameter is `(documentData: unknown, meta: { dataPath, changes }) => void`,
  but every call site here passes a single-argument `(unit: Unit) => Promise<void>`-shaped
  handler. Same established cast-the-handler-at-the-call-site treatment as
  prior batches (see `CardBlock/index.tsx` for the precedent this follows).
- Same `useDispatch()`/thunk-argument pattern as prior batches, but on the
  *argument* side this time rather than the awaited result: `Toggle2FA.tsx`
  and `SetPasswordMenuItem.tsx` call `enable2FA(user?.id)`/`disable2FA(user?.id)`/
  `setPasswordAction(user?.id, ...)` where the real action creators require
  `string | number` (not optional) — cast `user?.id as string` at each call
  site rather than threading a stricter, always-defined `user` type through
  every consumer.
- `queue` (npm package) ships a `.d.ts` that omits its own `.jobs` array
  property, even though the package's real source assigns and reads
  `this.jobs` throughout (confirmed in its shipped `index.js`) — a types
  gap, not a runtime bug. Cast at the one read site in `ExportReport.tsx`
  rather than adding a project-wide augmentation for one property.
- Added one new shared ambient declaration: `types/htm-asset.d.ts` for
  `*.htm` imports (both apps' `vite.config.mjs` add `.htm` to
  `assetsInclude`, resolving it to a URL string same as `*.svg`'s default
  export — `vite/client` doesn't cover this extension itself). Used by
  `UserProcessesList/components/ExportReport.tsx`'s PDF report template.

## Seventy-seventh batch: `components/admin-front/src/application/modules/*` — `workflow`, round 1 of N (30 files)

`workflow/` (110 files total, the BPMN diagram editor and its surrounding
list/journal pages) is the last remaining admin-front module directory and
by far the largest, so it's being split into several rounds. This round:
the module's own route config (`index.tsx`), all seven `variables/*.ts`
BPMN element-type schemas, and the six smaller sibling pages
(`WorkflowCategoryList`, `QrTemplatesList`, `MessageTemplatesList`,
`TagsListPage`, `WorkflowProcesses`, `JournalList`, `WorkflowList`).
Explicitly **not** touched: `pages/Workflow/` (49 files, the diagram editor
itself), `pages/Journal/` (19 files), `pages/NumberTemplateList/` (12
files) — separate future rounds.

- **Mid-batch session interruption and recovery**: the agent converting
  this round hit a session limit mid-file (while writing
  `WorkflowProcesses/dataTableSettings.tsx`) and terminated without
  finishing its own cleanup — left ~20 files with **both** the old
  `.jsx`/`.js` original and the new `.tsx`/`.ts` replacement coexisting
  on disk, unstaged, `git rm` never run. This is exactly the
  stale-duplicate-file risk documented earlier in this file (admin-front's
  Vite config resolves `.js`/`.jsx` *before* `.ts`/`.tsx`), except this
  time caught immediately on resume rather than discovered later. Verified
  each already-written file was a complete, well-formed conversion (Write
  tool calls are atomic — a file that exists with a proper closing
  `export default` was fully written, not truncated), then `git rm`'d all
  the stale originals and finished the remaining unconverted files
  (`WorkflowProcesses/index.tsx`, all 8 `WorkflowList/*` files, the
  top-level `workflow/index.tsx`) directly rather than re-delegating.
- **Self-caught mistake while finishing `CopyWorkflow.tsx`**: initially
  "fixed" `<ProgressLine loading={loading} classCustom={classes.progressLine} />`
  by changing it to a `classes={{root: ...}}` prop — but `classes.progressLine`
  is a genuine pre-existing quirk (no `progressLine` key exists in this
  file's `styles` object, so the value is always `undefined`, which then
  triggers `ProgressLine`'s own `classCustom = ''` default parameter —
  harmless, not a bug). Reverted to the original prop and value before
  running typecheck.
- **Self-caught mistake while writing `SubscribeWorkflow.tsx`**: initially
  wrote `dispatch(unSubscribeToProcess(id)(dispatch))` — double-dispatching
  a thunk that the original code calls directly
  (`unSubscribeToProcess(id)(dispatch)`, no outer `dispatch()` wrapper).
  `CopyWorkflow.tsx`'s sibling calls *do* use the outer-`dispatch()` form
  (relying on redux-thunk middleware to unwrap it) — both patterns are
  genuinely present side-by-side in the original code, so the fix was to
  match each file's own original pattern exactly rather than standardizing
  on one.
- `FilterHandler`'s shared base `FilterHandlerProps` interface (established
  in an earlier JsonSchema/DataTable-adjacent batch) carries a deliberate
  `[key: string]: unknown` index signature. Discovered here that
  `Omit<FilterHandlerProps, 'someKey'>` on a type with that index signature
  silently degrades every other explicitly-declared property to `{}`
  (TS's `Pick`/`Omit` machinery keys off `keyof T`, which for an indexed
  type doesn't distinguish explicit properties from the catch-all) —
  `UsersFilterHandler.tsx`'s `onChange`/`t`/etc. all lost their real types
  and became "not callable" errors after an `Omit`-based override attempt.
  Fixed by making `UsersFilterHandlerProps` a fully independent interface
  (not extending `FilterHandlerProps` at all) and casting once at the
  `super(props as unknown as FilterHandlerProps)` call site instead — the
  one place the two shapes actually need to meet.
- Same recurring `position`/`textAlign`/`flexWrap` CSS-in-JS literal-widening
  fix needed in four separate files this round
  (`MessageTemplatesList`, `QrTemplatesList`, `WorkflowTagsTableToolbar`,
  and one already covered by the `as const` pattern) — plain `.js` object
  literals lose their string-literal types once typed, same established
  `as const` fix each time.
- Added an ambient declaration for `react-sortable-tree` (`WorkflowCategoryList`'s
  drag-and-drop category tree) — ships no types at all; declared its
  default export loosely as `React.ComponentType<Record<string, unknown>>`,
  scoped to this one usage.

## Seventy-eighth batch: `components/admin-front/src/application/modules/*` — `workflow`, round 2 of N (31 files)

Second round of the `workflow` module split (round 1 covered the route
config, BPMN element-type variables, and six smaller sibling pages).
This round: `pages/Journal/` (the single-process detail/log view — a real
page component, not a route config, plus its 17 supporting
files/subcomponents) and `pages/NumberTemplateList/` (12 files). Still not
touched: `pages/Workflow/` (49 files, the BPMN diagram editor) — a
separate future round.

- **Confirmed-broken file removed, not converted**: `NumberTemplateList/components/TemplateFormModal.jsx`
  had zero importers anywhere in the repo AND imported two files that don't
  exist in this directory (`./RegisterSelect`, `../variables/registrySchema`)
  — it's a copy-paste leftover from the `registry` module (confirmed by its
  `translate('RegistryListAdminPage')` and `NewRegister`/`EditRegister`
  text keys, which belong to registers, not number templates). Unlike prior
  dead-but-complete files converted anyway, this one can't be faithfully
  converted without fabricating two nonexistent modules, so it was removed
  outright — same precedent as the empty/no-export-default file removals in
  earlier batches.
- **Real, live bug preserved, not fixed**: `NumberTemplateList/components/Actions/ExportTemplate.tsx`
  calls `this.handleErrorDialog()` on its "Max export limit reached." error
  path, but that method is never defined anywhere on the class — a genuine
  `TypeError` every time that specific error occurs. Preserved via a cast
  on the call site (`(this as unknown as { handleErrorDialog: () => void })`)
  rather than adding a stub method, since a stub would silently turn a
  real crash into a silent no-op — a behavior change, not a conversion.
- **Cosmetic-only quirk preserved**: `Journal/components/SkipDelayEvent.tsx`'s
  internal component is still named `StopDelayEvent` (copied from the real
  `StopDelayEvent.tsx` and never fully renamed) — harmless since it's a
  local binding never referenced by name elsewhere, but kept as-is for
  fidelity rather than quietly renamed. Separately, the two files' error
  messages differ in a way worth flagging: `StopDelayEvent.tsx` does
  `new Message(result?.message || 'StopEventDelayError', 'error')` while
  `SkipDelayEvent.tsx` does `new Message(t(result?.message) || '...', ...)`
  — wrapping the message in `t()` before the fallback, meaning `t(undefined)`
  gets called whenever `result.message` is absent. Preserved exactly in
  both files rather than reconciled to one pattern.
- **Self-caught omission**: initially forgot to write `NumberTemplateList/variables/dataTableSettings.tsx`
  entirely (read the original, then skipped straight to the components that
  import it) — caught by `tsc`'s "Cannot find module" error during
  verification, not before. Written before finishing the batch.
- **CRITICAL circular-import rule, two self-caught instances**: `Journal/components/JsonExpand.tsx`
  (imports `components/CodeEditDialog`) and `Journal/index.tsx` (imports
  `components/JsonSchema/elements/StringElement`) both initially had their
  loose-cast rebind at module top level — the same risky pattern documented
  repeatedly this session for anything touching the
  Editor/UserSettings/JsonSchema/CodeEditDialog cycle. Neither crashed in
  this session's testing, but per the standing rule this is free insurance
  regardless: caught during a final audit pass (grepping this round's new
  files for those four directory names) and moved both casts into their
  respective function bodies before finishing.
- `ModulePage`'s shared `t?: (key: string) => string;` field (declared once,
  used by every page extending `ModulePage`) doesn't support the
  interpolation-params second argument that `react-translate`'s real `t`
  accepts — `Journal/index.tsx` needs `t('Key', { number, name })` in two
  places. Cast `t` to a locally-declared wider function type at each call
  site rather than widening the shared `ModulePageProps.t` field, which
  other already-converted `ModulePage` subclasses rely on staying narrow.
- Same `componentDidUpdate(prevProps, prevState)` override-arity issue as
  the `users` batch's `Unit/index.tsx` (`ModulePage.componentDidUpdate`
  takes zero parameters) — same fix: both parameters optional, asserted
  present in the body.
- Same `handleChangeAdapter`/`parseFile` narrow-callback-parameter-type
  mismatches as prior batches — cast at the call site each time.

## Seventy-ninth batch: `components/admin-front/src/application/modules/*` — `workflow`, round 3a of N (12 files)

Round 3 (sub-round "a") of `pages/Workflow/` — the BPMN diagram editor
itself, the last and largest subtree of the `workflow` module. This
sub-round: `helpers/*` (BPMN element-type/id utility functions),
`handlers/*` (diagram element create/delete/change callbacks), and the
three smallest top-level `components/*.jsx` (`CreateParallelGatewayEnding`,
`RightSidebar`, `WorkflowCategorySelect`). Still to come in later sub-rounds:
`Details/*` (8 files), `WorkflowSettings/*` (4 files), `WorkflowVersions/*`
(24 files), and the main `pages/Workflow/index.jsx` (converted last, since
it composes everything else).

- **First batch touching bpmn-js-specific code** — a `types/bpmn-js.d.ts`
  ambient declaration already existed from an earlier (pre-this-session)
  conversion of `BPMNEditor.tsx`/`BPMNViewer.tsx`, declaring a global
  `BpmnJsInstance` interface plus typed `bpmn-js/lib/Modeler` and
  `bpmn-js/lib/NavigatedViewer` module shapes. Reused `BpmnJsInstance`
  as-is for every `modeler` prop in this batch rather than inventing a
  parallel type. `modeler.get(service)` is typed to return `unknown`
  (bpmn-js's service locator has no way to type the result by service
  name), so every actual usage (`.get('modeling')`, `.get('elementRegistry')`)
  needed a local, scoped interface (`Modeling { appendShape, updateProperties,
  removeShape }`, `ElementRegistry { get }`) and a cast at the point of
  retrieval — duplicated per-file rather than centralized, since each file
  only touches a couple of methods on each service.
- Two files were empty (0 bytes) with zero importers anywhere in the repo:
  `helpers/eventHandler.js` (removed outright, same precedent as other
  empty/unreachable files this session) and `handlers/elementChange.js`/
  `handlers/elementCreate.jsx` (not empty, but both are literal no-op
  stubs, `() => () => {}` — converted as-is since they're real, if
  currently inert, exported members of `handlers/index.ts`).
- `handlers/elementCreate.jsx` had a `.jsx` extension despite containing
  zero JSX syntax — converted to plain `.ts` (matching its sibling
  `elementChange.js` → `.ts`), not `.tsx`, since there's no JSX to justify
  the extension.
- One more instance of the `components/JsonSchema`-adjacent
  defer-to-function-body caution: `WorkflowCategorySelect.tsx` initially
  cast its `components/JsonSchema/elements/Select` import at module scope
  (matching a pattern used without issue elsewhere for `StringElement`,
  a sibling leaf import in the same directory) — moved inside the
  component function body anyway during the final circular-import audit,
  since the cost is zero and `components/JsonSchema` is a confirmed
  circular-chain participant elsewhere in the app, even though this
  specific leaf import isn't known to close a cycle.
- `RightSidebar.tsx` imports three still-unconverted sibling subtrees
  (`./WorkflowSettings`, `./Details`, `./Details/elements`) that later
  sub-rounds will handle — cast each with `as unknown as ...` **inside**
  the component function body (not at module scope) as a precaution,
  since it's not yet known whether any of those subtrees import back
  through `RightSidebar` once they're converted.

## Eightieth batch: `components/admin-front/src/application/modules/*` — `workflow`, round 3b of N (12 files)

Round 3 (sub-round "b") of `pages/Workflow/`. This sub-round: `Details/*`
(the BPMN element property-editor registry — `index.tsx`,
`elements/index.tsx`, and the four per-element-type editors `EndEvent`,
`Event`, `Gateway`, `Task`, each with its own `schema.ts` where present)
and `WorkflowSettings/*` (the workflow-level settings panel — `index.tsx`,
`schema.ts`, `styles.ts`, `unitSchema.ts`). Still to come: `WorkflowVersions/*`
(24 files) and the main `pages/Workflow/index.jsx` (converted last).

- **`RightSidebar.tsx`'s round-3a circular-import precaution was not
  needed**: grepped `Details/*` and `WorkflowSettings/*` for any import of
  `RightSidebar` — none found. The deferred-cast treatment stays in place
  regardless (it was free insurance, not a fix for a confirmed problem),
  and this batch's own `SchemaForm`/`Editor`/`Select`/`StringElement`/
  `WorkflowCategorySelect` usages in `WorkflowSettings/index.tsx` got the
  same defensive treatment — cast inside the component function body, not
  at module scope, since all of them sit on the `components/JsonSchema`
  import chain.
- Two npm packages with no shipped types and no `@types` package, both new
  to this session: `save-svg-as-png` (new ambient declaration, scoped to
  its one usage in `WorkflowSettings/index.tsx`) and `file-saver`. The
  latter **already had an ambient declaration** from an earlier batch
  (`export default function saveAs(...)`, matching `PrintReportButton.tsx`'s
  `import saveAs from 'file-saver'; saveAs(...)` call style) — but
  `WorkflowSettings/index.tsx` calls it as `import FileSaver from
  'file-saver'; FileSaver.saveAs(...)`, a different style. Checked the
  package's real source (`file-saver/src/FileSaver.js`) rather than
  guessing: it exports a single function that also carries itself as a
  `.saveAs` property (`saveAs.saveAs = saveAs`), so **both call styles are
  genuinely valid at runtime**. Extended the existing declaration to a
  callable interface with both the call signature and the `.saveAs`
  method, rather than picking one style and breaking the other file.
- `Details/elements/index.tsx`'s exported element-type-to-component map is
  built via `{ ...typesArray.reduce((acc, type) => ({...acc, [type]: X}), {} as Record<string, C>), 'bpmn:EndEvent': Y }`
  — spreading multiple `Record<string, C>` reduce results together with
  one explicit literal key. TypeScript's inferred type for the resulting
  object literal collapsed to just `{ 'bpmn:EndEvent': C }`, **dropping
  the index signature** from the spread parts entirely, which broke the
  consumer's `formElements[selection.type]` dynamic lookup (implicit
  `any`/no-index-signature error). Fixed by assigning the object literal
  to an explicitly-typed `const formElements: Record<string, C> = {...}`
  first, then exporting that — an explicit annotation on the whole literal
  keeps the index signature that letting it infer freely did not.
- `Task/index.tsx` has a real pre-existing quirk carried over unchanged:
  one `<Button className={classes.closeDialog}>` reads a class key that
  doesn't exist in that file's own `useStyles` object (unlike its sibling
  `WorkflowSettings/styles.ts`, which does declare `closeDialog`) — always
  `undefined` at runtime, harmless. Typing it required casting `classes`
  itself to `Record<string, string>` before the property read, **not**
  casting the read expression's result — a property access on a strictly-typed
  object literal errors at the access itself; wrapping the result in `as never`
  afterward doesn't suppress that.

## Eighty-first batch: `components/admin-front/src/application/modules/*` — `workflow`, round 3c of N (23 files)

Round 3 (sub-round "c") of `pages/Workflow/`. This sub-round: the entire
`WorkflowVersions/*` subtree — `helpers/dataMapping/{event,gateway,task}DataMap.ts`,
`helpers/{getChanges,workflowTree}.ts`, `hooks/{useRevert,useVersion,useVersions}.ts`,
`PreviewTypes/{index,CodePreview,SchemaPreview}.tsx`, and the dialog/table/
timeline layer (`EmptyResults`, `VersionPreview`, `VersionDetail`,
`VersionsTimeline`, `VersionTreeMenu`, `RevertChangesTable`,
`revertHandlers`, `RevertVersionDialog`, `NewVersionDialog`,
`CompareVersionDialog`, `WorkflowVersionsDialog`, `index`). Only the main
`pages/Workflow/index.jsx` remains in this module — a final sub-round.

- **Dead code, converted anyway (trivial, complete)**: `CompareVersionDialog.tsx`
  is a one-line placeholder (`<span>CompareVersionDialog</span>`) with zero
  importers anywhere in the repo — confirmed via grep. The real "compare
  two versions" UI is `WorkflowVersionsDialog.tsx`'s `openCompareDialog`
  branch, which renders a `FullScreenDialog`+`VersionDetail` pair directly
  and never references this component at all.
- **Cross-file local-interface name collision, same class documented in
  round 3b**: `useRevert.ts` and `RevertChangesTable.tsx` each declare
  their own local `Change` interface (structurally near-identical, but
  nominally distinct TS types since they're declared in different files).
  `RevertVersionDialog.tsx` imports both, and passing `useRevert`'s
  `onSelectChanges` into `RevertChangesTable`'s `onSelect` prop fails
  ("two different types with this name exist, but they are unrelated") —
  fixed with a cast at the passing site, not by unifying the two
  interfaces into a shared file.
- **Self-caught mistakes, fixed before verification**: (1) `PreviewTypes/CodePreview.tsx`
  initially imported `{ Editor, DiffEditor }` from `components/Editor` as
  two named imports — but `Editor` is that module's *default* export, only
  `DiffEditor` is named; caught immediately since the original clearly
  imports `Editor, { DiffEditor }`. (2) `VersionsTimeline.tsx` initially
  gained an added `root: {}` entry in its `useStyles` object to make
  `classes.root` type-check — but the original never declared `root` in
  that file's own styles at all (a genuine preexisting quirk, always
  `undefined`, harmless); adding a real empty class definition would have
  been a fabricated behavior change, not a preserved one. Reverted to no
  `root` key and cast the one read site instead. (3) `WorkflowVersionsDialog.tsx`'s
  one `await initWorkflow();` call (zero arguments in the original) was
  initially typed as requiring an explicit `null` first argument and
  changed to `initWorkflow(null)` to satisfy that — but a required
  parameter position and an omitted-argument call are not the same thing
  if the callee ever has a default parameter value; made the parameter
  optional in the local prop-type declaration instead and restored the
  zero-argument call exactly.
- Same recurring "harmless prop passed but never destructured" pattern:
  `WorkflowVersionsDialog.tsx` passes `onRevert` to `<VersionsTimeline>`,
  which has never read it (confirmed against the original — not
  introduced by this conversion). Added `onRevert` to `VersionsTimelineProps`
  as an accepted-but-unused optional field, matching the established
  precedent from earlier batches, rather than stripping the prop at the
  call site.
- `@mui/x-tree-view@6` (`VersionTreeMenu.tsx`'s `TreeView`/`TreeItem`,
  first use of this package in the migration) needed no casts at all —
  its v6 API (`nodeId`, `defaultExpanded`, `defaultCollapseIcon`) matches
  this file's usage exactly.

## Eighty-second batch: `components/admin-front/src/application/modules/workflow/pages/Workflow/index.tsx` — round 3, final sub-round

The last remaining file in `workflow/` — the main BPMN diagram editor page
itself (~1300 lines, a class component extending `ModulePage`, composing
every piece converted across rounds 1-3c: `WorkflowVersions`, `RightSidebar`,
the `handlers/`/`helpers/` modules, `BPMNEditor`, `StringElement`, and
~25 Redux action creators). **Converting this file completes the entire
`workflow` module, and with it, all of `components/admin-front/src/application/modules/*`
is now fully TypeScript.**

- **Real, likely-pre-existing bug found, flagged, not fixed**: `hasUnsavedItems()`'s
  early-return path does `if (!this.modeler) { return diff; }` — returning
  the `diff` *function itself* (the module-level import from `helpers/diff`),
  not a boolean and not the `diffs` result computed two lines above from
  `diff(workflow, origin)`. Every caller only ever uses the result in a
  boolean context (`if (!hasUnsavedItems) {...}`), and a function reference
  is always truthy, so this happens to behave identically to `return true;`
  today — but it reads exactly like a copy-paste/shadowing mistake (there's
  a same-named local `diffs` right above it, and a *different* local
  variable named `diff` shadowing the import a few methods away in
  `listenTokenExpired`). Preserved via a cast (`return diff as unknown as
  boolean;`) with a comment, not "fixed" to `return diffs;` — that would be
  a real behavior change if `hasUnsavedItems()`'s result is ever compared
  more strictly than truthiness somewhere not visible from this file alone.
- `ModulePage`'s base class declares `componentGetTitle?: (params: {
  returnTitle: boolean }) => string`, but this subclass's override returns
  JSX (a whole name-editing widget with icons and a text field) whenever
  called with no arguments from `render()` — only the `returnTitle: true`
  branch actually returns a string. Rather than loosening the shared base
  type (other `ModulePage` subclasses rely on it meaning a real string),
  cast the JSX-returning branch's result to `string` at the point it leaves
  the method, matching the existing precedent of casting at the boundary
  rather than touching a shared base type.
- `elementCreate`/`elementChange` (from `./handlers`, converted in round 3a)
  are literal no-op stubs typed as zero-argument functions
  (`() => () => {}`), but every call site in this file invokes them as
  `handler(this.modeler)(element)` — the same two-argument shape the real
  `elementDelete` uses. Cast both imports once, right after the import
  block, to a loose `(modeler: unknown) => (element: unknown) => void`
  signature rather than casting at each of the four call sites individually.
- Same recurring gaps as prior rounds: `queue`'s shipped `.d.ts` omits its
  own `.jobs` property (cast at the one read site, same as an earlier
  batch's `ExportReport.tsx`); `hotkeys-js`'s handler type expects
  `boolean | void`, not `Promise<void>`, cast at the `hotkeys(...)`
  registration call.
- No new circular-import risk: the file's only import from a
  previously-flagged directory is `components/JsonSchema/elements/StringElement`,
  and its loose-cast is deferred inside `componentGetTitle`'s method body
  (only reachable when a user is actively renaming a workflow), not at
  module scope.
- One more file surfaced once every module was converted:
  `application/modules/index.tsx`, the top-level aggregator that calls every
  module's `getXModule()`/plain-object export into the array `AppRouter`
  consumes — every prior round was explicitly told not to touch it since it
  depended on modules not yet converted. Converting it hit a real
  cross-file type-naming gotcha: it and `packages/front-core/components/AppRouter/index.tsx`
  each independently declare their own local `RouteModule` interface with
  the same name but structurally different `routes` field types
  (`unknown[]` here vs. `RouteDef[]` there) — TypeScript's `.concat()`
  overload resolution then reports them as "two different types with this
  name exist, but they are unrelated" rather than silently structurally
  matching. Fixed by not naming a local type at all here (no return-type
  annotation on `getModules`, one `as never[]` cast on the returned array)
  rather than trying to share or rename the two interfaces.

## Eighty-third batch: `components/cabinet-front/src/application/modules/*` — `admin`, `home`, `users`, `inbox` (22 files)

First batch of the final phase: `cabinet-front`'s own `application/modules/*`
(~175 files total). `cabinet-front` shares `packages/front-core` with
admin-front, already 100% converted, so most dependencies here were
already typed; this batch mainly exercised `cabinet-front`'s own
per-app `application/actions/*` and route/navigation config shape.

- Confirmed the same route/navigation config shape used throughout
  admin-front (`{ routes: [...], navigation: [...] }`, consumed by the
  same shared, deliberately-loose `packages/front-core/components/AppRouter/index.tsx`)
  holds here too — plus one new shape: `admin/index.js` exports
  `{ appbar: [{ component, access }] }` instead, consumed by
  `packages/front-core/layouts/components/Header.tsx`'s already-typed,
  equally-loose `Widget` interface.
- Two hook-misuse patterns converted to their type-correct equivalent
  (not a behavior change): `CustomInterface/index.tsx` had two spots doing
  `React.useCallback((() => {...})(), [deps])` — passing an
  **already-invoked IIFE's result** as `useCallback`'s first argument
  instead of a function. This works at runtime purely because
  `useCallback(value, deps)` is internally just `useMemo(() => value, deps)`
  in React, so passing a non-function value still gets memoized correctly
  by `deps` — but TypeScript's `useCallback<T extends Function>` typing
  correctly rejects a non-function argument. Converted both to
  `React.useMemo(() => {...}, deps)`, which is the exact semantic
  equivalent, not a behavior change.
- **Real, pre-existing crash risk found, preserved, flagged**:
  `home/pages/Home/index.tsx`'s unit-sorting filter destructures
  `{ menuConfig: { defaultRoute } }` directly with no optional chaining —
  throws if any `userUnit`'s `menuConfig` is ever `undefined`. TypeScript
  correctly flagged this as an unsafe callback for `.filter()`; cast the
  whole callback `as never` rather than adding the optional chaining that
  would silently change behavior.
- `InboxFiles/index.tsx`: same `ModulePage.componentGetTitle` base-class
  signature mismatch as an earlier admin-front batch (declared as an
  optional property of a fixed `(params) => string` shape) — converted
  the override from a class method to a property (arrow function) and
  cast its `inboxFile && inboxFile.name` result (which can be `undefined`)
  to `string`, matching the established precedent rather than loosening
  the shared base class.
- Self-caught mistake: initially added `// eslint-disable-next-line
  react-hooks/exhaustive-deps` comments (5 of them, across 3 files) out of
  habit — this project's `lint:types` config doesn't register the
  `react-hooks` plugin, so an unknown-rule disable comment is itself a
  real lint error here (same trap documented in an earlier FileDataTable
  batch). Removed all five before finishing.
- Preserved without "fixing": `home/pages/CustomInterface/index.jsx`'s
  `getFilters(documentData)` call passes an argument to a function
  declared as taking zero parameters (`const getFilters = () => {...}`) —
  a harmless, pre-existing dead argument, cast rather than dropped.
- No new circular-import risk introduced: three files (`CustomInterface/index.tsx`,
  `UserList/components/Layout.tsx`, `UserList/components/AddUnitUser.tsx`)
  cast `components/JsonSchema`'s `SchemaForm` — all three casts deferred
  into their component function bodies rather than left at module scope,
  as a precaution (not because a cycle was confirmed), matching standard
  practice for this directory throughout the session.

All 5 checks pass in both admin-front and cabinet-front (typecheck clean
except admin-front's 6 pre-existing out-of-scope errors; lint:types/lint
clean, 0 errors in both; 404/400 tests pass; both builds succeed).

## Eighty-fourth batch: `components/cabinet-front/src/application/modules/*` — `reports`, `workflow` (28 files)

Second batch of `cabinet-front`'s `application/modules/*`.

- Confirmed `cabinet-front` already has its own **separate** `reports`
  module with the same `ReportActions`/`ReportDraftSelect` naming pattern
  as admin-front's `reports` module (converted in an earlier batch) — read
  each file fresh rather than assuming parity; the shapes turned out
  similar but not identical (e.g. cabinet-front's `ReportActions` has no
  `AccessTemplateItem`/`RenderTemplateItem`).
- Two more `React.useCallback(objectLiteral, deps)` misuses (an object
  literal — not an invoked IIFE's result — passed where `useCallback`
  expects a function): `RenameReportDialog.tsx`'s inline schema object and
  `ReportList/index.tsx`'s `getStatuses(t)` call. Unlike the IIFE-misuse
  case fixed in the prior batch (semantically equivalent to `useMemo`,
  safe to convert), this shape is genuinely passing the wrong kind of
  value — `useCallback` never invokes its first argument, so this has
  always harmlessly just memoized the object itself by `deps`. Preserved
  exactly via a cast rather than converted to `useMemo`, since changing
  the underlying pattern here would be "fixing" a bug class rather than
  translating a type-safe equivalent.
- Two self-caught near-regressions while converting `WorkflowList/components/TableToolbar/{DeleteTrash,SelectStatus}.tsx`:
  (1) `DeleteTrash.tsx`'s `data.find(({ id }) => id === row).entryTaskId`
  throws if the row isn't found (no `?.`) — initially added optional
  chaining while typing it, caught the behavior change before finishing,
  reverted to a cast that preserves the throw. (2) `SelectStatus.tsx`'s
  nested `<Typography variant="subheading2">` — initially added a
  `component="span"` prop that isn't in the original (a reasonable-looking
  fix for nesting a block element inside another, but not what the
  original code does), caught and removed.
- `Typography`'s `variant="subheading2"` (here and in the admin-front
  `WorkflowList` batch) isn't a real MUI `Typography` variant — a
  custom legacy value some deployment's theme presumably augments via
  module declaration merging that isn't present for this app/file. Spread
  the prop in via a loosely-typed object rather than removing the custom
  variant.
- `WorkflowTable.tsx`: spreading `{...dataGridOptions}` onto a `<DataGrid>`
  *after* explicitly setting `columns`/`actions` props is intentional
  last-spread-wins behavior (dataGridOptions' merged shape is meant to
  override the defaults) — but TypeScript's JSX prop-overlap check flags
  the earlier explicit props as "specified more than once" once
  `dataGridOptions`'s inferred type is seen to include those same keys.
  Fixed by annotating the `useMemo` producing `dataGridOptions` as
  `Record<string, unknown>` rather than reordering the props (which would
  change which value wins).
- `getDataUrl.ts`: `DataTableRequestState`'s `page`/`rowsPerPage` are typed
  `number | null | undefined`; a JS default parameter (`page = 1`) only
  substitutes for `undefined`, not `null` — so `(page - 1) * rowsPerPage`
  could still operate on `null` at runtime (silently producing `NaN`,
  a pre-existing quirk carried over unchanged from the untyped original).
  Cast at the arithmetic site rather than changing the destructuring
  default to also cover `null`.
- No new circular-import risk: `ReportDraftSelect/index.tsx` casts
  `components/JsonSchema/components/ElementContainer` (this component is
  itself passed into JsonSchema's `SchemaForm` as a `customControls` entry
  elsewhere) — deferred into the component function body as a precaution,
  matching standard practice for this session even though no actual cycle
  was confirmed.

All 5 checks pass in both admin-front and cabinet-front (typecheck clean
except admin-front's 6 pre-existing out-of-scope errors; lint:types/lint
clean, 0 errors in both; 404/400 tests pass; both builds succeed).

## Eighty-fifth batch: `components/cabinet-front/src/application/modules/*` — `messages` (19 files)

- **Self-caught mistake, fixed before verification**: while typing
  `MessageList/variables/dataTableSettings.tsx`'s column widths, initially
  collapsed the original's `MobileDetect`-based `isMobile` check
  (`width: isMobile ? window.innerWidth - 220 : 600`, and a narrower
  `createdAt` column width on mobile) into a constant `600` for both
  branches while adding types — a real behavior change that would have
  broken the mobile column-width logic. Caught by re-reading against the
  original before running typecheck; restored the `MobileDetect` import and
  check exactly as they were.
- **Preserved without "fixing"**: `Attachments.tsx`'s `handleDownload` is
  invoked with an argument it never declares (`onClick={() =>
  handleDownload(downloadToken)}` against a zero-parameter function) — the
  passed value is simply ignored, a harmless pre-existing quirk, kept
  exactly including the unused argument at the call site.
- **Real type-vs-runtime mismatch found, preserved**:
  `actions/files.ts`'s `downloadFile`'s third parameter is declared
  `boolean` (`p7sSign`, used only as `if (p7sSign) params = '?p7s=true';`),
  but `Attachments.tsx` passes `p7sFileId` (a string) there — relying on
  JS's truthy/falsy coercion rather than an actual boolean. Works exactly
  as intended at runtime (presence of a p7s file id toggles p7s mode), so
  cast at the call site rather than coercing with `!!p7sFileId`, which
  would be a needless behavior-preserving rewrite of something that
  already behaves correctly.
- Two files each declaring their own same-named `MessageLike` interface
  (`MessageLayout.tsx` and `SmartMessage/index.tsx`, structurally
  different — one has an index signature, one doesn't) hit the same
  "two different types with this name exist" TS error documented in
  earlier batches — fixed with a cast at the passing site in
  `MessageLayout.tsx`, not by unifying the interfaces.
- `mustache` ships no types at all; added `types/mustache.d.ts` scoped to
  the one function actually used (`Mustache.parse`), typing its return as
  a loose tuple (`[type, value, start, end, ...nested]`) since the real
  shape varies by token kind and nothing here inspects past the first two
  elements.
- A `DataGrid` call spreading `_.merge(settings, dataTableAdapter(props))`
  after an explicit `columns={settings.columns}` prop triggered TS2783
  ("'columns' is specified more than once") — `dataTableAdapter`'s return
  never actually includes a `columns` key (confirmed by reading its
  source), so the two are never really in conflict, but the merged
  object's *inferred type* still structurally carries `settings`'s own
  `columns` field, which TS treats as a genuine duplicate-attribute risk.
  Cast the spread expression to `Record<string, unknown>` (an index
  signature has no explicit `columns` property for TS to compare against)
  rather than removing the seemingly-redundant explicit prop.
- Same-class MUI v4/v5 mismatch again: `@mui/x-date-pickers@5`'s
  `DatePicker` doesn't support this file's v4-era `renderInput`/`components`
  combination — same established treatment as `components/KeyboardDatePicker`
  (cast to a loose component type, `renderInput`'s `params` typed `any`
  with the matching eslint-disable). Note: the disable comment must sit
  directly above the line containing the `any`, not above a wrapping
  `React.useCallback(` one line earlier — `eslint-disable-next-line` only
  covers the literal next line, and misplacing it (caught here) leaves the
  real `any` usage unsuppressed.
- Non-standard `Typography variant="subheading2"` (not a real MUI variant)
  preserved via cast, same precedent as prior batches.

## Eighty-sixth batch: `components/cabinet-front/src/application/modules/*` — `registry` (16 files converted, 21 removed)

- **Confirmed dead AND unbuildable, removed outright rather than converted**:
  the entire `pages/Registry/` subtree (21 files) — an older, superseded
  implementation of the registry feature, parallel to the live
  `pages/RegistryReforged/` (confirmed live by checking the module's own
  `index.jsx`, which imports only `RegistryReforged`; zero other files
  anywhere in the repo import anything under `pages/Registry/`). Unlike
  every prior "dead but complete, convert anyway" precedent in this
  migration, this one is **also structurally unbuildable**: 10 of its 21
  files import `@devexpress/dx-react-grid` / `@devexpress/dx-react-core`,
  and neither package is even listed in `cabinet-front/package.json`
  anymore (confirmed absent from `node_modules` too) — the dependency
  itself was removed at some point after this code stopped being wired
  up. Converting it would mean inventing ambient types for an entire
  third-party grid library solely to typecheck code that cannot run.
  Removed via individual `git rm` calls (a recursive `git rm -r` on the
  directory was blocked by this session's own safety tooling as a
  bulk-delete action; falling back to listing each file explicitly
  succeeded and is the safer form anyway).
- **Self-caught mistake, fixed before verification**: while converting
  `RegistryReforged/index.tsx`, initially "fixed" `inputProps`'s
  `autocomplete: 'off'` (lowercase, non-standard React casing — the
  original passes it as a literal DOM attribute, which browsers accept
  case-insensitively, so it works identically to the canonical
  `autoComplete`) to the camelCase spelling while adding types. Caught
  before running typecheck and reverted to the exact original lowercase
  key via a cast, matching the outer `TextField`'s own `autocomplete`
  prop a few lines above (which was correctly left alone).
- **Real behavioral bug self-caught mid-conversion**: initially dropped
  `RegistryModal.jsx`'s static `defaultProps` entirely (`{ value: {},
  editMode: false, handleClose: () => null, handleDelete: null,
  handleSave: null, open: false }`) when adding a `RegistryModalProps`
  interface — this is a real runtime default (React fills in missing
  props from a class component's `defaultProps`), not just type
  documentation, and dropping it would have changed `open`'s default
  from `false` to `undefined` for any caller that omits it. Caught when
  TypeScript correctly flagged `<Dialog open={open}>` as possibly
  `undefined` (class-component `defaultProps` doesn't narrow
  `this.props`'s TS type the way function-parameter defaults do); restored
  the static `defaultProps` and cast at the one remaining call site.
- Cross-file local-interface collisions recurred twice in this batch
  (`InitialState.tsx`'s `ColumnDef` vs. `propsToState.ts`'s own `Column`,
  both describing DataGrid column config with slightly different
  `renderCell` parameter shapes) — same established fix as prior batches:
  cast at the point the two meet, don't unify or rename across files.
- Added one new ambient declaration: `types/list-to-tree.d.ts` (the
  `list-to-tree` npm package ships no types; scoped to its one real usage,
  `RegistryReforged/helpers/keysToMenu.ts`).
- `RestoreRecordButton.tsx` (live) has a `requestRegisterKeyRecords`
  action bound in `mapDispatchToProps` that the component never actually
  calls — harmless dead prop, not the bug class seen in earlier batches
  (no `defaultProps` copy-paste, just an unused binding), preserved as-is.

All 5 checks pass in both admin-front and cabinet-front (typecheck clean
except admin-front's 6 pre-existing out-of-scope errors; lint:types/lint
clean, 0 errors — including the same "unused nav icon import" warning
pattern already established for every other module's route-config
`index.tsx`; 404/400 tests pass; both builds succeed). No circular-import
regressions: `components/JsonSchema`/`components/Editor`-adjacent casts in
`RegistryModal.tsx` and `RestoreRecordButton.tsx` are deferred inside
`render()`/the component function body, not at module scope.

## Eighty-seventh batch: `components/cabinet-front/src/application/modules/*` — `tasks`, round 1 of N (18 files)

`tasks/` (66 files) is `cabinet-front`'s last remaining module and, like
admin-front's `workflow/`, being split into rounds. This round: the
module's own route config, the three small top-level `components/*`, the
`CreateTaskDialog/` subtree, and the full `pages/TaskList/` subtree.
Untouched: `pages/Task/` (48 files, the task detail/edit/preview flow —
future rounds).

- No real bugs found this round, but two genuine pre-existing type/runtime
  mismatches worth naming (both preserved via cast, not fixed):
  `TaskListSearch.tsx` passes its own `handleSearch` (a
  `({ clear }?: { clear?: boolean }) => Promise<void>` function meant to be
  called manually with an options object, e.g. `handleSearch({ clear: true
  })`) directly as a `<Button onClick={handleSearch}>` handler — when MUI
  invokes it, `clear` destructures off a `MouseEvent` instead of the
  expected options shape, silently evaluating to `false` every time
  (harmless, since that's already the default). Separately, the same
  file's `renderActions` is a `React.useCallback` with **no second
  argument at all** — a real pre-existing omission (recreates the callback
  on every render, no memoization ever happens) that TypeScript's stricter
  `useCallback` signature won't compile without an explicit deps argument;
  cast `undefined as unknown as React.DependencyList` to preserve the
  "recreate every render" behavior exactly rather than supplying a real
  (behavior-changing) dependency array.
- Self-caught: `List component="nav"` and `ListItem`/`Popover` in this
  batch's `SelectEntryTaskDialog.tsx` needed **no** version-mismatch cast
  at all — initially added one out of habit (pattern-matching the
  MUI-v4-vs-v5 precedent from other batches) before checking two other
  already-converted files in this repo that use the identical
  `<List component="nav">` uncast and compile fine; removed the
  unnecessary cast rather than leaving harmless-but-misleading dead code.
- `TaskTable.tsx`'s `<DataGrid>` call spreads `dataGridOptions`
  (`lodash/fp`'s `_.merge(settings, tableProps)`) *after* also explicitly
  listing `columns`/`controls`/`rows` as literal JSX attributes that the
  spread's own keys already cover — the same `TS2783` "duplicate
  attribute" pattern from earlier batches; fixed by folding the
  literal-but-overridden attributes into their own leading spread object
  (preserves the exact same final attribute-precedence order: the later
  `dataGridOptions` spread still wins, since JSX spread order is
  unchanged) rather than restructuring the actual prop values.
- Lazy-loaded sibling components (`TaskListSearch` inside `TaskTable.tsx`)
  needed the loose-cast applied to the `React.lazy(...)` binding itself
  (`as unknown as React.ComponentType<Record<string, unknown>>`), not to
  the props being passed at each JSX call site — casting only the call
  site's spread still fails, because a `Record<string, unknown>` spread
  doesn't satisfy a lazily-loaded component's real (specific) required
  props from TS's point of view. Same underlying fix already used
  elsewhere in this migration for `React.lazy` components, just easy to
  reach for the wrong end of it first.
- Self-caught, twice in a row: added
  `// eslint-disable-next-line react-hooks/exhaustive-deps` comments out
  of old habit despite already knowing (from the prior `cabinet-front`
  batch) that this project's `lint:types` config doesn't register the
  `react-hooks` plugin — caught both times before running `lint:types`
  and removed all seven instances (five in `TaskTable.tsx`/`TaskListSearch.tsx`,
  plus two `@typescript-eslint/no-unused-vars` disables in the module's
  own `index.tsx` that were equally unnecessary — those unused-nav-icon
  imports are already an accepted, tolerated warning pattern throughout
  this whole migration, not something to suppress file-by-file).
- `MyTaskNavigation`/`UnitTaskNavigation`/`WorkOutlineIcon` in the module's
  top-level `index.tsx` are unused on purpose — the entire `navigation`
  array is commented out in the original source (confirmed: this exact
  "defined but never used" warning trio already existed in this session's
  very first `lint` baseline, before any conversion work touched this
  file). Preserved exactly, comments and all.

All 5 checks pass in both admin-front and cabinet-front (typecheck clean
except admin-front's 6 pre-existing out-of-scope errors; lint:types/lint
clean, 0 errors; 404/400 tests pass; both builds succeed). No
circular-import regressions — the one `components/JsonSchema/elements/StringElement`
import (`TaskListSearch.tsx`) is a one-directional leaf cast, same as many
prior precedents.

## Eighty-eighth batch: `components/cabinet-front/src/application/modules/*` — `tasks`, round 2 of N: `pages/Task/` (48 files)

Finishes `cabinet-front`'s `tasks` module (and with it, `application/modules/*`
in BOTH apps is now fully TypeScript — see "Next stages" below). This round:
the whole `pages/Task/` subtree — the task detail/edit/preview flow, the
largest remaining piece of either app's module layer.

- A dependency-upgrade crisis (React 19 / MUI 6 / Redux 5, documented
  separately) interrupted this batch partway through. The two largest,
  most complex files — `pages/Task/index.tsx` (the task-page controller,
  ~1400 lines) and `screens/EditScreen/index.tsx` (the edit-flow
  controller, ~2000 lines) — had been mechanically renamed `.jsx`→`.tsx`
  with only `// @ts-nocheck` and a blanket `eslint-disable
  @typescript-eslint/no-explicit-any` added on top, as a transitional
  stopgap, rather than genuinely typed. This was the only `@ts-nocheck` in
  the entire migration (500+ files across 87 prior batches) — flagged to
  the user rather than quietly writing it into the historical record, and
  fixed for real afterward at the user's direction ("properly type both
  now"): both files were rewritten with real `Props`/`State` interfaces,
  a shared local `TaskEntity`/`TemplateEntity`/`*Data` shape (each file
  defines its own copy — same "local, not shared" precedent as
  `WorkflowData` in admin-front's `Workflow/index.tsx`), and per-method
  parameter/return types throughout. `@ts-nocheck` and the blanket
  `any`-disable are gone from both files; the small number of remaining
  `any`s are limited to genuinely dynamic legacy call sites and match this
  migration's normal density.
- `evaluate()` (shared, already-typed helper) returns `unknown`, so every
  one of the many `evaluate(...)` call sites across both files needed a
  targeted cast (`as string`, or a `Error & {commit?: ...}` cast after an
  `instanceof Error` check) rather than one blanket fix — same pattern
  established earlier this session for helper files that wrap `evaluate`.
- `actions.externalReaderCheckData`'s return type is a real union
  (`{requestId?; status?; error?; data?} | Error`). Two nearby branches in
  `EditScreen`'s `checkFunc` both narrow away the `Error` case across
  *separate* `if` statements (`if (result instanceof Error && ignore)
  return; if (result instanceof Error && !ignore) {...; return true;}`)
  — logically exhaustive, but TS can't see the cross-branch exhaustiveness
  from two independent conditionals. Cast to the success type once,
  immediately after, with a comment explaining why, rather than
  restructuring the original branching.
- `getActiveStep()` in `EditScreen` originally read
  `taskSteps[taskId] || (steps.includes(stepId) ? steps.indexOf(stepId) : null)`
  — rewritten as an explicit `if`/return rather than `??`/`||` chaining,
  because `taskId && taskSteps[taskId]` typed as `string | number | ""`
  in a way `??` couldn't cleanly resolve to `number | null`. Same runtime
  behavior (falls through to the steps-based lookup exactly when
  `taskSteps[taskId]` is unset), just spelled out instead of chained.
- Self-caught during the real-typing pass: `HeaderInfo.tsx`'s
  module-scope `isItemShown` reads a bare `document.data` — since this
  function is declared outside the component body, `document` resolves to
  the browser's global `Document` object (no `.data` property), not the
  task document read inside the component itself. A genuine pre-existing
  bug (`row.hidden` is always evaluated against `undefined`), preserved
  exactly rather than "fixed" — changing it would alter which rows show
  or hide today.
- Also self-caught: the same `HeaderInfo.tsx` renders a `key`-bearing
  `<ListItem>` inside a keyless `<React.Fragment>` in a `.map()` — React
  already warns about the missing key on the fragment in the original
  source; preserved with a comment rather than "fixed" by moving the key,
  since that's an intentional-looking (if imperfect) existing choice, not
  something this migration's scope covers.
- `EditScreenLayout`'s export (already TypeScript from an earlier part of
  this same round) collapses to a zero-prop component type — `translate()`'s
  generic can't be inferred through its own internal `as any` cast, same
  class of issue as the `React.lazy()`-wrapped screens already cast
  elsewhere in these two files. Widened at the *import* site in
  `EditScreen/index.tsx` (`as unknown as React.ComponentType<Record<string,
  unknown>>`) rather than touching the already-converted layout file.

All 5 checks pass in both admin-front and cabinet-front (typecheck clean
in both; lint:types/lint clean, 0 errors, only pre-existing warnings;
404/404 admin-front tests pass; cabinet-front 399/400, the one failure
being the pre-existing, unrelated `checkAccess.vitest.ts` cross-app
resolution divergence documented separately; both builds succeed).

## Next stages

**`application/modules/*` is now fully converted to TypeScript in BOTH
apps.** admin-front: all 20 module directories (~300 files) across
batches "Seventy-first" through "Eighty-second," including the `workflow`
module's BPMN diagram editor — the largest and most complex single
subtree converted this session, split into 3 rounds (and further
sub-rounds for `pages/Workflow/` itself) due to size. cabinet-front: all
module directories (~225 files) across batches "Eighty-third" through
"Eighty-eighth," including its own `tasks` module split into 2 rounds for
the same reason. `components/JsonSchema/*` (shared, used by both apps) is
likewise fully converted: every file under `elements/`, `editor/`, and the
top-level directory, except `ChangeEvent.js` (already TypeScript-compatible
via `allowJs` inference, no conversion needed); `editor-old/` (81 files,
confirmed dead) was deleted rather than migrated.

**What's left there**: nothing — both apps' `application/modules/*` trees
are fully converted, and so is `components/JsonSchema/*`. Combined with
`packages/front-core` already being fully converted (batches "First"
through "Seventieth," aside from the intentionally-untouched files noted
earlier), this whole JS→TS migration's original scope is complete.

Beyond that: removing legacy MUI styling and verifying older React
wrappers now that React 19 / MUI 6 / Redux 5 have already been upgraded
(see "React 19 / MUI 6 / Redux 5 dependency upgrade" below); Redux and
routing upgrades (react-router v6, history v5) remain separate changes
from this typing work.

## React 19 / MUI 6 / Redux 5 dependency upgrade (separate from the JS→TS migration)

Not a JS→TS batch — recorded here anyway since it's the only place this
project's engineering history is written down, and it interrupted batch
"Eighty-seventh"/"Eighty-eighth" partway through. A concurrent, unrelated
process had bumped both apps' declared dependencies (React 18→19, MUI
5→6, `react-redux` 7→9, `redux` 4→5, `redux-thunk` 2→3) but left
`node_modules` in a broken, half-installed state in both apps (discovered
while verifying a `tasks` batch's tests). At the user's direction ("leave
cabinet-front fully upgraded, pause JS→TS work"), both apps were brought
to a consistent, fully-installed state via `npm install --legacy-peer-deps`,
and every resulting real break was fixed:

- **A genuine, live production bug, not just a type error**: `redux-thunk`
  v3 dropped its default export (now only named `{thunk,
  withExtraArgument}`). The old `import thunk from 'redux-thunk'` silently
  resolved `thunk` to the whole module-namespace object instead of the
  actual middleware function — confirmed via an actual test failure
  (`TypeError: middleware is not a function`), not just a typecheck error.
  Fixed in `store/configureStore.ts` (both apps' real bootstrap) by
  switching to the named import.
- **React 19 ref-typing changes**, fixed throughout `packages/front-core`:
  `useRef<T>(null)` now returns `RefObject<T | null>` even with an
  explicit generic (widened every affected prop/field type rather than
  fighting it); `useRef<T>()` with no initial value is no longer valid
  (added explicit initial values); ref callbacks may no longer return a
  non-void value, which broke a few `ref={(el) => (arr[i] = el)}`-style
  assignment-expression callbacks (wrapped in a block body) and one
  `async` ref callback in `StimulSoft/ReportContainer.tsx` (moved the
  async work into an inner fire-and-forget function instead).
- **MUI v6 removed `ListItem`'s `button`/`disabled`/`selected` props**
  (interactive list items are meant to use `ListItemButton` now). Fixed
  via the established "spread-cast to preserve exact behavior" pattern
  (`{...({button: true, ...} as unknown as Record<string, unknown>)}`)
  rather than migrating to `ListItemButton`, since that would be a real
  DOM-structure/behavior change outside this fix's scope.
- **`@mui/x-tree-view` v7 real API changes** (`nodeId`→`itemId`,
  `defaultCollapseIcon`/`defaultExpandIcon` moved from tree-level to a
  per-item `slots` prop, `defaultExpanded`→`defaultExpandedItems`) —
  treated as a real migration, not a cast, since the old props are
  genuinely gone rather than merely deprecated.
- **`React.ReactElement` with no generic now defaults `props` to
  `unknown`** (was `any`), breaking `.props.x` reads and
  `React.cloneElement(el, {...})` calls in a handful of shared components
  — fixed by giving the element an explicit props-shape generic at each
  site.
- Two genuinely missing runtime dependencies, masked until now by
  accidental transitive hoisting from webpack's toolchain (this repo is
  mid-migration off webpack onto Vite on this branch): `mime-types` and
  `@react-pdf/renderer`, plus several more in cabinet-front only
  (`@lifayt/material-ui-chip-input`, `filesize`, `immutability-helper`,
  `js-beautify`, `react-markdown`, `react-syntax-highlighter`,
  `remark-gfm`, `terser`) — `packages/front-core`'s own `package.json`
  `dependencies` field is the authoritative list of what its consumers
  need; every app-declared dependency list was reconciled against it and
  the gaps added for real (not shimmed), since these files are genuinely
  reachable in each app's real bundle graph, confirmed via `vite build`
  actually failing to resolve them before the fix.
- One pre-existing, out-of-scope issue surfaced by this work rather than
  caused by it: `checkAccess.vitest.ts` (shared, in `packages/front-core`)
  fails specifically under cabinet-front's test run, because the bare
  specifier `helpers/checkAccess` resolves to cabinet-front's own,
  separately-diverged `src/application/helpers/checkAccess.ts` (which
  wraps its `isLegalUser` case in `Boolean(...)`) instead of front-core's
  raw-passthrough version the shared test was written against — the same
  class of cross-app resolution quirk documented earlier this session for
  `theme`/`formElements`/`muiIcons`. Left as-is and flagged rather than
  guessing which of the two diverged implementations is the intended one.

All 5 checks pass in both apps after this work (typecheck, lint:types,
lint all 0 errors; admin-front 404/404 tests, cabinet-front 399/400 with
only the `checkAccess` issue above; both builds succeed).
