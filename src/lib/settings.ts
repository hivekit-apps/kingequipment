import { createServiceClient } from './supabase/service';

export interface KirilSettings {
  tax_rate: number;
  deposit_pct: number;
  discounts_google_review_enabled: boolean;
  discounts_google_review_pct: number;
  etransfer_recipient_email: string;
}

const DEFAULTS: KirilSettings = {
  tax_rate: 0.13,
  deposit_pct: 0.2,
  discounts_google_review_enabled: true,
  discounts_google_review_pct: 0.05,
  etransfer_recipient_email: 'kingequipmentrental.ca@gmail.com',
};

const KEY_MAP: Record<string, keyof KirilSettings> = {
  tax_rate: 'tax_rate',
  deposit_pct: 'deposit_pct',
  'discounts.google_review_enabled': 'discounts_google_review_enabled',
  'discounts.google_review_pct': 'discounts_google_review_pct',
  etransfer_recipient_email: 'etransfer_recipient_email',
};

export async function loadSettings(): Promise<KirilSettings> {
  const svc = createServiceClient();
  const { data, error } = await svc.from('kiril_settings').select('key, value');
  if (error || !data) return { ...DEFAULTS };
  const result: KirilSettings = { ...DEFAULTS };
  for (const row of data as Array<{ key: string; value: unknown }>) {
    const mapped = KEY_MAP[row.key];
    if (!mapped) continue;
    (result as unknown as Record<string, unknown>)[mapped] = row.value;
  }
  return result;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const svc = createServiceClient();
  await svc.from('kiril_settings').upsert({ key, value, updated_at: new Date().toISOString() });
}
