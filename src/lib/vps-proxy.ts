// VPS-proxy helper — routes admin-only calls through hivekit VPS so secrets
// (Supabase service-role, Resend API key for auth emails) stay off Vercel.
// See vps-proxy/CLAUDE.md for the endpoint catalog.

const VPS_PROXY_URL = process.env.VPS_PROXY_URL?.trim();
const VPS_PROXY_KEY = process.env.VPS_PROXY_KEY?.trim();

async function proxyCall(endpoint: string, body: Record<string, unknown>, timeoutMs = 30000): Promise<Response> {
  if (!VPS_PROXY_URL || !VPS_PROXY_KEY) {
    throw new Error(`VPS proxy not configured (VPS_PROXY_URL=${!!VPS_PROXY_URL}, VPS_PROXY_KEY=${!!VPS_PROXY_KEY})`);
  }
  const url = `${VPS_PROXY_URL}${endpoint}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Proxy-Key': VPS_PROXY_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function proxySupabaseAdmin(
  method: string,
  path: string,
  payload?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; data: unknown }> {
  const res = await proxyCall('/proxy/supabase/admin', { method, path, payload, headers }, 30000);
  const data = (await res.json()) as unknown;
  return { status: res.status, data };
}

export async function proxyResendEmail(to: string, subject: string, html: string): Promise<void> {
  await proxyCall('/proxy/resend/email', { to, subject, html }, 15000);
}

export async function proxyResendFetchReceived(emailId: string): Promise<{ status: number; data: unknown }> {
  const res = await proxyCall('/proxy/resend/receiving', { email_id: emailId }, 15000);
  const data = (await res.json()) as unknown;
  return { status: res.status, data };
}

export function isProxyConfigured(): boolean {
  return !!(VPS_PROXY_URL && VPS_PROXY_KEY);
}
