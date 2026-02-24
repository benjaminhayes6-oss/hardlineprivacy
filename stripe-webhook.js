import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

let _stripe;

function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function txt(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    },
    body: String(body)
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST")
    return txt(405, "Method Not Allowed");

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET)
    return txt(500, "Missing STRIPE_WEBHOOK_SECRET");

  if (!process.env.STRIPE_SECRET_KEY)
    return txt(500, "Missing STRIPE_SECRET_KEY");

  const stripe = getStripe();
  const sig = event.headers["stripe-signature"];

  if (!sig)
    return txt(400, "Missing Stripe-Signature");

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : event.body;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      raw,
      sig,
      WEBHOOK_SECRET
    );
  } catch (e) {
    console.error("Signature verification failed", e.message);
    return txt(
      400,
      `Webhook signature verification failed: ${e.message}`
    );
  }

  try {
    switch (stripeEvent.type) {

      case "checkout.session.completed": {
        const s = stripeEvent.data.object;

        const email =
          s.customer_details?.email ||
          s.customer_email ||
          (s.customer
            ? await emailFromCustomer(s.customer)
            : null);

        if (email) {
          const plan = s.metadata?.plan || null;
          await setEntitlement(email, true, plan, {
            source: "checkout.session.completed"
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;

        const email = await emailFromCustomer(sub.customer);

        if (email) {
          const first = sub.items?.data?.[0];

          const plan =
            sub.metadata?.plan ||
            first?.price?.nickname ||
            first?.price?.id ||
            null;

          const active = [
            "active",
            "trialing",
            "past_due"
          ].includes(sub.status);

          await setEntitlement(email, active, plan, {
            status: sub.status,
            source: stripeEvent.type
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;

        const email = await emailFromCustomer(sub.customer);

        if (email) {
          await setEntitlement(email, false, null, {
            status: sub.status,
            source: "customer.subscription.deleted"
          });
        }
        break;
      }

      case "invoice.paid": {
        const inv = stripeEvent.data.object;

        if (inv.customer) {
          const email = await emailFromCustomer(inv.customer);

          if (email) {
            const first = inv.lines?.data?.[0];

            const plan =
              inv.metadata?.plan ||
              first?.price?.nickname ||
              first?.price?.id ||
              null;

            await setEntitlement(email, true, plan, {
              source: "invoice.paid"
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = stripeEvent.data.object;

        if (inv.customer) {
          const email = await emailFromCustomer(inv.customer);

          if (email) {
            const first = inv.lines?.data?.[0];

            const plan =
              inv.metadata?.plan ||
              first?.price?.nickname ||
              first?.price?.id ||
              null;

            await setEntitlement(email, false, plan, {
              reason: "payment_failed",
              source: "invoice.payment_failed"
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return txt(200, "ok");

  } catch (e) {
    console.error("Webhook error", e);
    return txt(500, "Server error");
  }
}

async function emailFromCustomer(customerId) {
  const c = await getStripe().customers.retrieve(customerId);

  return (
    c.email ||
    c?.invoice_settings?.default_payment_method?.billing_details
      ?.email ||
    null
  );
}

async function setEntitlement(
  email,
  entitled,
  plan,
  extra = {}
) {
  const store = getStore("entitlements");

  const key = email.toLowerCase();

  const record = {
    email: key,
    entitled: !!entitled,
    plan: plan || null,
    updatedAt: new Date().toISOString(),
    ...extra
  };

  await store.set(key, JSON.stringify(record));
}