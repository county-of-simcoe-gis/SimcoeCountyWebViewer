## Development

- Install dependencies: `npm install`
- Run dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Testing

- Unit tests (Vitest + React Testing Library + MSW):

  - Run all: `npm test`
  - Watch: `npm run test:watch`
  - UI: `npm run test:ui`

- E2E tests (Playwright):
  - Run: `npm run e2e`

Notes:

- Tests run in JSDOM. Global setup is in `src/test/setup.ts` and uses MSW (`src/test/testServer.ts`).
- Path alias `@/*` is supported in tests via `vitest.config.ts`.
