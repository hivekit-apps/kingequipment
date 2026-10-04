import { createServiceClient } from './supabase/service';

export type BookingStatus = 'pending' | 'confirmed' | 'denied' | 'completed' | 'cancelled';
export type DeliveryZone = 'king-township' | 'gta' | 'other';
export type AvailabilityStatus = 'booked' | 'blocked' | 'maintenance';
export type AvailabilitySource = 'manual' | 'booking';

export interface Equipment {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  daily_rate_cents: number;
  weekly_rate_cents: number | null;
  monthly_rate_cents: number | null;
  operator_daily_rate_cents: number | null;
  active: boolean;
}

export interface Booking {
  id: string;
  equipment_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  operator: boolean;
  delivery_zone: DeliveryZone;
  notes: string | null;
  status: BookingStatus;
  google_calendar_event_id: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  denied_at: string | null;
  denied_by: string | null;
  denied_reason: string | null;
  source: string | null;
  ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  equipment_id: string;
  date: string;
  status: AvailabilityStatus;
  source: AvailabilitySource;
  reason: string | null;
  booking_id: string | null;
}

export async function getActiveEquipment(): Promise<Equipment[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_equipment')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error || !data) return [];
  return data as Equipment[];
}

export async function getEquipmentBySlug(slug: string): Promise<Equipment | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_equipment')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as Equipment;
}

export async function createBooking(payload: Omit<Booking, 'id' | 'status' | 'google_calendar_event_id' | 'confirmed_at' | 'confirmed_by' | 'denied_at' | 'denied_by' | 'denied_reason' | 'created_at' | 'updated_at'>): Promise<Booking | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_bookings')
    .insert({
      ...payload,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error || !data) {
    console.error('[booking-db] createBooking failed:', error?.message);
    return null;
  }
  return data as Booking;
}

export async function getBooking(id: string): Promise<Booking | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from('kiril_bookings').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Booking;
}

export async function listBookings(opts?: { status?: BookingStatus; limit?: number }): Promise<Booking[]> {
  const svc = createServiceClient();
  let q = svc.from('kiril_bookings').select('*').order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Booking[];
}

export async function confirmBooking(id: string, confirmedBy: string): Promise<Booking | null> {
  const svc = createServiceClient();
  const booking = await getBooking(id);
  if (!booking) return null;
  if (booking.status !== 'pending') {
    console.warn('[booking-db] confirmBooking called on non-pending booking:', id, booking.status);
    return booking;
  }
  const { data, error } = await svc
    .from('kiril_bookings')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: confirmedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return null;
  // Reserve availability rows for the booking dates.
  await reserveBookingDates(data as Booking);
  return data as Booking;
}

export async function denyBooking(id: string, deniedBy: string, reason: string): Promise<Booking | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_bookings')
    .update({
      status: 'denied',
      denied_at: new Date().toISOString(),
      denied_by: deniedBy,
      denied_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .single();
  if (error || !data) return null;
  return data as Booking;
}

export async function reserveBookingDates(booking: Booking): Promise<void> {
  const svc = createServiceClient();
  const dates = enumerateDates(booking.start_date, booking.end_date);
  const rows = dates.map((d) => ({
    equipment_id: booking.equipment_id,
    date: d,
    status: 'booked' as AvailabilityStatus,
    source: 'booking' as AvailabilitySource,
    booking_id: booking.id,
  }));
  const { error } = await svc.from('kiril_availability').upsert(rows, { onConflict: 'equipment_id,date' });
  if (error) console.error('[booking-db] reserveBookingDates failed:', error.message);
}

export async function blockDates(equipmentId: string, dates: string[], reason: string): Promise<void> {
  const svc = createServiceClient();
  const rows = dates.map((d) => ({
    equipment_id: equipmentId,
    date: d,
    status: 'blocked' as AvailabilityStatus,
    source: 'manual' as AvailabilitySource,
    reason,
  }));
  const { error } = await svc.from('kiril_availability').upsert(rows, { onConflict: 'equipment_id,date' });
  if (error) console.error('[booking-db] blockDates failed:', error.message);
}

export async function unblockDate(equipmentId: string, date: string): Promise<void> {
  const svc = createServiceClient();
  // Only remove manual blocks; never remove booking-source rows this way.
  const { error } = await svc
    .from('kiril_availability')
    .delete()
    .eq('equipment_id', equipmentId)
    .eq('date', date)
    .eq('source', 'manual');
  if (error) console.error('[booking-db] unblockDate failed:', error.message);
}

export async function getAvailability(equipmentId: string, from: string, to: string): Promise<Availability[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('kiril_availability')
    .select('*')
    .eq('equipment_id', equipmentId)
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (error || !data) return [];
  return data as Availability[];
}

export function enumerateDates(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
