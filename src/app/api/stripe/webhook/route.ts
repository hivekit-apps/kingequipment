export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { markInvoicePaid } from '@/lib/invoice';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const result = await verifyWebhookSignature(raw, sig);
  if (!result.ok) {
    console.error('[stripe-webhook] verify failed:', result.error);
    return NextResponse.json({ error: 'signature verification failed' }, { status: 400 });
  }
  const event = result.event as {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object as Record<string, unknown> | undefined;
    const metadata = session?.metadata as Record<string, string> | undefined;
    const invoiceId = metadata?.invoice_id;
    const paymentIntent = (session?.payment_intent as string | null) ?? null;
    const sessionId = session?.id as string | undefined;
    if (invoiceId) {
      const invoice = await markInvoicePaid(invoiceId, 'stripe', paymentIntent ?? sessionId ?? undefined);
      if (invoice && paymentIntent) {
        const svc = createServiceClient();
        await svc.from('kiril_invoices').update({
          stripe_payment_intent_id: paymentIntent,
          updated_at: new Date().toISOString(),
        }).eq('id', invoiceId);
      }
      console.log('[stripe-webhook] invoice marked paid:', invoiceId);
    }
  }

  return NextResponse.json({ received: true });
}
