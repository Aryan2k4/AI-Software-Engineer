#!/usr/bin/env python3
"""
heartbeat.py — Database heartbeat cron (S7)

Pings /health every 6 days to prevent Supabase free-tier auto-pause.
Run via cron: 0 0 */6 * * python scripts/heartbeat.py

Or as a GitHub Actions scheduled workflow (see .github/workflows/heartbeat.yml).
"""
import os
import sys
import urllib.request
import urllib.error

API_URL = os.getenv("HEARTBEAT_URL", "http://localhost:8000/health")


def ping() -> bool:
    try:
        req = urllib.request.urlopen(API_URL, timeout=30)
        status = req.status
        print(f"[heartbeat] {API_URL} → HTTP {status}")
        return status == 200
    except urllib.error.URLError as e:
        print(f"[heartbeat] FAILED: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    ok = ping()
    sys.exit(0 if ok else 1)
