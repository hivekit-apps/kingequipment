import type { Booking, Equipment } from './booking-db';

interface CalendarEntry {
  uid: string;
  summary: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD (inclusive rental end; iCal DTEND is exclusive)
  location?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

function toICSDate(iso: string): string {
  return iso.replace(/-/g, ''); // YYYYMMDD (all-day)
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function escapeICS(s: string): string {
  return s.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545: lines >75 octets should be folded with CRLF + space.
  const out: string[] = [];
  while (line.length > 74) {
    out.push(line.slice(0, 74));
    line = ' ' + line.slice(74);
  }
  out.push(line);
  return out.join('\r\n');
}

export function buildICS(entries: CalendarEntry[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//King Equipment Rental//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:King Equipment Rental — Bookings',
    'X-WR-TIMEZONE:America/Toronto',
  ];
  for (const e of entries) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${toICSDate(e.start_date)}`);
    // iCal DTEND is exclusive; add 1 day so end_date is included.
    lines.push(`DTEND;VALUE=DATE:${toICSDate(addDays(e.end_date, 1))}`);
    lines.push(foldLine(`SUMMARY:${escapeICS(e.summary)}`));
    if (e.description) lines.push(foldLine(`DESCRIPTION:${escapeICS(e.description)}`));
    if (e.location) lines.push(foldLine(`LOCATION:${escapeICS(e.location)}`));
    lines.push(`STATUS:${e.status ?? 'CONFIRMED'}`);
    lines.push(`TRANSP:OPAQUE`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function bookingToCalendarEntry(booking: Booking, equipment: Equipment): CalendarEntry {
  const zoneLabel = booking.delivery_zone === 'king-township' ? 'King Twp' : booking.delivery_zone === 'gta' ? 'GTA' : 'Southern ON';
  const summary = `${equipment.short_name} → ${booking.customer_name} (${zoneLabel})`;
  const description = [
    `Customer: ${booking.customer_name}`,
    `Email:    ${booking.customer_email}`,
    booking.customer_phone ? `Phone:    ${booking.customer_phone}` : '',
    `Address:  ${booking.customer_address}`,
    `Zone:     ${zoneLabel}`,
    booking.operator ? `Operator: YES (add-on)` : '',
    booking.notes ? `Notes:    ${booking.notes}` : '',
    `Status:   ${booking.status}`,
    `Booking:  ${booking.id.slice(0, 8)}`,
  ].filter(Boolean).join('\\n');
  return {
    uid: `booking-${booking.id}@kingequipmentrental.ca`,
    summary,
    description,
    start_date: booking.start_date,
    end_date: booking.end_date,
    location: booking.customer_address,
    status: booking.status === 'confirmed' ? 'CONFIRMED' : booking.status === 'pending' ? 'TENTATIVE' : 'CANCELLED',
  };
}

export function blockedToCalendarEntry(equipmentShortName: string, date: string, reason?: string): CalendarEntry {
  return {
    uid: `blocked-${equipmentShortName}-${date}@kingequipmentrental.ca`,
    summary: `${equipmentShortName} — blocked${reason ? ` (${reason})` : ''}`,
    description: reason ?? 'Manual block',
    start_date: date,
    end_date: date,
    status: 'CONFIRMED',
  };
}
