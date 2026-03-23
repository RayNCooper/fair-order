// ── Payment Provider Abstraction ──
// Supports 2 providers via PAYMENT_PROVIDER env var:
//   "stripe" — Stripe payment processing
//   "cash"   — Cash at till (default, no-op)

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  clientSecret?: string;
  error?: string;
}

interface CreatePaymentIntentOptions {
  amount: number; // cents
  currency: string; // "eur"
  orderId: string;
  customerName: string;
  metadata?: Record<string, string>;
}

// ── Provider implementations ──

function createCashIntent(options: CreatePaymentIntentOptions): PaymentResult {
  return {
    success: true,
    transactionId: `cash_${options.orderId}`,
  };
}

function verifyCashPayment(): boolean {
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: any = null;

async function getStripeClient() {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe. " +
        "Set it in your .env file."
    );
  }

  const { default: Stripe } = await import("stripe");
  _stripe = new Stripe(secretKey);
  return _stripe;
}

async function createStripeIntent(
  options: CreatePaymentIntentOptions
): Promise<PaymentResult> {
  try {
    const stripe = await getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: options.amount,
      currency: options.currency,
      metadata: {
        orderId: options.orderId,
        customerName: options.customerName,
        ...options.metadata,
      },
    });

    return {
      success: true,
      transactionId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
    };
  } catch (error) {
    console.error("Failed to create Stripe PaymentIntent:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Zahlungsdienst nicht erreichbar.",
    };
  }
}

async function verifyStripePayment(
  transactionId: string
): Promise<boolean> {
  try {
    const stripe = await getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
    return paymentIntent.status === "succeeded";
  } catch (error) {
    console.error("Failed to verify Stripe payment:", error);
    return false;
  }
}

// ── Public API ──

function getProvider(): string {
  return process.env.PAYMENT_PROVIDER ?? "cash";
}

export async function createPaymentIntent(
  options: CreatePaymentIntentOptions
): Promise<PaymentResult> {
  const provider = getProvider();

  switch (provider) {
    case "stripe":
      return createStripeIntent(options);
    case "cash":
      return createCashIntent(options);
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER: "${provider}". Use "stripe" or "cash".`
      );
  }
}

export async function verifyPayment(
  transactionId: string
): Promise<boolean> {
  const provider = getProvider();

  switch (provider) {
    case "stripe":
      return verifyStripePayment(transactionId);
    case "cash":
      return verifyCashPayment();
    default:
      return false;
  }
}

export function isStripeEnabled(): boolean {
  return getProvider() === "stripe" && !!process.env.STRIPE_SECRET_KEY;
}
