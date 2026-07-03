# ADR-005: Export Status via Supabase Realtime (Polling Fallback)

**Status:** Accepted  
**Date:** 2026-03-01

## Context

Export processing is asynchronous (PDF generation can take 5–30 seconds). The frontend needs live status updates without constant user-initiated refreshes.

## Decision

`useExportStatus` hook uses a two-tier strategy:

1. **Primary:** Supabase Realtime channel subscribed to `exports` table filtered by `id`.  
   - Zero polling overhead when Realtime works.
   - Instant updates (sub-second latency).

2. **Fallback:** 3-second polling via `GET /api/v1/exports/{id}` if Realtime doesn't connect within 5 seconds.  
   - Handles environments where WebSocket is blocked.
   - Automatically stops when export reaches terminal state.

Polling stops as soon as Realtime fires its first event.

## Consequences

- Works in all network environments (corporate proxies, old browsers).
- Supabase Realtime must have `exports` table added to its publication.
- `useExportStatus` accepts `null` to disable subscription when status is already terminal.
