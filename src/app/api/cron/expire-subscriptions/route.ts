/**
 * GET /api/cron/expire-subscriptions
 * Cron job: expire overdue subscriptions and send reminder emails to Mongoori Riders.
 *
 * Call this daily via Coolify cron or Vercel cron.
 * Auth: Bearer CRON_SECRET
 *
 * Jobs:
 *  1. Downgrade expired mongoori_rider / premium subscriptions to free
 *  2. Send 30-day, 7-day, 0-day expiry emails to Mongoori Riders
 *
 * Phase 3 — MON-1201
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function inWindow(date: Date, daysUntil: number): boolean {
  const target = daysFromNow(daysUntil);
  const windowStart = new Date(target);
  const windowEnd = new Date(target);
  windowStart.setHours(0, 0, 0, 0);
  windowEnd.setHours(23, 59, 59, 999);
  return date >= windowStart && date <= windowEnd;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Downgrade expired subscriptions
  const { data: expired, error: expiredErr } = await admin
    .from("profiles")
    .select("id, subscription_tier, subscription_expires_at, email")
    .in("subscription_tier", ["mongoori_rider", "premium"])
    .lt("subscription_expires_at", now);

  if (expiredErr) {
    console.error("[cron] expire query error:", expiredErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  let downgraded = 0;
  for (const p of expired ?? []) {
    await admin
      .from("profiles")
      .update({ subscription_tier: "free", subscription_expires_at: null })
      .eq("id", p.id);
    downgraded++;
  }

  // 2. Expiry reminder emails for mongoori_rider tier
  const { data: riders } = await admin
    .from("profiles")
    .select("id, email, subscription_expires_at")
    .eq("subscription_tier", "mongoori_rider")
    .not("subscription_expires_at", "is", null);

  const reminders = { day30: 0, day7: 0, day0: 0 };

  for (const rider of riders ?? []) {
    if (!rider.subscription_expires_at || !rider.email) continue;
    const expiresAt = new Date(rider.subscription_expires_at);

    const subject30 = "Premium 혜택이 30일 후 만료됩니다";
    const subject7 = "Premium 혜택이 7일 후 만료됩니다 — 연간 플랜 $99로 계속하기";
    const subject0 = "오늘부터 Free 플랜으로 전환됩니다. 지금 업그레이드하세요.";

    if (inWindow(expiresAt, 30)) {
      await sendReminderEmail(rider.email, subject30, 30);
      reminders.day30++;
    } else if (inWindow(expiresAt, 7)) {
      await sendReminderEmail(rider.email, subject7, 7);
      reminders.day7++;
    } else if (inWindow(expiresAt, 0)) {
      await sendReminderEmail(rider.email, subject0, 0);
      reminders.day0++;
    }
  }

  console.log(`[cron] expire-subscriptions: downgraded=${downgraded}, reminders=`, reminders);
  return NextResponse.json({ downgraded, reminders });
}

/**
 * Send expiry reminder email via Resend (or log if not configured).
 * Resend API key should be set as RESEND_API_KEY.
 */
async function sendReminderEmail(email: string, subject: string, daysLeft: number) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[cron] Would send email to ${email}: "${subject}"`);
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tax.mongoori.com";
  const body = daysLeft === 0
    ? `오늘부로 Mongoori Rides 무료 Premium 혜택이 만료되어 Free 플랜으로 전환되었습니다.\n\n연간 플랜 $99/년으로 계속 사용하세요: ${siteUrl}/dashboard/billing`
    : `Mongoori Rides 무료 Premium 혜택이 ${daysLeft}일 후 만료됩니다.\n\n만료 전에 연간 플랜 $99/년으로 업그레이드하면 중단 없이 이용할 수 있습니다: ${siteUrl}/dashboard/billing`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "tax@mongoori.com",
        to: email,
        subject,
        text: body,
      }),
    });
  } catch (err) {
    console.error(`[cron] Failed to send email to ${email}:`, err);
  }
}
