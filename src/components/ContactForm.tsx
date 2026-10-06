'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [errorField, setErrorField] = useState<string>('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    setErrorField('');

    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      message: String(fd.get('message') || ''),
      website: String(fd.get('website') || ''), // honeypot
    };

    // Client-side phone digit check (mirrors server rule).
    const phoneDigits = body.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      setErrorMsg('Please enter a phone number (at least 7 digits).');
      setErrorField('phone');
      setStatus('error');
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        field?: string;
      };
      if (!res.ok || data.ok === false) {
        setErrorMsg(data.error || `Request failed (${res.status})`);
        setErrorField(data.field || '');
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-6" role="status">
        <p className="text-base font-bold text-green-900">
          Thanks — we got your message.
        </p>
        <p className="mt-2 text-sm text-green-900">
          We&apos;ll reply within a few hours during business hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-slate-200 rounded-md p-6 space-y-4"
      noValidate
    >
      <h2 className="text-xl font-bold text-slate-950">Send us a message</h2>
      <p className="text-sm text-slate-700">
        Tell us what you need — SKU, dates, delivery address — and we&apos;ll get back
        to you quickly with a quote and availability.
      </p>

      {/* Honeypot — hidden from humans via inline style + aria-hidden */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-950">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          className={`mt-1 block w-full min-h-[48px] rounded-md border px-3 text-base ${errorField === 'name' ? 'border-red-400' : 'border-slate-300'}`}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-950">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={`mt-1 block w-full min-h-[48px] rounded-md border px-3 text-base ${errorField === 'email' ? 'border-red-400' : 'border-slate-300'}`}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className="block text-sm font-semibold text-slate-950">
            Phone
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            minLength={7}
            autoComplete="tel"
            inputMode="tel"
            className={`mt-1 block w-full min-h-[48px] rounded-md border px-3 text-base ${errorField === 'phone' ? 'border-red-400' : 'border-slate-300'}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-950">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          minLength={10}
          placeholder="What do you need? Equipment, dates, delivery city…"
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-base ${errorField === 'message' ? 'border-red-400' : 'border-slate-300'}`}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        data-event="contact_form_submit"
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-red-700" role="alert">
          {errorMsg || 'Something went wrong. Please try again in a moment.'}
        </p>
      )}

      <p className="text-xs text-slate-600">
        We&apos;ll reply within a few hours during business hours.
      </p>
    </form>
  );
}
