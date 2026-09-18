import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // Fail loudly during development so a misconfigured env is obvious.
  console.error("[v0] DATABASE_URL is not set. Data persistence will not work.")
}

// Reuse a single pool across hot reloads in development to avoid exhausting
// connections. In production a single module-scoped pool is created once.
const globalForDb = globalThis as unknown as { __pgPool?: Pool }

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString,
    // Neon requires TLS. Recent `pg` versions treat the connection string's
    // `sslmode=require` as `verify-full`, which fails without a bundled CA in
    // this runtime. Setting `ssl` explicitly here overrides that parsing and
    // keeps an encrypted connection without local CA verification.
    ssl: { rejectUnauthorized: false },
    // Keep the pool small; Neon pooled endpoint handles concurrency.
    max: 5,
    // Fail fast instead of holding a hung connection on restrictive networks,
    // corporate proxies, or VPNs. This guarantees server actions resolve
    // (success or error) quickly so the client never waits indefinitely.
    connectionTimeoutMillis: 8000,
    // Drop idle clients quickly so a blocked network doesn't keep stale sockets.
    idleTimeoutMillis: 30000,
    // Abort any single query that runs too long.
    statement_timeout: 8000,
    query_timeout: 8000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool
}

export const db = drizzle(pool, { schema })
