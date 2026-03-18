/**
 * POST /api/stripe/webhook
 * Handle Stripe subscription lifecycle events.
 *
 * Events handled:
 *   checkout.session.completed       → activate subscription
 *   customer.subscription.updated    → update expires_at
 *   customer.subscription.deleted    → downgrade to free
 *   invoice.payment_failed           → start 7-day grace period
 *
 * Phase 3 — MON-1201
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const GRACE_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
      // In Stripe API 2026+, current_period_end lives on each subscription item
      const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;
      const expiresAt = new Date(periodEnd * 1000).toISOString();

      await admin.from("profiles").update({
        subscription_tier: "premium",
        subscription_expires_at: expiresAt,
        stripe_subscription_id: subscription.id,
      }).eq("id", userId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdFromCustomer(admin, sub.customer as string);
      if (!userId) break;

      const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
      const expiresAt = new Date(periodEnd * 1000).toISOString();
      const active = sub.status === "active" || sub.status === "trialing";

      await admin.from("profiles").update({
        subscription_tier: active ? "premium" : "free",
        subscription_expires_at: active ? expiresAt : null,
        stripe_subscription_id: sub.id,
      }).eq("id", userId);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdFromCustomer(admin, sub.customer as string);
      if (!userId) break;

      await admin.from("profiles").update({
        subscription_tier: "free",
        subscription_expires_at: null,
        stripe_subscription_id: null,
      }).eq("id", userId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = await getUserIdFromCustomer(admin, invoice.customer as string);
      if (!userId) break;

      // Grace period: extend expiry by 7 days from now
      const gracePeriodEnd = addDays(new Date(), GRACE_DAYS).toISOString();
      await admin.from("profiles").update({
        subscription_expires_at: gracePeriodEnd,
      }).eq("id", userId);
      break;
    }

    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}

async function getUserIdFromCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id ?? null;
}
