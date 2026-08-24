import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

// Liveness + readiness for the container healthcheck (DEPLOY.md). Public on
// purpose: it is what Caddy, compose and a human with curl ask before
// trusting a deploy. It leaks nothing, which is why the failure branch says
// "down" rather than echoing the driver's error.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "up" }, { headers: NO_STORE });
  } catch {
    // 503, not 500: this is "not ready yet", which is what an orchestrator
    // needs to hear while Postgres is still starting.
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: NO_STORE });
  }
}

const NO_STORE = { "Cache-Control": "no-store" };
