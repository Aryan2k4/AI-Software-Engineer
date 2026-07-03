# ADR-007: Route-Based Code Splitting via React.lazy

**Status:** Accepted  
**Date:** 2026-04-01

## Context

The initial bundle was ~852KB uncompressed, dominated by Framer Motion, Supabase SDK, Sentry, and all page components loaded eagerly. This delays Time-to-Interactive on the auth page where only the auth form is needed.

## Decision

Each route-level page component is lazy-loaded via `React.lazy` + dynamic `import()`:

```ts
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
```

Vite's `manualChunks` further splits:
- `vendor`: react, react-dom, react-router-dom
- `motion`: framer-motion  
- `supabase`: @supabase/supabase-js
- `sentry`: @sentry/react

A `<Suspense fallback={<PageLoader />}>` wrapper at the router level handles all lazy loads.

## Consequences

- Auth page chunk: ~40KB (only loads auth form + Supabase auth)
- Dashboard deferred until navigation
- Each blueprint section page fetched on demand
- `PublicSharePage` completely separate chunk — unauthenticated users never load Sentry
