// admin-front has no "tasks" module (SuccessMessage is cabinet-front-only) - this stub lets
// vitest resolve front-core's shared Payment/index.vitest.tsx, which admin-front's vitest.config.mjs
// picks up along with every other front-core test.
export default function SuccessMessage() {
  return null;
}
